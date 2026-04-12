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

export const FeedController = {
  /**
   * Personalized feed – only approved forums.
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

      console.log("🔍 Feed: checking user interest vector for user", userId);
      // 1. Get or compute user interest vector with 30‑minute expiry
      let userVector = null;
      const { data: stored } = await supabase
        .from("user_interest_vectors")
        .select("interest_vector, updated_at")
        .eq("user_id", userId)
        .single();

      const vectorAgeMinutes = stored?.updated_at
        ? (Date.now() - new Date(stored.updated_at).getTime()) / (1000 * 60)
        : Infinity;

      if (stored?.interest_vector && vectorAgeMinutes < 30) {
        console.log(
          `🔍 Using stored vector (age: ${vectorAgeMinutes.toFixed(1)} minutes)`,
        );
        userVector = stored.interest_vector;
      } else {
        console.log(
          `🔍 Vector missing or stale (age: ${vectorAgeMinutes === Infinity ? "none" : vectorAgeMinutes.toFixed(1)} minutes) – recomputing...`,
        );
        userVector = await computeUserInterestVector(userId);
        console.log(
          "🔍 After compute, userVector =",
          userVector ? "received" : "null",
        );
      }

      let candidateForums = [];
      let total = 0;

      // 2. If we have a vector, get semantically similar forums (only approved)
      if (userVector) {
        console.log("🔍 Calling get_semantic_suggestions with vector");
        const { data: similar, error: vecErr } = await supabase.rpc(
          "get_semantic_suggestions",
          {
            query_vector: userVector,
            max_results: 200,
          },
        );
        if (vecErr) {
          console.error("❌ Vector search error:", vecErr);
        } else if (similar) {
          console.log(`✅ Got ${similar.length} similar forums`);
          // Filter out pending/rejected (in case RPC returns them)
          const approvedSimilar = similar.filter(
            (item) => item.validation_status === "approved",
          );
          console.log(
            `✅ After approval filter: ${approvedSimilar.length} forums`,
          );
          candidateForums = approvedSimilar.map((item) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            subject_id: item.subject_id,
            created_at: item.created_at,
            similarity_score: item.similarity_score,
            user: item.user_data,
            subject: item.subject,
            forum_tags: item.forum_tags,
            upvotes_count: item.upvotes_count,
            downvotes_count: item.downvotes_count,
            comments_count: item.comments_count,
          }));
          total = candidateForums.length;
        }
      }

      // 3. If no vector or no results, fallback to traditional ranking (fetch all approved forums)
      if (!userVector || candidateForums.length === 0) {
        console.log("🔍 Falling back to traditional ranking");
        // Fetch all data needed for fallback ranking – only approved forums
        const [followedSubjectsData, followedUsersData, userInterestsData] =
          await Promise.all([
            supabase
              .from("user_subjects")
              .select("subject_id")
              .eq("user_id", userId),
            supabase
              .from("user_follows")
              .select("following_id")
              .eq("follower_id", userId),
            UserInterestsModel.getUserTopInterests(userId, 10),
          ]);

        const followedSubjectIds =
          followedSubjectsData.data?.map((s) => s.subject_id) || [];
        const followedUserIds =
          followedUsersData.data?.map((f) => f.following_id) || [];
        const topInterestTopics = new Set(
          userInterestsData.map((i) => i.content_topic),
        );

        const { data: allForums, error: allErr } = await supabase
          .from("forums")
          .select(
            `
          *,
          user:user_id(id, name, profile_url, school),
          subject:subject_id(id, name),
          forum_tags(tag:tag_id(id, name, slug, usage_count))
        `,
          )
          .eq("validation_status", "approved"); // ✅ Only approved forums

        if (allErr) throw allErr;

        // Score each forum (same as original)
        candidateForums = allForums.map((forum) => {
          let score = 0;
          if (followedSubjectIds.includes(forum.subject_id)) score += 0.35;
          if (followedUserIds.includes(forum.user_id)) score += 0.25;

          const forumTags = (forum.forum_tags || [])
            .map((ft) => ft.tag?.name?.toLowerCase())
            .filter(Boolean);
          let interestMatch = 0;
          for (const tag of forumTags) {
            if (topInterestTopics.has(tag)) interestMatch++;
          }
          if (interestMatch > 0 && topInterestTopics.size > 0) {
            score += Math.min(
              0.25,
              (interestMatch / topInterestTopics.size) * 0.25,
            );
          }

          const engagementScore =
            ActivityService.calculateEngagementScore(forum);
          score += Math.min(0.1, engagementScore * 0.01);
          const recencyBoost = ActivityService.calculateRecencyBoost(
            forum.created_at,
          );
          score += (recencyBoost - 1.0) * 0.05;

          return { ...forum, feedScore: score };
        });

        candidateForums.sort((a, b) => {
          if (b.feedScore !== a.feedScore) return b.feedScore - a.feedScore;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        total = candidateForums.length;
        console.log(`📊 Fallback total approved forums: ${total}`);
      } else {
        // 4. Apply secondary ranking on the candidate set (from vector search)
        console.log("🔍 Applying secondary ranking on vector candidates");
        const [followedSubjectsData, followedUsersData, userInterestsData] =
          await Promise.all([
            supabase
              .from("user_subjects")
              .select("subject_id")
              .eq("user_id", userId),
            supabase
              .from("user_follows")
              .select("following_id")
              .eq("follower_id", userId),
            UserInterestsModel.getUserTopInterests(userId, 10),
          ]);

        const followedSubjectIds =
          followedSubjectsData.data?.map((s) => s.subject_id) || [];
        const followedUserIds =
          followedUsersData.data?.map((f) => f.following_id) || [];
        const topInterestTopics = new Set(
          userInterestsData.map((i) => i.content_topic),
        );

        const scored = candidateForums.map((forum) => {
          let score = 0;
          if (followedSubjectIds.includes(forum.subject_id)) score += 0.2;
          if (followedUserIds.includes(forum.user_id)) score += 0.15;

          const forumTags = (forum.forum_tags || [])
            .map((ft) => ft.tag?.name?.toLowerCase())
            .filter(Boolean);
          let interestMatch = 0;
          for (const tag of forumTags) {
            if (topInterestTopics.has(tag)) interestMatch++;
          }
          if (interestMatch > 0 && topInterestTopics.size > 0) {
            score += Math.min(
              0.15,
              (interestMatch / topInterestTopics.size) * 0.15,
            );
          }

          const engagementScore =
            ActivityService.calculateEngagementScore(forum);
          score += Math.min(0.1, engagementScore * 0.01);
          const recencyBoost = ActivityService.calculateRecencyBoost(
            forum.created_at,
          );
          score += (recencyBoost - 1.0) * 0.05;

          const similarityBonus = (forum.similarity_score || 0) * 0.5;
          score += similarityBonus;

          return { ...forum, feedScore: score };
        });

        scored.sort((a, b) => {
          if (b.feedScore !== a.feedScore) return b.feedScore - a.feedScore;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        candidateForums = scored;
        total = candidateForums.length;
        console.log(`📊 Vector + ranking total approved forums: ${total}`);
      }

      // 5. Apply pagination
      const paginatedForums = candidateForums.slice(
        parsedOffset,
        parsedOffset + parsedLimit,
      );
      const hasMore = parsedOffset + parsedLimit < total;

      // 6. Enrich each forum (adds tags, vote state, etc.)
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

      // Check conditional request
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

      // Set cache headers (private, 30 seconds fresh)
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
