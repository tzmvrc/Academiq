import { supabase } from "../database/supabase.js";

const TABLE = "votes";

export const VotesModel = {
  // Set vote on forum or comment
  async setVote(userId, targetType, targetId, voteType) {
    try {
      if (targetType !== "forum" && targetType !== "comment") {
        throw new Error("Invalid target_type");
      }

      const targetIdField = targetType === "forum" ? "forum_id" : "comment_id";

      const { data: existing, error: checkError } = await supabase
        .from(TABLE)
        .select("id")
        .eq("user_id", userId)
        .eq("target_type", targetType)
        .eq(targetIdField, targetId)
        .maybeSingle();

      if (checkError) {
        console.error("Check vote error:", checkError);
        return { error: checkError };
      }

      if (existing) {
        const updatePayload = {
          vote_type: voteType,
          updated_at: new Date().toISOString(),
        };
        const result = await supabase
          .from(TABLE)
          .update(updatePayload)
          .eq("id", existing.id)
          .select()
          .single();

        return result;
      } else {
        const insertPayload = {
          user_id: userId,
          target_type: targetType,
          vote_type: voteType,
          [targetIdField]: targetId,
        };

        const result = await supabase
          .from(TABLE)
          .insert(insertPayload)
          .select()
          .single();

        return result;
      }
    } catch (err) {
      console.error("setVote exception:", err);
      return { error: err };
    }
  },

  // Remove vote on forum or comment
  async removeVote(userId, targetType, targetId) {
    if (targetType !== "forum" && targetType !== "comment") {
      return { error: new Error("Invalid target_type") };
    }

    const targetIdField = targetType === "forum" ? "forum_id" : "comment_id";

    return supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq(targetIdField, targetId);
  },

  // Get user vote on specific forum or comment
  async getUserVote(userId, targetType, targetId) {
    if (targetType !== "forum" && targetType !== "comment") {
      return { error: new Error("Invalid target_type") };
    }

    const targetIdField = targetType === "forum" ? "forum_id" : "comment_id";

    return supabase
      .from(TABLE)
      .select("vote_type")
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq(targetIdField, targetId)
      .maybeSingle();
  },

  // Get vote count for forum or comment
  async getVoteCount(targetType, targetId) {
    if (targetType !== "forum" && targetType !== "comment") {
      return { error: new Error("Invalid target_type") };
    }

    const targetIdField = targetType === "forum" ? "forum_id" : "comment_id";

    const { count: upvotes, error: upError } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq(targetIdField, targetId)
      .eq("vote_type", 1);

    const { count: downvotes, error: downError } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq(targetIdField, targetId)
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
