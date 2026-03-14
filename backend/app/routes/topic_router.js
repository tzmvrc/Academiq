import express from "express";
import { TopicsController } from "../services/topics/topic_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

/**
 * IMPORTANT: Put specific routes BEFORE "/:id" to avoid route conflicts
 */

// Public - get all topics
router.get("/", TopicsController.getAllTopics);

// Protected - get user's selected topics with full info
router.get("/users/topics", authMiddleware, TopicsController.getUserTopics);

// Protected - get user's selected topic IDs only
router.get(
  "/users/topic-ids",
  authMiddleware,
  TopicsController.getUserTopicIds,
);

// Protected - save user selected topics
router.post("/users/topics", authMiddleware, TopicsController.saveUserTopics);

// Protected - remove all user Topics
router.delete(
  "/users/topics",
  authMiddleware,
  TopicsController.unsaveUserTopics,
);

// Protected - remove specific topic for user
router.delete(
  "/users/topics/:topicId",
  authMiddleware,
  TopicsController.removeUserTopic,
);

export default router;
