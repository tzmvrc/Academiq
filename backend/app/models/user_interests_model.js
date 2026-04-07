import { supabase } from "../database/supabase.js";

const TABLE = "user_content_interests";

export const UserInterestsModel = {
  // Track/update an interest when user engages with content
  async recordInterest(userId, contentTopic, activityWeight = 1) {
    try {
      // First, try to get existing interest
      const { data: existing } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("content_topic", contentTopic)
        .single();

      if (existing) {
        // Update existing: increment count and recalculate score
        const newActivityCount = existing.activity_count + 1;
        const newScore = Math.min(
          1.0,
          existing.interest_score + activityWeight * 0.1,
        );

        const { data, error } = await supabase
          .from(TABLE)
          .update({
            activity_count: newActivityCount,
            interest_score: newScore,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new interest
        const { data, error } = await supabase
          .from(TABLE)
          .insert([
            {
              user_id: userId,
              content_topic: contentTopic,
              interest_score: Math.min(1.0, activityWeight * 0.1),
              activity_count: 1,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error("Error recording interest:", err);
      throw err;
    }
  },

  // Get top interests for a user
  async getUserTopInterests(userId, limit = 5) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("interest_score", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching user interests:", err);
      return [];
    }
  },

  // Extract topics from forum (tags + subject + title keywords)
  extractTopicsFromForum(forum, tags = [], subject = null) {
    const topics = new Set();

    // Add tags as topics
    if (Array.isArray(tags)) {
      tags.forEach((tag) => {
        if (tag?.name) {
          topics.add(tag.name.toLowerCase());
          topics.add(tag.slug || tag.name.toLowerCase());
        }
      });
    }

    // Add subject name
    if (subject?.name) {
      topics.add(subject.name.toLowerCase());
    }

    // Extract keywords from title (simple tokenization)
    if (forum.title) {
      const titleWords = forum.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4);
      titleWords.forEach((word) => topics.add(word));
    }

    return Array.from(topics);
  },

  // Process activity and update user interests
  async processUserActivity(
    userId,
    forum,
    activityType,
    tags = [],
    subject = null,
  ) {
    try {
      // Weight for different activity types
      const weights = {
        view: 1,
        comment: 3,
        upvote: 2,
        downvote: -1,
        save: 4,
      };

      const weight = weights[activityType] || 1;
      const topics = this.extractTopicsFromForum(forum, tags, subject);

      // Record each topic as an interest
      for (const topic of topics) {
        await this.recordInterest(userId, topic, weight);
      }

      return topics;
    } catch (err) {
      console.error("Error processing user activity:", err);
      throw err;
    }
  },

  // Batch decay old interests (reduce score over time)
  async decayOldInterests(userId, daysThreshold = 30) {
    try {
      const cutoffDate = new Date(
        Date.now() - daysThreshold * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { error } = await supabase
        .from(TABLE)
        .update({
          interest_score: supabase.rpc("decay_score", {
            current_score: "interest_score",
            decay_factor: 0.9,
          }),
          updated_at: new Date().toISOString(),
        })
        .lt("updated_at", cutoffDate);

      if (error) throw error;
    } catch (err) {
      console.error("Error decaying interests:", err);
    }
  },

  // Clear old interests with very low scores
  async pruneOldInterests(userId, scoreThreshold = 0.01) {
    try {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("user_id", userId)
        .lt("interest_score", scoreThreshold);

      if (error) throw error;
    } catch (err) {
      console.error("Error pruning interests:", err);
    }
  },
};
