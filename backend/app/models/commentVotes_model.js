import { supabase } from "../database/supabase.js";

const TABLE = "comment_votes";

export const CommentVoteModel = {
  async vote(commentId, userId) {
    return supabase.from(TABLE).insert({
      comment_id: commentId,
      user_id: userId
    });
  },

  async unvote(commentId, userId) {
    return supabase
      .from(TABLE)
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
  },

  async countVotes(commentId) {
    return supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("comment_id", commentId);
  }
};