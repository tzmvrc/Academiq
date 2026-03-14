import { supabase } from "../database/supabase.js";

const TABLE = "user_topics";

export const UserTopicsModel = {
  // Save multiple topics for a user
  async addForUser(userId, topicIds) {
    const rows = topicIds.map((topicId) => ({
      user_id: userId,
      topic_id: topicId,
    }));
    const { data, error } = await supabase.from(TABLE).insert(rows).select();
    if (error) throw error;
    return data;
  },

  // Get topics selected by a user with full topic info
  async getByUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        `
        topic_id,
        created_at,
        topics ( id, name, icon, color, category, slug )
      `,
      )
      .eq("user_id", userId);
    if (error) throw error;
    return data;
  },

  // Get just the topic IDs for a user
  async getTopicIdsByUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("topic_id")
      .eq("user_id", userId);
    if (error) throw error;
    return data.map((row) => row.topic_id);
  },

  // Remove all topics for a user
  async removeAllForUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .select();
    if (error) throw error;
    return data;
  },

  // Remove specific topic for a user
  async removeTopicForUser(userId, topicId) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("topic_id", topicId);
    if (error) throw error;
  },
};
