import { supabase } from "../database/supabase.js";

const TABLE = "user_topics";

export const UserTopicsModel = {
  // Save multiple topics for a user
  async addForUser(userId, topicIds) {
    const rows = topicIds.map((topicId) => ({ user_id: userId, topic_id: topicId }));
    const { data, error } = await supabase.from(TABLE).insert(rows).select();
    if (error) throw error;
    return data;
  },

  // Get topic IDs selected by a user
  async getByUser(userId) {
    const { data, error } = await supabase.from(TABLE).select("topic_id").eq("user_id", userId);
    if (error) throw error;
    return data.map((row) => row.topic_id);
  },

  // Remove all topics for a user
  async removeAllForUser(userId) {
    const { data, error } = await supabase.from(TABLE).delete().eq("user_id", userId).select();
    if (error) throw error;
    return data;
  },
};
