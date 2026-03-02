import { supabase } from "../database/supabase.js";

const TABLE = "comment_votes";

export const CommentVoteModel = {
  async setVote(commentId, userId, voteType) {
    try {
      // First check if vote exists
      const { data: existing, error: checkError } = await supabase
        .from(TABLE)
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        console.error("Check vote error:", checkError);
        return { error: checkError };
      }

      if (existing) {
        // Update existing vote
        const result = await supabase
          .from(TABLE)
          .update({ vote_type: voteType })
          .eq("id", existing.id)
          .select()
          .single();
        return result;
      } else {
        // Insert new vote
        const result = await supabase
          .from(TABLE)
          .insert({
            comment_id: commentId,
            user_id: userId,
            vote_type: voteType,
          })
          .select()
          .single();
        return result;
      }
    } catch (err) {
      console.error("setVote exception:", err);
      return { error: err };
    }
  },

  async removeVote(commentId, userId) {
    return supabase
      .from(TABLE)
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
  },

  async getUserVote(commentId, userId) {
    return supabase
      .from(TABLE)
      .select("vote_type")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();
  },

  async getVoteCount(commentId) {
    const { data: upvotes, error: upError } = await supabase
      .from(TABLE)
      .select("id", { count: "exact" })
      .eq("comment_id", commentId)
      .eq("vote_type", 1);

    const { data: downvotes, error: downError } = await supabase
      .from(TABLE)
      .select("id", { count: "exact" })
      .eq("comment_id", commentId)
      .eq("vote_type", -1);

    if (upError || downError) {
      return { error: upError || downError };
    }

    const count = (upvotes?.length || 0) - (downvotes?.length || 0);
    return { data: count };
  },
};
