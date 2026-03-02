import express from "express";
import { SubjectsController } from "../services/subjects/subject_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

// Public - get all subjects
router.get("/", SubjectsController.getAllSubjects);

// Public - get subjects under a topic
router.get("/:topicId", SubjectsController.getSubjectsByTopic);

// Protected - create subject
router.post("/", authMiddleware, SubjectsController.createSubject);

export default router;
