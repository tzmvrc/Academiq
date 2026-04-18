import { supabase } from "../../database/supabase.js";
import { UserModel } from "../../models/user_model.js";
import { UserInterestsModel } from "../../models/user_interests_model.js";
import { ActivityService } from "../activity_service.js";
import { computeUserInterestVector } from "../embedding/userInterestService.js";
import { setCacheHeaders, shouldReturn304 } from "../../utils/cacheHeaders.js";

// Helper: get forum details with tags and subject (unchanged)
const enrichForum = async (forum, currentUserId) => {
  // fetch tags and subject
  const { data: tags } = await supabase
    .from("forum_tags")
    .select("tag:tag_id(id, name)")
    .eq("forum_id", forum.id);
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", forum.subject_id)
    .single();

  // get user vote state
  let myVote = null;
  if (currentUserId) {
    const { data: vote } = await supabase
      .from("votes")
      .select("vote_type")
      .eq("user_id", currentUserId)
      .eq("target_type", "forum")
      .eq("forum_id", forum.id)
      .single();
    myVote = vote?.vote_type || null;
  }

  return {
    id: forum.id,
    user_id: forum.user_id,
    title: forum.title,
    content: forum.content,
    document_url: forum.document_url,
    ai_summary: forum.ai_summary,
    is_ai_verified: forum.is_ai_verified,
    upvotes_count: forum.upvotes_count,
    downvotes_count: forum.downvotes_count,
    comments_count: forum.comments_count,
    created_at: forum.created_at,
    user: forum.user,
    subject,
    tags: tags?.map((t) => t.tag) || [],
    my_vote: myVote,
  };
};

/**
 * Helper: Check if user's interest vector is still valid (< 30 minutes old)
 */
const isVectorValid = (vectorUpdatedAt) => {
  if (!vectorUpdatedAt) return false;
  const ageMs = Date.now() - new Date(vectorUpdatedAt).getTime();
  const ageMinutes = ageMs / (1000 * 60);
  return ageMinutes < 30;
};

/**
 * Helper: Clear expired user interest vector
 */
const clearExpiredVector = async (userId) => {
  try {
    await supabase
      .from("user_interest_vectors")
      .update({
        interest_vector: null,
        updated_at: null,
      })
      .eq("user_id", userId);
    console.log(`🧹 Cleared expired vector for user ${userId}`);
  } catch (err) {
    console.warn(`⚠️ Failed to clear vector for ${userId}:`, err.message);
  }
};

