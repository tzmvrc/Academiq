import { supabase } from "../database/supabase.js";

const TABLE = "user_topics";

export const UserTopicsModel = {
  async addForUser(userId, topicIds) {
    if (!Array.isArray(topicIds) || topicIds.length === 0) return [];

    const uniqueTopicIds = [...new Set(topicIds)];

    const rows = uniqueTopicIds.map((topicId) => ({
      user_id: userId,
      topic_id: topicId,
    }));

    const { data, error } = await supabase
      .from(TABLE)
      .insert(rows)
      .select();

    if (error) throw error;
    return data ?? [];
  },

  async replaceForUser(userId, topicIds) {
    await this.removeAllForUser(userId);

    if (!Array.isArray(topicIds) || topicIds.length === 0) return [];

    return await this.addForUser(userId, topicIds);
  },

  async getByUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        topic_id,
        created_at,
        topics (
          id,
          name,
          icon,
          color,
          category,
          slug
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;
    return data ?? [];
  },

  async getTopicIdsByUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("topic_id")
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? []).map((row) => row.topic_id);
  },

  async removeAllForUser(userId) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  },

  async removeTopicForUser(userId, topicId) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("topic_id", topicId);

    if (error) throw error;
  },
};