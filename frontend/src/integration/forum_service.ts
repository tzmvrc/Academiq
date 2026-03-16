import axiosInstance from "./axiosInstance";

export interface ForumResponse {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  content: string;
  document_url?: string;
  ai_summary?: string;
  is_ai_verified?: boolean;
  comments_count: number;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at?: string;
  users: {
    id: string;
    name: string;
    profile_url?: string;
  };
  subjects: {
    id: string;
    name: string;
  };
}

export interface DiscussionCardProps {
  id?: string;
  title: string;
  author: string;
  authorInitials: string;
  authorProfileUrl?: string;
  field: string;
  preview: string;
  aiSummary: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  tag: string;
  isOwn: boolean;
  userVoteState?: 1 | -1 | null; // 1 for upvote, -1 for downvote, null for no vote
  isAiVerified?: boolean;
}

// Get the initials from a full name
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

// Transform forum API response to discussion card format
const transformForumToDiscussion = (
  forum: ForumResponse,
  currentUserId?: string,
  userVoteState?: 1 | -1 | null,
): DiscussionCardProps => {
  return {
    id: forum.id,
    title: forum.title,
    author: forum.users.name,
    authorInitials: getInitials(forum.users.name),
    authorProfileUrl: forum.users.profile_url,
    field: forum.subjects.name,
    preview:
      forum.content.substring(0, 150) +
      (forum.content.length > 150 ? "..." : ""),
    aiSummary: forum.ai_summary?.trim() ?? "",
    upvotes: forum.upvotes_count || 0,
    downvotes: forum.downvotes_count || 0,
    comments: forum.comments_count || 0,
    tag: forum.subjects.name,
    isOwn: currentUserId === forum.user_id,
    userVoteState: userVoteState ?? null,
    isAiVerified: forum.is_ai_verified,
  };
};

export const forumService = {
  /**
   * Fetch all forums from the backend with user vote states
   */
  async getAllForums(): Promise<DiscussionCardProps[]> {
    try {
      const response = await axiosInstance.get("/forums");
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const forums = (response.data.forums || []).map((forum: ForumResponse) =>
        transformForumToDiscussion(forum, currentUserId),
      );

      // If user is authenticated, fetch vote states for all forums
      if (currentUserId) {
        const forumsWithVotes = await Promise.all(
          forums.map(async (forum) => {
            try {
              const voteState = await this.getUserVoteState(forum.id!);
              return { ...forum, userVoteState: voteState };
            } catch (err) {
              // If vote fetch fails, just return forum without vote state
              return forum;
            }
          }),
        );
        return forumsWithVotes;
      }

      return forums;
    } catch (error) {
      console.error("Failed to fetch forums:", error);
      throw error;
    }
  },

  /**
   * Fetch a specific forum by ID
   */
  async getForumById(id: string): Promise<DiscussionCardProps> {
    try {
      const response = await axiosInstance.get(`/forums/${id}`);
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      return transformForumToDiscussion(response.data.forum, currentUserId);
    } catch (error) {
      console.error(`Failed to fetch forum ${id}:`, error);
      throw error;
    }
  },

  /**
   * Fetch forums created by the current user
   */
  async getMyForums(): Promise<DiscussionCardProps[]> {
    try {
      const response = await axiosInstance.get("/forums/users/me");
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      return (response.data.forums || []).map((forum: ForumResponse) =>
        transformForumToDiscussion(forum, currentUserId),
      );
    } catch (error) {
      console.error("Failed to fetch user forums:", error);
      throw error;
    }
  },

  /**
   * Create a new forum
   */
  async createForum(data: {
    title: string;
    content: string;
    subject_id?: string;
    subject?: string;
    topicIds?: string[];
  }): Promise<DiscussionCardProps> {
    try {
      const response = await axiosInstance.post("/forums", data);
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      return transformForumToDiscussion(response.data.forum, currentUserId);
    } catch (error) {
      console.error("Failed to create forum:", error);
      throw error;
    }
  },

  /**
   * Vote on a forum
   */
  async voteForum(
    forumId: string,
    voteType: 1 | -1,
  ): Promise<{
    voteType: 1 | -1;
    voteCount: { upvotes: number; downvotes: number };
  }> {
    try {
      const response = await axiosInstance.post(`/forums/${forumId}/vote`, {
        voteType,
      });
      return {
        voteType: response.data.voteType,
        voteCount: response.data.voteCount,
      };
    } catch (error) {
      console.error(`Failed to vote on forum ${forumId}:`, error);
      throw error;
    }
  },

  /**
   * Remove vote from a forum
   */
  async unvoteForum(
    forumId: string,
  ): Promise<{ voteCount: { upvotes: number; downvotes: number } }> {
    try {
      const response = await axiosInstance.delete(`/forums/${forumId}/vote`);
      return {
        voteCount: response.data.voteCount,
      };
    } catch (error) {
      console.error(`Failed to unvote forum ${forumId}:`, error);
      throw error;
    }
  },

  /**
   * Toggle save status of a forum
   */
  async toggleSaveForum(forumId: string): Promise<void> {
    try {
      await axiosInstance.post(`/forums/${forumId}/save`);
    } catch (error) {
      console.error(`Failed to toggle save for forum ${forumId}:`, error);
      throw error;
    }
  },

  /**
   * Get the current user's vote state on a forum
   */
  async getUserVoteState(forumId: string): Promise<1 | -1 | null> {
    try {
      const response = await axiosInstance.get(`/forums/${forumId}/my-vote`);
      return response.data.voteType ?? null;
    } catch (error) {
      console.error(`Failed to fetch vote state for forum ${forumId}:`, error);
      return null;
    }
  },
};
