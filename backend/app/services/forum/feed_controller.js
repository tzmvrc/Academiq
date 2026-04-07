import { supabase } from "../../database/supabase.js";
import { UserModel } from "../../models/user_model.js";
import { UserInterestsModel } from "../../models/user_interests_model.js";
import { MutualConnectionsModel } from "../../models/mutual_connections_model.js";
import { ActivityService } from "../activity_service.js";

// Helper: get forum details with tags and subject
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
    user: forum.user, // already joined
    subject,
    tags: tags?.map((t) => t.tag) || [],
    my_vote: myVote,
  };
};

export const FeedController = {
  /**
   * Enhanced personalized feed with intelligent ranking:
   * 1. Followed subjects (35% weight)
   * 2. Posts from followed peers (25% weight)
   * 3. Content-based interests (25% weight)
   * 4. Trending/engagement (10% weight)
   * 5. Recency boost (5% weight)
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

      // 1. Fetch all necessary data in parallel
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

      // 2. Build a comprehensive forums query - fetch ALL forums for ranking
      // No date filter - get ALL forums and apply personalization ranking
      const { data: allForums, error } = await supabase.from("forums").select(
        `
          *,
          user:user_id(id, name, profile_url, school),
          subject:subject_id(id, name),
          forum_tags(tag:tag_id(id, name, slug, usage_count))
        `,
      );

      if (error) throw error;

      // 3. Score each forum based on multiple signals
      const rankedForums = allForums.map((forum) => {
        let score = 0;
        let reasonsArray = [];

        // Signal 1: Followed subjects (35% weight) - normalized to 0-1
        if (followedSubjectIds.includes(forum.subject_id)) {
          score += 0.35;
          reasonsArray.push("subject");
        }

        // Signal 2: Posts from followed users (25% weight)
        if (followedUserIds.includes(forum.user_id)) {
          score += 0.25;
          reasonsArray.push("peer");
        }

        // Signal 3: Content-based interests (25% weight)
        const forumTags = (forum.forum_tags || [])
          .map((ft) => ft.tag?.name?.toLowerCase())
          .filter(Boolean);
        let interestMatch = 0;
        for (const tag of forumTags) {
          if (topInterestTopics.has(tag)) {
            interestMatch += 1;
          }
        }
        if (interestMatch > 0 && topInterestTopics.size > 0) {
          const interestScore = Math.min(
            0.25,
            (interestMatch / topInterestTopics.size) * 0.25,
          );
          score += interestScore;
          reasonsArray.push("interest");
        }

        // Signal 4: Trending/Engagement (10% weight)
        const engagementScore = ActivityService.calculateEngagementScore(forum);
        const normalizedEngagement = Math.min(0.1, engagementScore * 0.01); // Normalize
        score += normalizedEngagement;
        if (engagementScore > 0) reasonsArray.push("trending");

        // Signal 5: Recency boost (5% weight)
        const recencyBoost = ActivityService.calculateRecencyBoost(
          forum.created_at,
        );
        const recencyScore = (recencyBoost - 1.0) * 0.05; // 0 to 0.05
        score += recencyScore;

        return {
          ...forum,
          feedScore: score,
          scoringReasons: reasonsArray,
        };
      });

      // 4. Sort by score, then by recency
      rankedForums.sort((a, b) => {
        if (b.feedScore !== a.feedScore) {
          return b.feedScore - a.feedScore;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });

      // 5. Apply pagination
      const paginatedForums = rankedForums.slice(
        parsedOffset,
        parsedOffset + parsedLimit,
      );

      // 6. Enrich each forum with tags, votes, saves
      const enriched = await Promise.all(
        paginatedForums.map((forum) => enrichForum(forum, userId)),
      );

      res.json({
        forums: enriched,
        hasMore: parsedOffset + parsedLimit < rankedForums.length,
        total: rankedForums.length,
      });
    } catch (err) {
      console.error("Feed error:", err);
      res.status(500).json({ error: "Failed to load personalized feed" });
    }
  },

  // Get "People You May Know" with mutual connections
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
      // Mutual = user I'm suggesting is followed by someone I follow
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

  // Log user activity (call from other controllers)
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
