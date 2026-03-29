import { SubjectModel } from "../../models/subject_model.js";
import { UserSubjectsModel } from "../../models/userSubjects_model.js";
import { UserModel } from "../../models/user_model.js";

export const OnboardingController = {
  // GET /onboarding/subjects
  async getSubjects(req, res) {
    try {
      const { data: subjects, error } = await SubjectModel.findAll();
      if (error) throw error;

      return res.status(200).json({
        message: "Subjects fetched successfully",
        subjects,
      });
    } catch (error) {
      console.error("Get Subjects Error:", error);
      return res.status(500).json({
        error: "Failed to fetch subjects",
      });
    }
  },

  // GET /onboarding/my-subjects
  async getMySubjects(req, res) {
    try {
      const userId = req.user.id;
      const subjects = await UserSubjectsModel.getByUser(userId);

      return res.status(200).json({
        message: "User subjects fetched successfully",
        subjects,
      });
    } catch (error) {
      console.error("Get My Subjects Error:", error);
      return res.status(500).json({
        error: "Failed to fetch user subjects",
      });
    }
  },

  // POST /onboarding/my-subjects
  async saveSubjects(req, res) {
    try {
      const userId = req.user.id;
      const { subjectIds } = req.body;

      if (!Array.isArray(subjectIds)) {
        return res.status(400).json({
          error: "subjectIds must be an array",
        });
      }

      const uniqueSubjectIds = [...new Set(subjectIds)];

      if (uniqueSubjectIds.length < 3) {
        return res.status(400).json({
          error: "Please select at least 3 subjects",
        });
      }

      // Validate all subject IDs exist
      const validSubjects = await SubjectModel.findByIds(uniqueSubjectIds);

      if (!validSubjects || validSubjects.length !== uniqueSubjectIds.length) {
        return res.status(400).json({
          error: "One or more selected subjects are invalid",
        });
      }

      await UserSubjectsModel.replaceForUser(userId, uniqueSubjectIds);
      await UserModel.updateOnboardingStatus(userId, true);

      const savedSubjects = await UserSubjectsModel.getByUser(userId);

      return res.status(200).json({
        message: "Subjects saved successfully",
        subjects: savedSubjects,
        onboardingRequired: false,
      });
    } catch (error) {
      console.error("Save Subjects Error:", error);
      return res.status(500).json({
        error: "Failed to save subjects",
      });
    }
  },
};