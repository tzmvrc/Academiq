import { supabase } from "../database/supabase.js";

const TABLE = "forum_topics";

export const ForumTopicModel = {
  async attachTopic(forumId, topicId) {
    return supabase.from(TABLE).insert({
      forum_id: forumId,
      topic_id: topicId
    });
  },

  async removeTopic(forumId, topicId) {
    return supabase
      .from(TABLE)
      .delete()
      .eq("forum_id", forumId)
      .eq("topic_id", topicId);
  },

  async findTopicsByForumId(forumId) {
    return supabase
      .from(TABLE)
      .select(`
        topics ( id, name, icon, color, category )
      `)
      .eq("forum_id", forumId);
  }
};