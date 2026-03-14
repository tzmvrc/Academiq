import { supabase } from "../database/supabase.js";
const TABLE = "post_votes";

export const PostVoteModel = {
  async setVote(forumId, userId, voteType) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from(TABLE)
        .select("id")
        .eq("forum_id", forumId)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        console.error("Check vote error:", checkError);
        return { error: checkError };
      }

      if (existing) {
        const result = await supabase
          .from(TABLE)
          .update({ vote_type: voteType })
          .eq("id", existing.id)
          .select()
          .single();

        return result;
      } else {
        const result = await supabase
          .from(TABLE)
          .insert({
            forum_id: forumId,
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

  async removeVote(forumId, userId) {
    return supabase
      .from(TABLE)
      .delete()
      .eq("forum_id", forumId)
      .eq("user_id", userId);
  },

  async getUserVote(forumId, userId) {
    return supabase
      .from(TABLE)
      .select("vote_type")
      .eq("forum_id", forumId)
      .eq("user_id", userId)
      .maybeSingle();
  },

  async getVoteCount(forumId) {
    const { count: upvotes, error: upError } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("forum_id", forumId)
      .eq("vote_type", 1);

    const { count: downvotes, error: downError } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("forum_id", forumId)
      .eq("vote_type", -1);

    if (upError || downError) {
      return { error: upError || downError };
    }

    return {
      data: {
        upvotes: upvotes || 0,
        downvotes: downvotes || 0,
      },
    };
  },
};