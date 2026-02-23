import { TopicModel } from "../../models/topic_model.js";
import { UserTopicsModel } from "../../models/userTopics_model.js";

export const TopicsController = {
  // GET /api/topics - all available topics
  async getAllTopics(req, res) {
    try {
      const topics = await TopicModel.getAll();
      res.json({ topics });
    } catch (err) {
      console.error("Get Topics Error:", err);
      res.status(500).json({ error: "Failed to fetch topics" });
    }
  },

  // GET /api/users/topics - user's selected topics
  async getUserTopics(req, res) {
    try {
      const userId = req.user.id;
      const topicIds = await UserTopicsModel.getByUser(userId);
      res.json({ topicIds });
    } catch (err) {
      console.error("Get User Topics Error:", err);
      res.status(500).json({ error: "Failed to fetch user topics" });
    }
  },

  // POST /api/users/topics - save user selected topics
  async saveUserTopics(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ error: "Unauthorized: user ID not found" });
      }

      const topicIds = Array.isArray(req.body.topicIds)
        ? req.body.topicIds
        : [];
      if (topicIds.length < 3) {
        return res.status(400).json({ error: "Select at least 3 topics" });
      }

      // Validate topics exist
      const validTopics = await TopicModel.findByIds(topicIds);
      if (validTopics.length !== topicIds.length) {
        return res
          .status(400)
          .json({ error: "One or more selected topics are invalid" });
      }

      // Remove previous selections and save new ones
      await UserTopicsModel.removeAllForUser(userId);
      await UserTopicsModel.addForUser(userId, topicIds);

      res.json({ message: "Topics saved successfully" });
    } catch (err) {
      console.error("Save User Topics Error:", err);
      res.status(500).json({ error: "Failed to save topics" });
    }
  },

  // in controllers/topics_controller.js
  async unsaveUserTopics(req, res) {
    try {
      const userId = req.user.id;
      await UserTopicsModel.removeAllForUser(userId);
      res.json({ message: "All topics have been removed" });
    } catch (err) {
      console.error("Unsave User Topics Error:", err);
      res.status(500).json({ error: "Failed to remove topics" });
    }
  },
};
