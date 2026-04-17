import express from "express";
import { LeaderboardController } from "../services/leaderboard/leaderboard_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

router.get("/", LeaderboardController.getLeaderboard);
router.get("/me", authMiddleware, LeaderboardController.getMyLeaderboardInfo);
router.get("/top", authMiddleware, LeaderboardController.getTopSchools);
router.get("/search", LeaderboardController.searchLeaderboard);
router.get("/search/schools", LeaderboardController.searchTopSchools);
router.get(
  "/:schoolName/users",
  authMiddleware,
  LeaderboardController.getSchoolUsers,
);
router.get(
  "/:schoolName/forums",
  authMiddleware,
  LeaderboardController.getSchoolForums,
);

// GET /api/leaderboard/school-logo/:schoolName
router.get(
  "/school-logo/:schoolName",
  authMiddleware,
  LeaderboardController.getSchoolLogo,
);

export default router;
