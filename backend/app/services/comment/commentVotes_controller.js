import { VotesModel } from "../../models/votes_model.js";
import { CommentModel } from "../../models/comment_model.js";
import { getIO } from "../../middlewares/socket.js";

export const CommentVotesController = {
  async voteComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const commentId = req.params.id;
      const voteTypeNum = Number(req.body?.voteType);

      if (voteTypeNum !== 1 && voteTypeNum !== -1) {
        return res.status(400).json({ error: "voteType must be 1 or -1" });
      }

      // Save the vote
      const { data: voteRow, error: voteError } = await VotesModel.setVote(
        userId,
        "comment",
        commentId,
        voteTypeNum
      );
      if (voteError) {
        console.error("VotesModel.setVote error:", voteError);
        return res.status(500).json({ error: "Failed to save vote", details: voteError.message });
      }

      // Update comment counts based on the new vote state
      const { data: voteCounts, error: countError } = await VotesModel.getVoteCount("comment", commentId);
      if (countError) {
        console.error("getVoteCount error:", countError);
        return res.status(500).json({ error: "Failed to fetch vote counts" });
      }

      // Fetch the comment (to get forum_id) for socket emission
      const { data: comment, error: fetchErr } = await CommentModel.findById(commentId);
      if (!fetchErr && comment) {
        const io = getIO();
        io.to(`post:${comment.forum_id}`).emit("comment_voted", {
          commentId,
          voteType: voteRow.vote_type,
          upvotes: voteCounts.upvotes,
          downvotes: voteCounts.downvotes,
          userId,
        });
      }

      res.json({
        voteType: voteRow.vote_type,
        voteCount: voteCounts,
        message: "Vote saved",
      });
    } catch (err) {
      console.error("Vote Comment Error:", err);
      res.status(500).json({ error: "Failed to vote on comment", details: err.message });
    }
  },

  async unvoteComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const commentId = req.params.id;

      const { error: removeError } = await VotesModel.removeVote(userId, "comment", commentId);
      if (removeError) {
        console.error("removeVote error:", removeError);
        return res.status(500).json({ error: "Failed to remove vote" });
      }

      // Update comment counts after removal
      const { data: voteCounts, error: countError } = await VotesModel.getVoteCount("comment", commentId);
      if (countError) {
        console.error("getVoteCount error:", countError);
        return res.status(500).json({ error: "Failed to fetch vote counts" });
      }


      const { data: comment, error: fetchErr } = await CommentModel.findById(commentId);
      if (!fetchErr && comment) {
        const io = getIO();
        io.to(`post:${comment.forum_id}`).emit("comment_voted", {
          commentId,
          voteType: null,
          upvotes: voteCounts.upvotes,
          downvotes: voteCounts.downvotes,
          userId,
        });
      }

      res.json({
        voteType: null,
        voteCount: voteCounts,
        message: "Vote removed",
      });
    } catch (err) {
      console.error("Unvote Comment Error:", err);
      res.status(500).json({ error: "Failed to remove vote" });
    }
  },

  async getMyVote(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const commentId = req.params.id;
      const { data, error } = await VotesModel.getUserVote(userId, "comment", commentId);
      if (error) throw error;

      res.json({ voteType: data?.vote_type ?? null });
    } catch (err) {
      console.error("Get My Vote Error:", err);
      res.status(500).json({ error: "Failed to fetch vote state" });
    }
  },
};