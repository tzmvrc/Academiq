// src/integration/personalization_service.ts
/**
 * Frontend Personalization Service
 * Tracks user activities and logs them to the backend
 * This is supplementary - activities are primarily logged on the backend
 */

import axiosInstance from "./axiosInstance";

export interface ActivityData {
  forumId: string;
  actionType: "view" | "comment" | "upvote" | "downvote" | "save";
  timestamp?: Date;
}

export const personalizationService = {
  /**
   * Log user interactions (optional - backend logs these)
   * This is here for analytics and debugging purposes
   */
  async logActivity(forumId: string, actionType: string): Promise<void> {
    try {
      // Activities are logged on the backend transparently
      // This method can be used for additional client-side analytics
      console.log(
        `[Personalization] Activity: ${actionType} on forum ${forumId}`,
      );
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  },

  /**
   * Get user's interest profile (what topics they engage with most)
   */
  async getUserInterests(): Promise<any[]> {
    try {
      const response = await axiosInstance.get("/users/me/interests");
      return response.data.interests || [];
    } catch (err) {
      console.error("Failed to fetch user interests:", err);
      return [];
    }
  },

  /**
   * Get trending forums in user's interests
   */
  async getTrendingInInterests(): Promise<any[]> {
    try {
      const response = await axiosInstance.get("/forums/trending-academic");
      return response.data.forums || [];
    } catch (err) {
      console.error("Failed to fetch trending forums:", err);
      return [];
    }
  },

  /**
   * Get explanation of why a forum appeared in feed
   * (DEBUG: Shows which signals caused it to rank)
   */
  getSignalExplanation(forum: any): string[] {
    const signals: string[] = [];

    if (forum.scoringReasons?.includes("subject")) {
      signals.push("📚 In your subjects");
    }
    if (forum.scoringReasons?.includes("peer")) {
      signals.push("👥 From someone you follow");
    }
    if (forum.scoringReasons?.includes("interest")) {
      signals.push("✨ Matches your interests");
    }
    if (forum.scoringReasons?.includes("trending")) {
      signals.push("🔥 Currently trending");
    }

    if (signals.length === 0) {
      signals.push("📌 Recently posted");
    }

    return signals;
  },

  /**
   * Human-readable explanation of ranking
   */
  getRankingExplanation(score: number): string {
    if (score >= 0.8) return "Highly relevant to you";
    if (score >= 0.6) return "Relevant to your interests";
    if (score >= 0.4) return "May interest you";
    if (score >= 0.2) return "Recently posted";
    return "Popular content";
  },
};
