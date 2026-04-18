// models/user_activity_model.js
import { supabase } from "../database/supabase.js";

const TABLE = "user_activity";

export const UserActivityModel = {
  // Log user activity (upvote, downvote, comment, save)
  async logActivity(userId, forumId, actionType) {
    try {
      const { error } = await supabase.from(TABLE).insert([
        {
          user_id: userId,
          forum_id: forumId,
          action_type: actionType,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Failed to log activity:", err);
      // Don't throw - activity logging should not break main flow
      return { success: false };
    }
  },

  // Get user's recent activities (within time window in minutes)
  async getRecentActivities(userId, windowMinutes = 1440) {
    // Default: last 24 hours
    try {
      const sinceDate = new Date(Date.now() - windowMinutes * 60 * 1000);

      const { data, error } = await supabase
        .from(TABLE)
        .select(
          `
          id,
          forum_id,
          action_type,
          created_at,
          forum:forum_id (
            id,
            embedding
          )
        `,
        )
        .eq("user_id", userId)
        .gte("created_at", sinceDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Failed to fetch user activities:", err);
      return [];
    }
  },

  // Get activity count by type (for weighting)
  async getActivityStats(userId, windowMinutes = 1440) {
    try {
      const sinceDate = new Date(Date.now() - windowMinutes * 60 * 1000);

      const { data, error } = await supabase
        .from(TABLE)
        .select("action_type", { count: "exact" })
        .eq("user_id", userId)
        .gte("created_at", sinceDate.toISOString());

      if (error) throw error;

      const stats = {
        upvote: 0,
        downvote: 0,
        comment: 0,
        save: 0,
      };

      data?.forEach((activity) => {
        if (activity.action_type in stats) {
          stats[activity.action_type]++;
        }
      });

      return stats;
    } catch (err) {
      console.error("Failed to fetch activity stats:", err);
      return { upvote: 0, downvote: 0, comment: 0, save: 0 };
    }
  },

  // Clear old activities (cleanup)
  async clearOldActivities(olderThanDays = 30) {
    try {
      const cutoffDate = new Date(
        Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
      );

      const { error } = await supabase
        .from(TABLE)
        .delete()
        .lt("created_at", cutoffDate.toISOString());

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Failed to clear old activities:", err);
      return { success: false };
    }
  },
};
