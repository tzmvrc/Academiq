import { supabase } from "../database/supabase.js";

const TABLE = "post_votes";

export const PostVoteModel = {
  async vote(forumId, userId) {
    return supabase.from(TABLE).insert({
      forum_id: forumId,
      user_id: userId
    });
  },

  async unvote(forumId, userId) {
    return supabase
      .from(TABLE)
      .delete()
      .eq("forum_id", forumId)
      .eq("user_id", userId);
  },

  async countVotes(forumId) {
    return supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("forum_id", forumId);
  }
};