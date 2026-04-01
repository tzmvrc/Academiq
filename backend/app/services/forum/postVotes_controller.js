import { VotesModel } from "../../models/votes_model.js";
import { ForumModel } from "../../models/forum_model.js";

export const PostVotesController = {
  // POST /api/forums/:id/vote
  async voteForum(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const { voteType } = req.body;

      if (voteType !== 1 && voteType !== -1) {
        return res.status(400).json({ error: "voteType must be 1 or -1" });
      }

      const { data: voteRow, error } = await VotesModel.setVote(
        userId,
        "forum",
        forumId,
        voteType,
      );

      if (error) {
        console.error("VotesModel.setVote error:", error);
        return res
          .status(500)
          .json({ error: "Failed to save vote", details: error.message });
      }

      // ✅ Return updated forum with vote counts
      const { data: forum, error: forumErr } =
        await ForumModel.findById(forumId);
      if (forumErr) {
        console.error("ForumModel.findById error:", forumErr);
        return res
          .status(500)
          .json({ error: "Failed to fetch forum", details: forumErr.message });
      }

      res.json({
        message: "Vote saved",
        vote: voteRow,
        voteType: voteRow.vote_type,
        voteCount: {
          upvotes: forum.upvotes_count,
          downvotes: forum.downvotes_count,
        },
      });
    } catch (err) {
      console.error("Vote Forum Error:", err);
      res
        .status(500)
        .json({ error: "Failed to vote forum", details: err.message });
    }
  },

  // DELETE /api/forums/:id/vote
  async unvoteForum(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;

      const { error } = await VotesModel.removeVote(userId, "forum", forumId);
      if (error) {
        console.error("VotesModel.removeVote error:", error);
        return res
          .status(500)
          .json({ error: "Failed to remove vote", details: error.message });
      }

      // ✅ Return updated forum with vote counts
      const { data: forum, error: forumErr } =
        await ForumModel.findById(forumId);
      if (forumErr) {
        console.error("ForumModel.findById error:", forumErr);
        return res
          .status(500)
          .json({ error: "Failed to fetch forum", details: forumErr.message });
      }

      res.json({
        message: "Vote removed",
        voteType: null,
        voteCount: {
          upvotes: forum.upvotes_count,
          downvotes: forum.downvotes_count,
        },
      });
    } catch (err) {
      console.error("Unvote Forum Error:", err);
      res
        .status(500)
        .json({ error: "Failed to unvote forum", details: err.message });
    }
  },
};
