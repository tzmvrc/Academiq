import { CommentModel } from "../../models/comment_model.js";

export const CommentsController = {
  // GET /api/forums/:id/comments
  async getCommentsByForumId(req, res) {
    try {
      const forumId = req.params.id;

      const { data, error } = await CommentModel.findByForumId(forumId);
      if (error) throw error;

      res.json({ comments: data });
    } catch (err) {
      console.error("Get Forum Comments Error:", err);
      res.status(500).json({ error: "Failed to fetch forum comments" });
    }
  },

  // GET /api/comments/:id
  async getCommentById(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await CommentModel.findById(id);
      if (error) throw error;

      res.json({ comment: data });
    } catch (err) {
      console.error("Get Comment Error:", err);
      res.status(404).json({ error: "Comment not found" });
    }
  },

  // GET /api/comments/users/me
  async getMyComments(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await CommentModel.findByUserId(userId);
      if (error) throw error;

      res.json({ comments: data });
    } catch (err) {
      console.error("Get My Comments Error:", err);
      res.status(500).json({ error: "Failed to fetch user comments" });
    }
  },

  // POST /api/forums/:id/comments
  async createComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const { content, parent_comment_id = null } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const payload = {
        forum_id: forumId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id,
      };

      const { data, error } = await CommentModel.create(payload);
      if (error) throw error;

      res.status(201).json({ comment: data });
    } catch (err) {
      console.error("Create Comment Error:", err);
      res.status(500).json({ error: "Failed to create comment" });
    }
  },

  // PUT /api/comments/:id
  async updateComment(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await CommentModel.update(id, req.body);
      if (error) throw error;

      res.json({ comment: data });
    } catch (err) {
      console.error("Update Comment Error:", err);
      res.status(500).json({ error: "Failed to update comment" });
    }
  },

  // DELETE /api/comments/:id
  async deleteComment(req, res) {
    try {
      const { id } = req.params;

      const { error } = await CommentModel.delete(id);
      if (error) throw error;

      res.json({ message: "Comment deleted successfully" });
    } catch (err) {
      console.error("Delete Comment Error:", err);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  },
};
