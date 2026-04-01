import express from "express";
import { SubjectsController } from "../services/subjects/subject_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";
import { OnboardingController } from "../services/forum/Onboarding_controller.js";

const router = express.Router();

// Public - get all subjects (for onboarding list)
router.get("/", SubjectsController.getAllSubjects);

// Protected - get user's selected subjects
router.get("/my-subjects", authMiddleware, OnboardingController.getMySubjects);

// Protected - save user's selected subjects
router.post("/my-subjects", authMiddleware, OnboardingController.saveSubjects);

// Protected - create a new subject (admin only)
router.post("/", authMiddleware, SubjectsController.createSubject);

export default router;