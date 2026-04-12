import express from "express";
import { authMiddleware } from "../middlewares/auth_middleware.js";
import {
  getAllAchievements,
  getUserAchievements,
  updateFeaturedAchievements,
  getFeaturedAchievements,
} from "../services/achievement/achievements_controller.js";

const router = express.Router();

// GET all achievements (no auth required - public endpoint)
router.get("/", getAllAchievements);

// GET featured achievements for a user (public endpoint - userId in query)
router.get("/featured", getFeaturedAchievements);

// GET user's all achievements (requires auth)
router.get("/user/:userId", authMiddleware, getUserAchievements);

// PUT featured achievements (requires auth - saves user's selection)
router.put("/featured", authMiddleware, updateFeaturedAchievements);

export default router;
