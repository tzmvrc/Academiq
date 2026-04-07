// src/integration/forum_service.ts

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
  user: {
    id: string;
    name: string;
    profile_url?: string;
    school?: string;
  };
  subject: {
    id: string;
    name: string;
  };
  tags?: Tag[]; // added
}

export interface Tag {
  id: string;
  name: string;
  slug?: string;
  usage_count?: number;
}

export interface DiscussionCardProps {
  id?: string;
  user_id?: string;
  title: string;
  author: string;
  authorInitials: string;
  authorProfileUrl?: string;
  authorSchool?: string;
  field: string; // subject name
  tags?: Tag[]; // array of tags
  preview: string;
  fullContent: string;
  aiSummary?: string;
  upvotes: number;
  documentUrl?: string | null | undefined;
  downvotes: number;
  comments: number;
  tag: string; // keep for backward compatibility? Actually we might remove and use field+tags
  isOwn?: boolean;
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

// Transform a raw forum from the API into a DiscussionCardProps object
const transformForumToDiscussion = (
  forum: ForumResponse,
  currentUserId?: string,
  userVoteState?: 1 | -1 | null,
): DiscussionCardProps => {
  const authorName = forum.user?.name || "Unknown User";
  const subjectName = forum.subject?.name || "General";

  return {
    id: forum.id,
    user_id: forum.user_id,
    title: forum.title,
    author: authorName,
    authorInitials: getInitials(authorName),
    authorProfileUrl: forum.user?.profile_url,
    authorSchool: forum.user?.school || "",
    field: subjectName,
    tags: forum.tags || [],
    preview:
      (forum.content || "").substring(0, 150) +
      ((forum.content || "").length > 150 ? "..." : ""),
    fullContent: forum.content || "",
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
  // Get all forums with optional filtering by subject or tag
  async getAllForums(params?: {
    subjectId?: string;
    tagId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    forums: DiscussionCardProps[];
    hasMore: boolean;
    total: number;
  }> {
    try {
      const query = new URLSearchParams();
      if (params?.subjectId) query.append("subjectId", params.subjectId);
      if (params?.tagId) query.append("tagId", params.tagId);
      if (params?.limit !== undefined)
        query.append("limit", params.limit.toString());
      if (params?.offset !== undefined)
        query.append("offset", params.offset.toString());
      const url = `/forums?${query.toString()}`;

      const response = await axiosInstance.get(url);
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const rawForums = response.data.forums || [];
      const hasMore = response.data.hasMore === true;
      const total = response.data.total || 0;

      let forums = rawForums.map((forum: ForumResponse) =>
        transformForumToDiscussion(forum, currentUserId),
      );

      if (currentUserId && forums.length) {
        const forumsWithVotes = await Promise.all(
          forums.map(async (forum: DiscussionCardProps) => {
            try {
              const voteState = await this.getUserVoteState(forum.id!);
              return { ...forum, userVoteState: voteState };
            } catch {
              return forum;
            }
          }),
        );
        forums = forumsWithVotes;
      }

      return { forums, hasMore, total };
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
    tagIds?: string[];
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
      if (data.tagIds?.length) {
        formData.append("tagIds", JSON.stringify(data.tagIds));
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
      tagIds?: string[];
      file?: File;
      removeAttachment?: boolean;
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
      if (data.tagIds?.length) {
        formData.append("tagIds", JSON.stringify(data.tagIds));
      }
      if (data.file) {
        formData.append("attachment", data.file);
      }
      if (data.removeAttachment) {
        formData.append("removeAttachment", "true");
      }

      const response = await axiosInstance.put(`/forums/${id}`, formData);
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const updatedForum = response.data?.forum;
      if (!updatedForum?.id) {
        throw new Error("Updated forum ID was not returned by the API");
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

  // Get personalized feed (NEW)
  async getPersonalizedFeed(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    forums: DiscussionCardProps[];
    hasMore: boolean;
    total: number;
  }> {
    try {
      const query = new URLSearchParams();
      if (params?.limit !== undefined)
        query.append("limit", params.limit.toString());
      if (params?.offset !== undefined)
        query.append("offset", params.offset.toString());
      const url = `/forums/feed?${query.toString()}`;

      const response = await axiosInstance.get(url);
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const rawForums = response.data.forums || [];
      const hasMore = response.data.hasMore === true;
      const total = response.data.total || 0;

      let forums = rawForums.map((forum: ForumResponse) =>
        transformForumToDiscussion(forum, currentUserId),
      );

      if (currentUserId && forums.length) {
        const forumsWithVotes = await Promise.all(
          forums.map(async (forum: DiscussionCardProps) => {
            try {
              const voteState = await this.getUserVoteState(forum.id!);
              return { ...forum, userVoteState: voteState };
            } catch {
              return forum;
            }
          }),
        );
        forums = forumsWithVotes;
      }

      return { forums, hasMore, total };
    } catch (error) {
      console.error("Failed to fetch personalized feed:", error);
      // Fallback to regular forums
      return this.getAllForums(params);
    }
  },

  // Get people you may know recommendations (NEW)
  async getPeopleYouMayKnow(limit = 1000): Promise<PeerUser[]> {
    try {
      const response = await axiosInstance.get(
        `/forums/suggestions/people?limit=${limit}`,
      );
      return response.data.users || [];
    } catch (error) {
      console.error("Failed to fetch people suggestions:", error);
      return [];
    }
  },
};

export interface PeerUser {
  id: string;
  name: string;
  profile_url: string | null;
  school: string | null;
  followers_count: number;
  mutual_count?: number;
}
