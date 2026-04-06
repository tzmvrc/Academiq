import express from "express";
import { SubjectsController } from "../services/subjects/subject_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";
import { OnboardingController } from "../services/forum/Onboarding_controller.js";

const router = express.Router();

router.get("/", SubjectsController.getAllSubjects);
router.get("/trending", SubjectsController.getTrendingTopics);
router.get("/with-count", SubjectsController.getAllSubjectsWithCount); // <-- add this
router.get("/my-subjects", authMiddleware, OnboardingController.getMySubjects);
router.post("/my-subjects", authMiddleware, OnboardingController.saveSubjects);
router.post("/", authMiddleware, SubjectsController.createSubject);
router.post("/follow/:subjectId", authMiddleware, SubjectsController.followSubject);
router.delete("/follow/:subjectId", authMiddleware, SubjectsController.unfollowSubject);

export default router;