export const FeedController = {
  /**
   * 🔥 UNIFIED PERSONALIZED FEED - SORTING (NOT FILTERING)
   *
   * Algorithm:
   * 1. ALWAYS fetch ALL approved forums
   * 2. Score each forum based on:
   *    - Vector similarity (if valid vector exists)
   *    - Subject match (if user follows subject)
   *    - Creator follow (if user follows creator)
   * 3. Sort all forums by combined score (descending)
   * 4. Apply pagination AFTER sorting
   *
   * Result: ALL forums visible, just ranked intelligently
   */
  async getPersonalizedFeed(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { limit = 10, offset = 0 } = req.query;
      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      console.log(
        `\n🔥 UNIFIED FEED REQUEST: user=${userId}, limit=${parsedLimit}, offset=${parsedOffset}`,
      );

      // ========================================
      // STEP 0: Build user interest vector from recent activity (non-blocking)
      // ========================================
      console.log(
        `\n📋 STEP 0: Refreshing user interest vector from activities...`,
      );
      computeUserInterestVector(userId).catch((err) => {
        console.warn(
          `⚠️ Failed to compute interest vector (non-blocking):`,
          err.message,
        );
      });

      // ========================================
      // STEP 1: ALWAYS fetch ALL approved forums
      // ========================================
      console.log(`\n📋 STEP 1: Fetching ALL approved forums...`);

      const { data: allForums, error: forumErr } = await supabase
        .from("forums")
        .select(
          `
          *,
          user:user_id(id, name, profile_url, school),
          subject:subject_id(id, name),
          forum_tags(tag:tag_id(id, name, slug))
        `,
        )
        .eq("validation_status", "approved")
        .eq("is_ai_verified", true)
        .order("created_at", { ascending: false })
        .limit(500);

      if (forumErr || !allForums) {
        console.error("❌ Failed to fetch forums:", forumErr);
        return res
          .status(500)
          .json({ error: "Failed to fetch forums from database" });
      }

      console.log(`✅ Fetched ${allForums.length} approved forums`);

      // ========================================
      // STEP 2: Fetch ALL scoring factors in parallel
      // ========================================
      console.log(`\n📋 STEP 2: Fetching user scoring factors...`);

      const [vectorResult, subjectsResult, followingResult] = await Promise.all(
        [
          // Get user's interest vector
          supabase
            .from("user_interest_vectors")
            .select("interest_vector, updated_at")
            .eq("user_id", userId)
            .single(),
          // Get followed subjects
          supabase
            .from("user_subjects")
            .select("subject_id")
            .eq("user_id", userId),
          // Get followed users
          supabase
            .from("user_follows")
            .select("following_id")
            .eq("follower_id", userId),
        ],
      );

      const vectorData = vectorResult.data;
      const followedSubjects = new Set(
        subjectsResult.data?.map((s) => s.subject_id) || [],
      );
      const followingUsers = new Set(
        followingResult.data?.map((f) => f.following_id) || [],
      );

      const hasValidVector =
        vectorData?.interest_vector &&
        vectorData?.updated_at &&
        Date.now() - new Date(vectorData.updated_at).getTime() < 30 * 60 * 1000;

      console.log({
        hasValidVector,
        followedSubjectCount: followedSubjects.size,
        followingUserCount: followingUsers.size,
      });

      // ========================================
      // STEP 3: Get vector similarities for ALL forums (if valid vector)
      // ========================================
      let vectorSimilarities = new Map();

      if (hasValidVector && vectorData?.interest_vector) {
        console.log(`\n🧠 Computing vector similarities for all forums...`);

        const { data: similarities, error: vecErr } = await supabase.rpc(
          "get_semantic_suggestions",
          {
            query_vector: vectorData.interest_vector,
            max_results: 500,
          },
        );

        if (vecErr) {
          console.warn("⚠️  Vector search failed:", vecErr.message);
        } else if (similarities && similarities.length > 0) {
          similarities.forEach((item) => {
            vectorSimilarities.set(item.id, item.similarity_score || 0);
          });
          console.log(
            `✅ Got similarity scores for ${vectorSimilarities.size} forums`,
          );
        }
      }

      // ========================================
      // STEP 4: Score and sort ALL forums
      // ========================================
      console.log(`\n📊 STEP 3: Scoring all forums...`);

      const scoredForums = allForums.map((forum) => {
        let score = 0;
        const scoreBreakdown = {};

        // Priority 1: Vector similarity (if valid) - HIGH weight
        if (hasValidVector && vectorSimilarities.has(forum.id)) {
          const similarity = vectorSimilarities.get(forum.id);
          const vectorScore = similarity * 100; // Scale to 0-100
          score += vectorScore;
          scoreBreakdown.vector = vectorScore;
        }

        // Priority 2: Followed subject - MEDIUM weight
        if (followedSubjects.has(forum.subject_id)) {
          const subjectScore = 50; // Medium weight
          score += subjectScore;
          scoreBreakdown.subject = subjectScore;
        }

        // Priority 3: Following creator - LOWER weight
        if (followingUsers.has(forum.user_id)) {
          const followScore = 25; // Lower weight
          score += followScore;
          scoreBreakdown.follow = followScore;
        }

        // Tiebreaker: Newer forums ranked higher (small weight)
        const ageInDays =
          (Date.now() - new Date(forum.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 10 - ageInDays * 0.1); // Decays over time
        score += recencyScore;
        scoreBreakdown.recency = recencyScore;

        return {
          ...forum,
          feedScore: score,
          scoreBreakdown,
        };
      });

      // Sort by score (descending)
      scoredForums.sort((a, b) => b.feedScore - a.feedScore);

      console.log(`✅ Scored and sorted ${scoredForums.length} forums`);

      // Log top 5 scores for debugging
      console.log(`\n🏆 Top 5 forum scores:`);
      scoredForums.slice(0, 5).forEach((f, idx) => {
        console.log(
          `  ${idx + 1}. "${f.title.substring(0, 50)}..." - Score: ${f.feedScore.toFixed(2)}`,
          f.scoreBreakdown,
        );
      });

      // ========================================
      // STEP 5: Pagination (AFTER sorting)
      // ========================================
      console.log(
        `\n📄 STEP 4: Paginating results (offset=${parsedOffset}, limit=${parsedLimit})...`,
      );

      const total = scoredForums.length;
      const paginatedForums = scoredForums.slice(
        parsedOffset,
        parsedOffset + parsedLimit,
      );
      const hasMore = parsedOffset + parsedLimit < total;

      console.log(
        `📄 Returning ${paginatedForums.length} forums (offset=${parsedOffset}, total=${total}, hasMore=${hasMore})`,
      );

      const enriched = await Promise.all(
        paginatedForums.map((forum) => enrichForum(forum, userId)),
      );

      let lastModified = new Date();
      if (enriched.length > 0) {
        const latestTimestamp = Math.max(
          ...enriched.map((f) =>
            new Date(f.updated_at || f.created_at).getTime(),
          ),
        );
        lastModified = new Date(latestTimestamp);
      }

      if (
        shouldReturn304(
          req,
          res,
          { forums: enriched, hasMore, total },
          lastModified,
        )
      ) {
        return res.status(304).end();
      }

      setCacheHeaders(res, { forums: enriched, hasMore, total }, lastModified, {
        isPrivate: true,
        maxAgeSeconds: 30,
      });

      res.json({
        forums: enriched,
        hasMore,
        total,
      });
    } catch (err) {
      console.error("Feed error:", err);
      res.status(500).json({ error: "Failed to load personalized feed" });
    }
  },

  // Get "People You May Know" with mutual connections (unchanged)
  async getPeopleYouMayKnow(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Step 1: Get users I follow
      const { data: myFollowing } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = myFollowing?.map((f) => f.following_id) || [];

      // Step 2: Get who the users I follow... follow (for mutual detection)
      let usersThatFollowMyFollows = new Set();

      if (followingIds.length > 0) {
        const { data: theirFollows } = await supabase
          .from("user_follows")
          .select("following_id")
          .in("follower_id", followingIds);

        usersThatFollowMyFollows = new Set(
          theirFollows?.map((f) => f.following_id) || [],
        );
      }

      const followingIdsSet = new Set(followingIds);

      // Step 3: Get 10 random users I haven't followed
      const { data: allUsers } = await supabase
        .from("users")
        .select("id, name, profile_url, school, followers_count, bio");

      if (!allUsers || allUsers.length === 0) {
        return res.json({
          users: [],
          total: 0,
          message: "No users available",
        });
      }

      // Filter: exclude self and already following
      const unfollowedUsers = allUsers.filter(
        (user) => user.id !== userId && !followingIdsSet.has(user.id),
      );

      // Randomly shuffle
      for (let i = unfollowedUsers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unfollowedUsers[i], unfollowedUsers[j]] = [
          unfollowedUsers[j],
          unfollowedUsers[i],
        ];
      }

      // Take first 10
      const topTen = unfollowedUsers.slice(0, 10);

      // Add mutual_count: 1 if followed by someone I follow, 0 otherwise
      const withMutual = topTen.map((user) => ({
        ...user,
        mutual_count: usersThatFollowMyFollows.has(user.id) ? 1 : 0,
      }));

      // Sort by mutual_count DESC (mutuals first), then by followers_count
      withMutual.sort((a, b) => {
        if (b.mutual_count !== a.mutual_count) {
          return b.mutual_count - a.mutual_count;
        }
        return (b.followers_count || 0) - (a.followers_count || 0);
      });

      res.json({
        users: withMutual,
        total: withMutual.length,
        message: "10 random users sorted by mutual connections",
      });
    } catch (err) {
      console.error("Error fetching people you may know:", err);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  },

  // Log user activity (call from other controllers) – unchanged
  async logActivity(userId, forumId, actionType) {
    try {
      await supabase.from("user_activity").insert({
        user_id: userId,
        forum_id: forumId,
        action_type: actionType,
      });
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  },
};
