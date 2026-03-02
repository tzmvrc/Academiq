import { PostVoteModel } from "../../models/postVotes_model.js";
import { ForumModel } from "../../models/forum_model.js"; // if you have this for fetching forum

export const ForumsController = {
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

      const { data: voteRow, error } = await PostVoteModel.setVote(
        forumId,
        userId,
        voteType,
      );

      if (error) {
        console.error("PostVoteModel.setVote error:", error);
        return res
          .status(500)
          .json({ error: "Failed to save vote", details: error.message });
      }

      // ✅ Return updated forum score from forums table (trigger-maintained)
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
        vote: voteRow, // includes vote_type
        voteType: voteRow.vote_type, // convenient for frontend
        voteCount: forum.vote_count, // net score after triggers
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

      const { error } = await PostVoteModel.removeVote(forumId, userId);
      if (error) {
        console.error("PostVoteModel.removeVote error:", error);
        return res
          .status(500)
          .json({ error: "Failed to remove vote", details: error.message });
      }

      // ✅ Return updated forum score (trigger-maintained)
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
        voteCount: forum.vote_count,
      });
    } catch (err) {
      console.error("Unvote Forum Error:", err);
      res
        .status(500)
        .json({ error: "Failed to unvote forum", details: err.message });
    }
  },
};
