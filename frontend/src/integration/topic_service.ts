import axiosInstance from "./axiosInstance";

export interface TopicResponse {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  category: string;
  slug: string;
  created_at?: string;
}

export interface UserTopicResponse {
  topic_id: string;
  created_at: string;
  topics: TopicResponse;
}

export const topicService = {
  /**
   * Fetch all available topics
   */
  async getAllTopics(): Promise<TopicResponse[]> {
    try {
      const response = await axiosInstance.get("/topics");
      return response.data.topics || [];
    } catch (error) {
      console.error("Failed to fetch topics:", error);
      throw error;
    }
  },

  /**
   * Fetch user's selected topics with full info
   */
  async getUserTopics(): Promise<TopicResponse[]> {
    try {
      const response = await axiosInstance.get("/topics/users/topics");
      // Extract just the topics array from the response
      const topics = (response.data.topics || []).map(
        (item: UserTopicResponse) => item.topics,
      );
      return topics;
    } catch (error) {
      console.error("Failed to fetch user topics:", error);
      throw error;
    }
  },

  /**
   * Fetch user's selected topic IDs only
   */
  async getUserTopicIds(): Promise<string[]> {
    try {
      const response = await axiosInstance.get("/topics/users/topic-ids");
      return response.data.topicIds || [];
    } catch (error) {
      console.error("Failed to fetch user topic IDs:", error);
      throw error;
    }
  },

  /**
   * Save user selected topics (for onboarding)
   */
  async saveUserTopics(topicIds: string[]): Promise<void> {
    try {
      await axiosInstance.post("/topics/users/topics", {
        topicIds,
      });
    } catch (error) {
      console.error("Failed to save user topics:", error);
      throw error;
    }
  },

  /**
   * Remove all user topics
   */
  async removeAllUserTopics(): Promise<void> {
    try {
      await axiosInstance.delete("/topics/users/topics");
    } catch (error) {
      console.error("Failed to remove user topics:", error);
      throw error;
    }
  },

  /**
   * Remove a specific topic for the user
   */
  async removeUserTopic(topicId: string): Promise<void> {
    try {
      await axiosInstance.delete(`/topics/users/topics/${topicId}`);
    } catch (error) {
      console.error(`Failed to remove topic ${topicId}:`, error);
      throw error;
    }
  },
};
