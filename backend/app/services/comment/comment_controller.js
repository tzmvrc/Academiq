import { CommentModel } from "../../models/comment_model.js";
import { getIO } from "../../middlewares/socket.js";
import { NotificationService } from "../../services/notification/notification_service.js";
import { ForumModel } from "../../models/forum_model.js";
import { UserModel } from "../../models/user_model.js";

export const CommentsController = {
  // GET /api/forums/:id/comments
  async getCommentsByForumId(req, res) {
    try {
      const forumId = req.params.id;

      const { data, error } = await CommentModel.findByForumId(forumId);
      if (error) throw error;

      // Comments now include upvotes_count and downvotes_count from the database
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

      const { data: created, error } = await CommentModel.create(payload);
      if (error) throw error;

      // Fetch the created comment with user info
      const { data: comment, error: fetchErr } = await CommentModel.findById(
        created.id,
      );
      if (fetchErr) throw fetchErr;

      // Fetch commenter's name (already available in req.user? use DB to be safe)
      const commenter = await UserModel.findById(userId);
      const commenterName = commenter?.name || "someone";

      // --- Notifications ---
      if (parent_comment_id) {
        // Reply to a comment
        const { data: parentComment } =
          await CommentModel.findById(parent_comment_id);
        if (parentComment && parentComment.user_id !== userId) {
          await NotificationService.createNotification({
            userId: parentComment.user_id,
            type: "reply",
            referenceId: comment.id,
            message: `${commenterName} replied to your comment`,
            metadata: { commentId: comment.id, forumId },
          });
        }
      } else {
        // Top-level comment on a forum
        const { data: forum } = await ForumModel.findById(forumId);
        if (forum && forum.user_id !== userId) {
          await NotificationService.createNotification({
            userId: forum.user_id,
            type: "reply",
            referenceId: comment.id,
            message: `${commenterName} commented on your forum "${forum.title.substring(0, 50)}"`,
            metadata: {
              forumTitle: forum.title,
              commentId: comment.id,
              forumId: forum.id,
            },
          });
        }
      }

      // Emit real-time event
      const io = getIO();
      io.to(`post:${forumId}`).emit("comment_created", comment);

      res.status(201).json({ comment });
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

      // Fetch the updated comment to get the latest user info and forum_id
      const { data: updatedComment, error: fetchErr } =
        await CommentModel.findById(id);
      if (fetchErr) throw fetchErr;

      // ---- Emit real-time event ----
      const io = getIO();
      io.to(`post:${updatedComment.forum_id}`).emit(
        "comment_updated",
        updatedComment,
      );
      // ------------------------------

      res.json({ comment: updatedComment });
    } catch (err) {
      console.error("Update Comment Error:", err);
      res.status(500).json({ error: "Failed to update comment" });
    }
  },

  // DELETE /api/comments/:id
  async deleteComment(req, res) {
    try {
      const { id } = req.params;

      // Fetch comment first to get forum_id
      const { data: comment, error: fetchErr } =
        await CommentModel.findById(id);
      if (fetchErr) throw fetchErr;

      const { error } = await CommentModel.delete(id);
      if (error) throw error;

      // ---- Emit real-time event ----
      const io = getIO();
      io.to(`post:${comment.forum_id}`).emit("comment_deleted", {
        commentId: id,
        forumId: comment.forum_id,
      });
      // ------------------------------

      res.json({ message: "Comment deleted successfully" });
    } catch (err) {
      console.error("Delete Comment Error:", err);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  },
};
