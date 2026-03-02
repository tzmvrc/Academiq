import express from "express";
import { CommentsController } from "../services/comment/comment_controller.js";
import { CommentVotesController } from "../services/comment/commentVotes_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

/**
 * IMPORTANT:
 * Put "/users/me" BEFORE "/:id" to avoid route conflicts.
 */

// Protected - get comments by logged-in user
router.get("/users/me", authMiddleware, CommentsController.getMyComments);

// Protected - vote on comment
router.post("/:id/vote", authMiddleware, CommentVotesController.voteComment);

// Protected - remove vote from comment
router.delete(
  "/:id/vote",
  authMiddleware,
  CommentVotesController.unvoteComment,
);

// Protected - get my vote state for a comment
router.get("/:id/my-vote", authMiddleware, CommentVotesController.getMyVote);

// Public - get comment by ID
router.get("/:id", CommentsController.getCommentById);

// Protected - update a comment
router.put("/:id", authMiddleware, CommentsController.updateComment);

// Protected - delete a comment
router.delete("/:id", authMiddleware, CommentsController.deleteComment);

export default router;
