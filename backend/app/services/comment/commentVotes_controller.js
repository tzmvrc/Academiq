import { VotesModel } from "../../models/votes_model.js";

export const CommentVotesController = {
  // POST /api/comments/:id/vote
  async voteComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const commentId = req.params.id;
      const voteTypeNum = Number(req.body?.voteType);

      if (voteTypeNum !== 1 && voteTypeNum !== -1) {
        return res.status(400).json({ error: "voteType must be 1 or -1" });
      }

      const { data: voteRow, error } = await VotesModel.setVote(
        userId,
        "comment",
        commentId,
        voteTypeNum,
      );

      if (error) {
        console.error("VotesModel.setVote error:", error);
        return res
          .status(500)
          .json({ error: "Failed to save vote", details: error.message });
      }

      // Fetch updated vote count
      const { data: voteCount } = await VotesModel.getVoteCount(
        "comment",
        commentId,
      );

      res.json({
        voteType: voteRow.vote_type,
        voteCount: voteCount || { upvotes: 0, downvotes: 0 },
        message: "Vote saved",
      });
    } catch (err) {
      console.error("Vote Comment Error:", err);
      res
        .status(500)
        .json({ error: "Failed to vote on comment", details: err.message });
    }
  },

  // DELETE /api/comments/:id/vote
  async unvoteComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const commentId = req.params.id;

      const { error } = await VotesModel.removeVote(
        userId,
        "comment",
        commentId,
      );
      if (error) throw error;

      // Fetch updated vote count
      const { data: voteCount } = await VotesModel.getVoteCount(
        "comment",
        commentId,
      );

      res.json({
        voteType: null,
        voteCount: voteCount || { upvotes: 0, downvotes: 0 },
        message: "Vote removed",
      });
    } catch (err) {
      console.error("Unvote Comment Error:", err);
      res.status(500).json({ error: "Failed to remove vote" });
    }
  },

  // GET /api/comments/:id/my-vote
  async getMyVote(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const commentId = req.params.id;
      const { data, error } = await VotesModel.getUserVote(
        userId,
        "comment",
        commentId,
      );
      if (error) throw error;

      res.json({ voteType: data?.vote_type ?? null });
    } catch (err) {
      console.error("Get My Vote Error:", err);
      res.status(500).json({ error: "Failed to fetch vote state" });
    }
  },
};
