import { TopicModel } from "../../models/topic_model.js";
import { UserTopicsModel } from "../../models/userTopics_model.js";
import { UserModel } from "../../models/user_model.js";

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

  // GET /api/users/topics - user's selected topics with full info
  async getUserTopics(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const topicsData = await UserTopicsModel.getByUser(userId);
      // Extract just the topics array from the response
      const topics = topicsData.map((item) => item.topics).filter(Boolean);
      res.json({ topics });
    } catch (err) {
      console.error("Get User Topics Error:", err);
      res.status(500).json({ error: "Failed to fetch user topics" });
    }
  },

  // GET /api/users/topic-ids - user's selected topic IDs only
  async getUserTopicIds(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const topicIds = await UserTopicsModel.getTopicIdsByUser(userId);
      res.json({ topicIds });
    } catch (err) {
      console.error("Get User Topic IDs Error:", err);
      res.status(500).json({ error: "Failed to fetch user topic IDs" });
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

      // Remove previous selections
      await UserTopicsModel.removeAllForUser(userId);

      // Save new topics
      await UserTopicsModel.addForUser(userId, topicIds);

      // ✅ Mark onboarding as completed
      await UserModel.updateOnboardingStatus(userId, true);

      res.json({
        message: "Topics saved successfully",
        onboardingCompleted: true,
      });
    } catch (err) {
      console.error("Save User Topics Error:", err);
      res.status(500).json({ error: "Failed to save topics" });
    }
  },

  // DELETE /api/users/topics - remove all topics
  async unsaveUserTopics(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      await UserTopicsModel.removeAllForUser(userId);
      res.json({ message: "All topics have been removed" });
    } catch (err) {
      console.error("Unsave User Topics Error:", err);
      res.status(500).json({ error: "Failed to remove topics" });
    }
  },

  // DELETE /api/users/topics/:topicId - remove specific topic
  async removeUserTopic(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { topicId } = req.params;

      await UserTopicsModel.removeTopicForUser(userId, topicId);
      res.json({ message: "Topic removed successfully" });
    } catch (err) {
      console.error("Remove User Topic Error:", err);
      res.status(500).json({ error: "Failed to remove topic" });
    }
  },
};
