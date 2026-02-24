import express from "express";
import { TopicsController } from "../services/topics/topic_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

// Public - get all topics
router.get("/", TopicsController.getAllTopics);

// Protected - get user's selected topics
router.get("/users/topics", authMiddleware, TopicsController.getUserTopics);

// Protected - save user selected topics
router.post("/users/topics", authMiddleware, TopicsController.saveUserTopics);

router.delete("/users/topics", authMiddleware, TopicsController.unsaveUserTopics);


export default router;
