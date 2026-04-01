import { SubjectModel } from "../../models/subject_model.js";

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
};
