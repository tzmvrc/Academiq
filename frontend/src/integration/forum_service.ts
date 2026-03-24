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
  documentUrl?: string | null;
  downvotes: number;
  comments: number;
  tag: string;
  isOwn: boolean;
  isSaved?: boolean;
  userVoteState?: 1 | -1 | null;
  isAiVerified?: boolean;
}

export interface ToggleSaveResponse {
  message: string;
  saved: boolean;
}

export interface SaveStatusResponse {
  saved: boolean;
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

const transformForumToDiscussion = (
  forum: Partial<ForumResponse> & {
    id: string;
    title: string;
    content: string;
  },
  currentUserId?: string,
  userVoteState?: 1 | -1 | null,
): DiscussionCardProps => {
  const authorName = forum.users?.name || "Unknown User";
  const subjectName = forum.subjects?.name || "General";

  return {
    id: forum.id,
    title: forum.title,
    author: authorName,
    authorInitials: getInitials(authorName),
    authorProfileUrl: forum.users?.profile_url,
    field: subjectName,
    preview:
      (forum.content || "").substring(0, 150) +
      ((forum.content || "").length > 150 ? "..." : ""),
    aiSummary: forum.ai_summary?.trim() ?? "",
    upvotes: forum.upvotes_count || 0,
    downvotes: forum.downvotes_count || 0,
    comments: forum.comments_count || 0,
    documentUrl: forum.document_url || null,
    tag: subjectName,
    isOwn: currentUserId === forum.user_id,
    isSaved: false,
    userVoteState: userVoteState ?? null,
    isAiVerified: forum.is_ai_verified ?? false,
  };
};

export const forumService = {
  async getAllForums(): Promise<DiscussionCardProps[]> {
    try {
      const response = await axiosInstance.get("/forums");
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const forums = (response.data.forums || []).map((forum: ForumResponse) =>
        transformForumToDiscussion(forum, currentUserId),
      );

      if (currentUserId) {
        const forumsWithVotes = await Promise.all(
          forums.map(async (forum) => {
            try {
              const voteState = await this.getUserVoteState(forum.id!);
              return { ...forum, userVoteState: voteState };
            } catch {
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

  async getSaveStatus(forumId: string): Promise<SaveStatusResponse> {
    try {
      const response = await axiosInstance.get(`/forums/${forumId}/save`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get save status for forum ${forumId}:`, error);
      throw error;
    }
  },

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

  async createForum(data: {
    title: string;
    content: string;
    subject_id?: string;
    subject?: string;
    topicIds?: string[];
    file?: File;
  }): Promise<DiscussionCardProps> {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("content", data.content);

      if (data.subject) {
        formData.append("subject", data.subject);
      }

      if (data.subject_id) {
        formData.append("subject_id", data.subject_id);
      }

      if (data.topicIds?.length) {
        formData.append("topicIds", JSON.stringify(data.topicIds));
      }

      if (data.file) {
        formData.append("attachment", data.file);
      }

      const response = await axiosInstance.post("/forums", formData);

      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const createdForum = response.data?.forum;

      if (!createdForum?.id) {
        throw new Error("Created forum ID was not returned by the API");
      }

      const fullForumResponse = await axiosInstance.get(
        `/forums/${createdForum.id}`,
      );

      return transformForumToDiscussion(
        fullForumResponse.data.forum,
        currentUserId,
      );
    } catch (error) {
      console.error("Failed to create forum:", error);
      throw error;
    }
  },

  async updateForum(
    id: string,
    data: {
      title: string;
      content: string;
      subject_id?: string;
      subject?: string;
      topicIds?: string[];
      file?: File;
      removeAttachment?: boolean; // new
    },
  ): Promise<DiscussionCardProps> {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("content", data.content);

      if (data.subject) {
        formData.append("subject", data.subject);
      }

      if (data.subject_id) {
        formData.append("subject_id", data.subject_id);
      }

      if (data.topicIds?.length) {
        formData.append("topicIds", JSON.stringify(data.topicIds));
      }

      if (data.file) {
        formData.append("attachment", data.file);
      }

      const response = await axiosInstance.put(`/forums/${id}`, formData);

      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const updatedForum = response.data?.forum;

      if (!updatedForum?.id) {
        throw new Error("Updated forum ID was not returned by the API");
      }

      if (data.removeAttachment) {
        formData.append("removeAttachment", "true");
      }

      const fullForumResponse = await axiosInstance.get(
        `/forums/${updatedForum.id}`,
      );

      return transformForumToDiscussion(
        fullForumResponse.data.forum,
        currentUserId,
      );
    } catch (error) {
      console.error(`Failed to update forum ${id}:`, error);
      throw error;
    }
  },

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

  async toggleSaveForum(forumId: string): Promise<ToggleSaveResponse> {
    try {
      const response = await axiosInstance.post(`/forums/${forumId}/save`);
      return response.data;
    } catch (error) {
      console.error(`Failed to toggle save for forum ${forumId}:`, error);
      throw error;
    }
  },

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
