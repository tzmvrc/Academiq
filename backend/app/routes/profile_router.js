import express from "express";
import multer from "multer";
import {
  getUserProfile,
  updateUserProfile,
  getUserStats,
  uploadProfilePicture,
  updateFullProfile,
} from "../services/profile/profile_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// New routes for edit profile modal (both require auth) - must come BEFORE /:id routes
router.post(
  "/upload-picture",
  authMiddleware,
  upload.single("profile_picture"),
  uploadProfilePicture,
);
router.put("/", authMiddleware, updateFullProfile); // Update current user's profile (no :id)

// Existing routes (assumed to be public or with auth as needed) - these come AFTER the above routes
router.get("/:id", getUserProfile);
router.put("/:id", authMiddleware, updateUserProfile);
router.get("/:id/stats", getUserStats);

export default router;
