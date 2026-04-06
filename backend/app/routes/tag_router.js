import express from "express";
import { TagController } from "../services/forum/tag_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

// Public routes – static before dynamic
router.get("/with-count", TagController.getTagsWithCount);
router.get("/", TagController.getAllTags);
router.get("/:id", TagController.getTagById);

// Admin only
router.post("/", authMiddleware, TagController.createTag);
router.put("/:id", authMiddleware, TagController.updateTag);
router.delete("/:id", authMiddleware, TagController.deleteTag);

export default router;