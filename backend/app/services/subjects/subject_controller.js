import { SubjectModel } from "../../models/subject_model.js";
import { UserSubjectsModel } from "../../models/userSubjects_model.js";

export const SubjectsController = {
  // GET /api/subjects
  async getAllSubjects(req, res) {
    try {
      const { data, error } = await SubjectModel.findAll();
      if (error) throw error;

      res.json({ subjects: data });
    } catch (err) {
      console.error("Get All Subjects Error:", err);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  },

  // POST /api/subjects
  async createSubject(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Check if exists by name
      const { data: existingSubject, error: findErr } =
        await SubjectModel.findByName(name);

      if (findErr && findErr.code !== "PGRST116") {
        throw findErr;
      }

      if (existingSubject) {
        return res.json({ subject: existingSubject });
      }

      // Create new subject
      const { data, error } = await SubjectModel.create(name);

      if (error) throw error;

      res.status(201).json({ subject: data });
    } catch (err) {
      console.error("Create Subject Error:", err);
      res.status(500).json({ error: "Failed to create subject" });
    }
  },

  async getTrendingTopics(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 18;
      const topics = await SubjectModel.getTrendingTopics(limit);
      res.json({ topics });
    } catch (err) {
      console.error("Trending topics error:", err);
      res.status(500).json({ error: "Failed to fetch trending topics" });
    }
  },

  // In SubjectsController
  async getAllSubjectsWithCount(req, res) {
    try {
      const subjects = await SubjectModel.findAllWithCount(); // returns { id, name, discussion_count }
      res.json({ subjects });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  },

  async followSubject(req, res) {
    try {
      const userId = req.user.id; // from authMiddleware
      const { subjectId } = req.params;

      if (!subjectId) {
        return res.status(400).json({ error: "Subject ID is required" });
      }

      // Optional: verify subject exists
      const { data: subject, error: subjErr } = await SubjectModel.findById(subjectId);
      if (subjErr || !subject) {
        return res.status(404).json({ error: "Subject not found" });
      }

      const { data, error } = await UserSubjectsModel.addForUser(userId, subjectId);
      if (error) throw error;

      res.status(200).json({ message: "Subject followed", subject: data });
    } catch (err) {
      console.error("Follow subject error:", err);
      res.status(500).json({ error: "Failed to follow subject" });
    }
  },

  // DELETE /api/subjects/follow/:subjectId
  async unfollowSubject(req, res) {
    try {
      const userId = req.user.id;
      const { subjectId } = req.params;

      if (!subjectId) {
        return res.status(400).json({ error: "Subject ID is required" });
      }

      const { error } = await UserSubjectsModel.removeForUser(userId, subjectId);
      if (error) throw error;

      res.status(200).json({ message: "Subject unfollowed" });
    } catch (err) {
      console.error("Unfollow subject error:", err);
      res.status(500).json({ error: "Failed to unfollow subject" });
    }
  },
};
