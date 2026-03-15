import { TopicModel } from "../../models/topic_model.js";
import { UserTopicsModel } from "../../models/userTopics_model.js";
import { UserModel } from "../../models/user_model.js";

export const OnboardingController = {
  // GET /forums/topics
  async getTopics(req, res) {
    try {
      const topics = await TopicModel.getAll();

      return res.status(200).json({
        message: "Topics fetched successfully",
        topics,
      });
    } catch (error) {
      console.error("Get Topics Error:", error);
      return res.status(500).json({
        error: "Failed to fetch topics",
      });
    }
  },

  // GET /forums/my-topics
  async getMyTopics(req, res) {
    try {
      const userId = req.user.id;
      const userTopics = await UserTopicsModel.getByUser(userId);

      return res.status(200).json({
        message: "User topics fetched successfully",
        topics: userTopics,
      });
    } catch (error) {
      console.error("Get My Topics Error:", error);
      return res.status(500).json({
        error: "Failed to fetch user topics",
      });
    }
  },

  // POST /forums/my-topics
  async saveTopics(req, res) {
    try {
      const userId = req.user.id;
      const { topicIds } = req.body;

      if (!Array.isArray(topicIds)) {
        return res.status(400).json({
          error: "topicIds must be an array",
        });
      }

      const uniqueTopicIds = [...new Set(topicIds)];

      if (uniqueTopicIds.length < 3) {
        return res.status(400).json({
          error: "Please select at least 3 topics",
        });
      }

      const validTopics = await TopicModel.findByIds(uniqueTopicIds);

      if (!validTopics || validTopics.length !== uniqueTopicIds.length) {
        return res.status(400).json({
          error: "One or more selected topics are invalid",
        });
      }

      await UserTopicsModel.replaceForUser(userId, uniqueTopicIds);
      await UserModel.updateOnboardingStatus(userId, true);

      const savedTopics = await UserTopicsModel.getByUser(userId);

      return res.status(200).json({
        message: "Topics saved successfully",
        topics: savedTopics,
        onboardingRequired: false,
      });
    } catch (error) {
      console.error("Save Topics Error:", error);
      return res.status(500).json({
        error: "Failed to save topics",
      });
    }
  },
};