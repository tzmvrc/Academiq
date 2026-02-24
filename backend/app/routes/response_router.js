import express from "express";
import { ResponsesController } from "../services/responses/responses_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

// Public - get all responses
router.get("/", ResponsesController.getAllResponses);

// Public - get response by ID
router.get("/:id", ResponsesController.getResponseById);

// Public - get responses by forum ID
router.get("/forum/:forumId", ResponsesController.getResponsesByForumId);

// Protected - get responses by logged-in user
router.get("/users/me", authMiddleware, ResponsesController.getMyResponses);

// Protected - create a response
router.post("/", authMiddleware, ResponsesController.createResponse);

// Protected - update a response
router.put("/:id", authMiddleware, ResponsesController.updateResponse);

// Protected - delete a response
router.delete("/:id", authMiddleware, ResponsesController.deleteResponse);

// Protected - like / unlike response
router.post("/:id/like", authMiddleware, ResponsesController.likeResponse);
router.post("/:id/unlike", authMiddleware, ResponsesController.unlikeResponse);

// Protected - dislike / undislike response
router.post("/:id/dislike", authMiddleware, ResponsesController.dislikeResponse);
router.post("/:id/undislike", authMiddleware, ResponsesController.undislikeResponse);

// Protected - archive / unarchive response
router.patch("/:id/archive", authMiddleware, ResponsesController.archiveResponse);
router.patch("/:id/unarchive", authMiddleware, ResponsesController.unarchiveResponse);

export default router;