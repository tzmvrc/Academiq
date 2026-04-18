// routes/interest_vector_router.js
// Routes for managing user interest vectors and personalized recommendations

import express from "express";
import { authMiddleware } from "../middlewares/auth_middleware.js";
import { UserModel } from "../models/user_model.js";

const router = express.Router();

/**
 * GET /api/interest-vectors/me
 * Get current user's interest vector (cached or computed)
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vector = await UserModel.getOrComputeInterestVector(userId);

    res.json({
      user_id: userId,
      interest_vector: vector,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching interest vector:", err);
    res.status(500).json({ error: "Failed to fetch interest vector" });
  }
});

/**
 * POST /api/interest-vectors/me/recompute
 * Force recompute user's interest vector
 */
router.post("/me/recompute", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Invalidate current vector
    await UserModel.invalidateInterestVector(userId);

    // Compute new vector
    const vector = await UserModel.computeInterestVector(userId);

    res.json({
      user_id: userId,
      interest_vector: vector,
      status: "recomputed",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error recomputing interest vector:", err);
    res.status(500).json({ error: "Failed to recompute interest vector" });
  }
});

/**
 * DELETE /api/interest-vectors/me
 * Invalidate user's interest vector (force recompute on next fetch)
 */
router.delete("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await UserModel.invalidateInterestVector(userId);

    res.json({
      user_id: userId,
      status: "invalidated",
      success: result.success,
    });
  } catch (err) {
    console.error("Error invalidating interest vector:", err);
    res.status(500).json({ error: "Failed to invalidate interest vector" });
  }
});

/**
 * GET /api/interest-vectors/stats
 * Get user's activity statistics for interest vector computation
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { UserActivityModel } =
      await import("../models/user_activity_model.js");

    const activities = await UserActivityModel.getRecentActivities(
      userId,
      1440,
    );
    const stats = await UserActivityModel.getActivityStats(userId, 1440);

    res.json({
      user_id: userId,
      activity_count: activities.length,
      stats,
      window_minutes: 1440,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching activity stats:", err);
    res.status(500).json({ error: "Failed to fetch activity stats" });
  }
});

export default router;
