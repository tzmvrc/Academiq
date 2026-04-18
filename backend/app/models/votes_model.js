import { supabase } from "../database/supabase.js";

const TABLE = "votes";

export const VotesModel = {
  // Set vote on forum or comment
  async setVote(userId, targetType, targetId, voteType) {
    try {
      console.log(
        `\n🔍 [setVote] STARTING: userId=${userId}, targetType=${targetType}, targetId=${targetId}, voteType=${voteType}`,
      );

      if (targetType !== "forum" && targetType !== "comment") {
        throw new Error("Invalid target_type");
      }

      const targetIdField = targetType === "forum" ? "forum_id" : "comment_id";

      const { data: existing, error: checkError } = await supabase
        .from(TABLE)
        .select("id, vote_type")
        .eq("user_id", userId)
        .eq("target_type", targetType)
        .eq(targetIdField, targetId)
        .maybeSingle();

      if (checkError) {
        console.error("Check vote error:", checkError);
        return { error: checkError };
      }

      console.log(
        `📋 [setVote] Existing vote check: existing=${JSON.stringify(existing)}`,
      );

      const oldVoteType = existing?.vote_type || 0;
      console.log(`📊 [setVote] Calculated oldVoteType=${oldVoteType}`);

      let result;

      if (existing) {
        console.log(
          `✏️  [setVote] UPDATING existing vote (id=${existing.id}) from ${existing.vote_type} to ${voteType}`,
        );
        const updatePayload = {
          vote_type: voteType,
          updated_at: new Date().toISOString(),
        };
        result = await supabase
          .from(TABLE)
          .update(updatePayload)
          .eq("id", existing.id)
          .select()
          .single();
        console.log(
          `✏️  [setVote] Update result: error=${result.error}, vote_type=${result.data?.vote_type}`,
        );
      } else {
        console.log(`➕ [setVote] INSERTING new vote`);
        const insertPayload = {
          user_id: userId,
          target_type: targetType,
          vote_type: voteType,
          [targetIdField]: targetId,
        };
        result = await supabase
          .from(TABLE)
          .insert(insertPayload)
          .select()
          .single();
        console.log(
          `➕ [setVote] Insert result: error=${result.error}, vote_type=${result.data?.vote_type}`,
        );
      }

      // ✅ UPDATE FORUM/COMMENT VOTE COUNTS (recalculate from votes table)
      if (targetType === "forum" && !result.error) {
        console.log(
          `🔧 [setVote] Calling _updateForumVoteCounts to recalculate`,
        );
        await this._updateForumVoteCounts(targetId);
      } else if (targetType === "comment" && !result.error) {
        console.log(
          `🔧 [setVote] Calling _updateCommentVoteCounts to recalculate`,
        );
        await this._updateCommentVoteCounts(targetId);
      }

      console.log(`✅ [setVote] COMPLETED for userId=${userId}`);
      return result;
    } catch (err) {
      console.error("setVote exception:", err);
      return { error: err };
    }
  },

  // Helper: Update forum vote counts by counting from votes table
  async _updateForumVoteCounts(forumId) {
    try {
      console.log(`\n🔧 [_updateForumVoteCounts] STARTING: forumId=${forumId}`);

      // Count actual votes from the votes table (source of truth)
      const { count: upvotesCount, error: upvoteErr } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("forum_id", forumId)
        .eq("vote_type", 1);

      const { count: downvotesCount, error: downvoteErr } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("forum_id", forumId)
        .eq("vote_type", -1);

      if (upvoteErr || downvoteErr) {
        console.error(
          `❌ Failed to count votes for forum ${forumId}:`,
          upvoteErr,
          downvoteErr,
        );
        return;
      }

      const actualUpvotes = upvotesCount || 0;
      const actualDownvotes = downvotesCount || 0;

      console.log(
        `📊 [_updateForumVoteCounts] Counted from votes table: upvotes=${actualUpvotes}, downvotes=${actualDownvotes}`,
      );

      // Update forum with actual counts
      const { error: updateErr } = await supabase
        .from("forums")
        .update({
          upvotes_count: actualUpvotes,
          downvotes_count: actualDownvotes,
        })
        .eq("id", forumId);

      if (updateErr) {
        console.error(
          `❌ [_updateForumVoteCounts] Failed to update forum ${forumId}:`,
          updateErr,
        );
      } else {
        console.log(
          `✅ [_updateForumVoteCounts] Successfully updated forum ${forumId}: upvotes=${actualUpvotes}, downvotes=${actualDownvotes}`,
        );
      }
    } catch (err) {
      console.error("❌ [_updateForumVoteCounts] Exception:", err);
    }
  },

  // Helper: Update comment vote counts by counting from votes table
  async _updateCommentVoteCounts(commentId) {
    try {
      console.log(
        `\n🔧 [_updateCommentVoteCounts] STARTING: commentId=${commentId}`,
      );

      // Count actual votes from the votes table (source of truth)
      const { count: upvotesCount, error: upvoteErr } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", commentId)
        .eq("vote_type", 1);

      const { count: downvotesCount, error: downvoteErr } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", commentId)
        .eq("vote_type", -1);

      if (upvoteErr || downvoteErr) {
        console.error(
          `❌ Failed to count votes for comment ${commentId}:`,
          upvoteErr,
          downvoteErr,
        );
        return;
      }

      const actualUpvotes = upvotesCount || 0;
      const actualDownvotes = downvotesCount || 0;

      console.log(
        `📊 [_updateCommentVoteCounts] Counted from votes table: upvotes=${actualUpvotes}, downvotes=${actualDownvotes}`,
      );

      // Update comment with actual counts
      const { error: updateErr } = await supabase
        .from("comments")
        .update({
          upvotes_count: actualUpvotes,
          downvotes_count: actualDownvotes,
        })
        .eq("id", commentId);

      if (updateErr) {
        console.error(
          `❌ [_updateCommentVoteCounts] Failed to update comment ${commentId}:`,
          updateErr,
        );
      } else {
        console.log(
          `✅ [_updateCommentVoteCounts] Successfully updated comment ${commentId}: upvotes=${actualUpvotes}, downvotes=${actualDownvotes}`,
        );
      }
    } catch (err) {
      console.error("❌ [_updateCommentVoteCounts] Exception:", err);
    }
  },

  // Remove vote on forum or comment
  async removeVote(userId, targetType, targetId) {
    if (targetType !== "forum" && targetType !== "comment") {
      return { error: new Error("Invalid target_type") };
    }

    const targetIdField = targetType === "forum" ? "forum_id" : "comment_id";

    // Get existing vote before deleting
    const { data: existing, error: checkError } = await supabase
      .from(TABLE)
      .select("vote_type")
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq(targetIdField, targetId)
      .maybeSingle();

    if (checkError) {
      console.error("Check vote error:", checkError);
      return { error: checkError };
    }

    const oldVoteType = existing?.vote_type || 0;

    const result = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq(targetIdField, targetId);

    // ✅ UPDATE VOTE COUNTS (recalculate from votes table)
    if (!result.error) {
      if (targetType === "forum") {
        await this._updateForumVoteCounts(targetId);
      } else if (targetType === "comment") {
        await this._updateCommentVoteCounts(targetId);
      }
    }

    return result;
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
