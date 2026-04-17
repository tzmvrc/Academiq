// services/leaderboard/leaderboard_controller.js
import { UserModel } from "../../models/user_model.js";
import { SchoolModel } from "../../models/schools_model.js";
import { getSchoolLogo } from "./schoolUtils.js";

export const LeaderboardController = {
  async getLeaderboard(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;
      const school = req.query.school || null;
      const users = await UserModel.getLeaderboard(limit, offset, school);
      res.json({ users });
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  },

  async getMyLeaderboardInfo(req, res) {
    try {
      const userId = req.user.id;
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const rank = await UserModel.getUserRank(userId);
      const top100Points = await UserModel.getTop100Threshold();

      let pointsToTop100 = null;
      if (top100Points > 0 && (user?.points || 0) < top100Points) {
        pointsToTop100 = top100Points - (user?.points || 0) + 1;
      }

      const schoolLogo = getSchoolLogo(user.school);

      res.json({
        rank: rank || 0,
        points: user?.points || 0,
        name: user.name,
        profile_url: user.profile_url,
        school: user.school,
        schoolLogo,
        pointsToTop100,
        top100Threshold: top100Points,
      });
    } catch (err) {
      console.error("My leaderboard info error:", err);
      res.status(500).json({ error: "Failed to fetch user info" });
    }
  },

  async getTopSchools(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;
      const schools = await SchoolModel.getTopSchoolsWithContributors(
        limit,
        offset,
      );
      res.json({ schools });
    } catch (err) {
      console.error("Top schools error:", err);
      res.status(500).json({ error: "Failed to fetch top schools" });
    }
  },

  async getSchoolUsers(req, res) {
    try {
      const { schoolName } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;
      const users = await SchoolModel.getUsersBySchool(
        schoolName,
        limit,
        offset,
      );
      res.json({ users });
    } catch (err) {
      console.error("School users error:", err);
      res.status(500).json({ error: "Failed to fetch school users" });
    }
  },

  async getSchoolForums(req, res) {
    try {
      const { schoolName } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const offset = parseInt(req.query.offset) || 0;
      const forums = await SchoolModel.getForumsBySchool(
        schoolName,
        limit,
        offset,
      );
      res.json({ forums });
    } catch (err) {
      console.error("School forums error:", err);
      res.status(500).json({ error: "Failed to fetch school forums" });
    }
  },

  async getSchoolLogo(req, res) {
    try {
      const { schoolName } = req.params;
      const decoded = decodeURIComponent(schoolName);
      const logo = getSchoolLogo(decoded);
      res.json({ logo });
    } catch (err) {
      console.error("Get school logo error:", err);
      res.status(500).json({ error: "Failed to fetch school logo" });
    }
  },

  async searchLeaderboard(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;
      const school = req.query.school || null;
      const searchTerm = (req.query.search || "").trim();

      if (!searchTerm) {
        return res.status(400).json({ error: "Search term is required" });
      }

      const users = await UserModel.searchLeaderboard(
        searchTerm,
        limit,
        offset,
        school,
      );
      res.json({ users });
    } catch (err) {
      console.error("Leaderboard search error:", err);
      res.status(500).json({ error: "Failed to search leaderboard" });
    }
  },

  async searchTopSchools(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;
      const searchTerm = (req.query.search || "").trim();

      if (!searchTerm) {
        return res.status(400).json({ error: "Search term is required" });
      }

      const schools = await SchoolModel.searchTopSchools(
        searchTerm,
        limit,
        offset,
      );
      res.json({ schools });
    } catch (err) {
      console.error("Top schools search error:", err);
      res.status(500).json({ error: "Failed to search top schools" });
    }
  },
};
