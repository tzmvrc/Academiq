import { supabase } from "../database/supabase.js";
import { UserInterestsModel } from "../models/user_interests_model.js";

/**
 * Activity Service
 * Handles logging and processing of user activities (views, votes, comments, saves)
 * Updates user interests based on forum content
 */
export const ActivityService = {
  // Log a user activity (view, upvote, downvote, comment, save)
  async logActivity(userId, forumId, actionType, forumData = null) {
    try {
      // Insert activity record
      const { error: insertError } = await supabase
        .from("user_activity")
        .insert([
          {
            user_id: userId,
            forum_id: forumId,
            action_type: actionType,
          },
        ]);

      if (insertError) throw insertError;

      // If forum data provided, extract interests from it
      if (forumData) {
        const tags = forumData.tags || [];
        const subject = forumData.subject || null;

        // Process and update user interests
        await UserInterestsModel.processUserActivity(
          userId,
          forumData,
          actionType,
          tags,
          subject,
        );
      }

      console.log(
        `[Activity] ${actionType} on forum ${forumId} by user ${userId}`,
      );
    } catch (err) {
      // Don't throw - activity logging should be non-blocking
      console.error("Error logging activity:", err);
    }
  },

  // Log activity asynchronously (non-blocking)
  async logActivityAsync(userId, forumId, actionType, forumData = null) {
    // Fire and forget - wrap in async call that doesn't block
    setImmediate(() => {
      this.logActivity(userId, forumId, actionType, forumData).catch((err) =>
        console.error("Async activity logging error:", err),
      );
    });
  },

  // Get user activity stats for personalization
  async getUserActivityStats(userId, days = 30) {
    try {
      const cutoffDate = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from("user_activity")
        .select("action_type")
        .eq("user_id", userId)
        .gte("created_at", cutoffDate);

      if (error) throw error;

      // Count activities by type
      const stats = {
        views: 0,
        comments: 0,
        upvotes: 0,
        downvotes: 0,
        saves: 0,
        total: data?.length || 0,
      };

      data?.forEach((activity) => {
        stats[`${activity.action_type}s`] =
          (stats[`${activity.action_type}s`] || 0) + 1;
      });

      return stats;
    } catch (err) {
      console.error("Error fetching activity stats:", err);
      return null;
    }
  },

  // Get top forums by activity (trending)
  async getTrendingForums(limit = 10, days = 7) {
    try {
      const cutoffDate = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from("forums")
        .select(
          `
          *,
          user:user_id(id, name, profile_url, school),
          subject:subject_id(id, name),
          forum_tags(tag:tag_id(id, name, slug))
        `,
        )
        .gte("created_at", cutoffDate)
        .order("upvotes_count", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (
        data?.map((forum) => ({
          ...forum,
          tags: (forum.forum_tags || []).map((ft) => ft.tag).filter(Boolean),
        })) || []
      );
    } catch (err) {
      console.error("Error fetching trending forums:", err);
      return [];
    }
  },

  // Calculate engagement score for a forum
  calculateEngagementScore(forum) {
    // Weighted scoring: upvotes are worth more than comments, etc.
    const upvoteWeight = 2;
    const downvoteWeight = -1;
    const commentWeight = 1.5;

    const engagementScore =
      (forum.upvotes_count || 0) * upvoteWeight +
      (forum.downvotes_count || 0) * downvoteWeight +
      (forum.comments_count || 0) * commentWeight;

    return Math.max(0, engagementScore);
  },

  // Calculate recency boost (newer posts get a small boost)
  calculateRecencyBoost(createdAt) {
    const ageInHours =
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

    // Decay: 1.5x boost at 0 hours, decays to 1.0x after 7 days
    const maxAgeHours = 7 * 24;
    const boost = Math.max(1.0, 1.5 - (ageInHours / maxAgeHours) * 0.5);

    return boost;
  },
};
