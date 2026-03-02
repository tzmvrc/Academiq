import express from "express";
import { ForumsController } from "../services/forum/forum_controller.js";
import { ForumSavesController } from "../services/forum/forumSaves_controller.js";
import { CommentsController } from "../services/comment/comment_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

/* -----------------------
   Forums (Public)
------------------------ */
// Public - get all forums
router.get("/", ForumsController.getAllForums);

/* -----------------------
   Forums (Protected)
------------------------ */
// ✅ Put specific routes BEFORE "/:id"
router.get("/users/me", authMiddleware, ForumsController.getMyForums);

// Protected - get all saved forums for user
router.get("/saved/list", authMiddleware, ForumSavesController.getSavedForums);

// (Optional) get my vote state for a forum (for UI highlight)
router.get("/:id/my-vote", authMiddleware, ForumsController.getMyVote);

// (Optional) check if forum is saved
router.get("/:id/save", authMiddleware, ForumSavesController.getSaveStatus);

/* -----------------------
   Forums (Public by ID)
------------------------ */
// Public - get forum by ID
router.get("/:id", ForumsController.getForumById);

/* -----------------------
   Forums (Protected actions)
------------------------ */
router.post("/", authMiddleware, ForumsController.createForum);
router.put("/:id", authMiddleware, ForumsController.updateForum);
router.delete("/:id", authMiddleware, ForumsController.deleteForum);

// Reddit-style vote / unvote
router.post("/:id/vote", authMiddleware, ForumsController.voteForum);
router.delete("/:id/vote", authMiddleware, ForumsController.unvoteForum);

// Toggle save status
router.post("/:id/save", authMiddleware, ForumSavesController.toggleSave);

/* -----------------------
   Comments
------------------------ */
// Public - get comments by forum ID
router.get("/:id/comments", CommentsController.getCommentsByForumId);

// Protected - create comment for a forum
router.post("/:id/comments", authMiddleware, CommentsController.createComment);

export default router;
