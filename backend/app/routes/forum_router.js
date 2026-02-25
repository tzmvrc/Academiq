import express from "express";
import { ForumsController } from "../services/forum/forum_controller.js";
import { CommentsController } from "../services/comment/comment_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

/* -----------------------
   Forums (Public)
------------------------ */
// Public - get all forums (optionally prioritized if req.user exists)
router.get("/", ForumsController.getAllForums);

// Public - get forum by ID
router.get("/:id", ForumsController.getForumById);

/* -----------------------
   Forums (Protected)
------------------------ */
// Protected - get forums by logged-in user
router.get("/users/me", authMiddleware, ForumsController.getMyForums);

// Protected - create forum (supports topicIds in body)
router.post("/", authMiddleware, ForumsController.createForum);

// Protected - update forum
router.put("/:id", authMiddleware, ForumsController.updateForum);

// Protected - delete forum
router.delete("/:id", authMiddleware, ForumsController.deleteForum);

// Protected - vote / unvote forum
router.post("/:id/vote", authMiddleware, ForumsController.voteForum);
router.delete("/:id/vote", authMiddleware, ForumsController.unvoteForum);

/* -----------------------
   Comments (Public)
------------------------ */
// Public - get comments by forum ID
router.get("/:id/comments", CommentsController.getCommentsByForumId);

/* -----------------------
   Comments (Protected)
------------------------ */
// Protected - create comment for a forum
router.post("/:id/comments", authMiddleware, CommentsController.createComment);

export default router;