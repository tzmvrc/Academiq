import axiosInstance from "./axiosInstance";

export interface CommentResponse {
  id: string;
  forum_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  is_ai_verified: boolean;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at?: string;
  users: {
    id: string;
    name: string;
    profile_url?: string;
  };
}

export interface CommentCardProps {
  id: string;
  author: string;
  authorId: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isAIVerified?: boolean;
  upvotes: number;
  downvotes: number;
  userVote?: 1 | -1 | null;
  replies?: CommentCardProps[];
}

// Get the initials from a full name
// Function kept for potential future use
// const getInitials = (name: string): string => {
//   return name
//     .split(" ")
//     .map((word) => word[0])
//     .join("")
//     .toUpperCase()
//     .substring(0, 2);
// };

// Transform comment API response to comment card format
const transformCommentToCard = (
  comment: CommentResponse,
  userVote?: 1 | -1 | null,
): CommentCardProps => {
  return {
    id: comment.id,
    author: comment.users.name,
    authorId: comment.user_id,
    avatar: comment.users.profile_url,
    content: comment.content,
    timestamp: comment.created_at,
    isAIVerified: comment.is_ai_verified,
    upvotes: comment.upvotes_count || 0,
    downvotes: comment.downvotes_count || 0,
    userVote: userVote ?? null,
  };
};

export const commentService = {
  /**
   * Fetch comments for a specific forum
   */
  async getCommentsByForumId(forumId: string): Promise<CommentCardProps[]> {
    try {
      const response = await axiosInstance.get(`/forums/${forumId}/comments`);
      const currentUser = localStorage.getItem("user");
      const currentUserId = currentUser ? JSON.parse(currentUser).id : null;

      const comments = (response.data.comments || []).map(
        (comment: CommentResponse) => transformCommentToCard(comment),
      );

      // If user is authenticated, fetch vote states for all comments
      if (currentUserId) {
        const commentsWithVotes = await Promise.all(
          comments.map(async (comment: any) => {
            try {
              const voteState = await this.getUserCommentVoteState(comment.id);
              return { ...comment, userVote: voteState };
            } catch (err) {
              return comment;
            }
          }),
        );
        return commentsWithVotes;
      }

      return comments;
    } catch (error) {
      console.error(`Failed to fetch comments for forum ${forumId}:`, error);
      throw error;
    }
  },

  /**
   * Fetch a specific comment by ID
   */
  async getCommentById(commentId: string): Promise<CommentCardProps> {
    try {
      const response = await axiosInstance.get(`/comments/${commentId}`);
      return transformCommentToCard(response.data.comment);
    } catch (error) {
      console.error(`Failed to fetch comment ${commentId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new comment
   */
  async createComment(data: {
    forum_id: string;
    content: string;
    parent_comment_id?: string;
  }): Promise<CommentCardProps> {
    try {
      const response = await axiosInstance.post(
        `/forums/${data.forum_id}/comments`,
        {
          content: data.content,
          parent_comment_id: data.parent_comment_id,
        },
      );
      return transformCommentToCard(response.data.comment);
    } catch (error) {
      console.error("Failed to create comment:", error);
      throw error;
    }
  },

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    content: string,
  ): Promise<CommentCardProps> {
    try {
      const response = await axiosInstance.put(`/comments/${commentId}`, {
        content,
      });
      return transformCommentToCard(response.data.comment);
    } catch (error) {
      console.error(`Failed to update comment ${commentId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      await axiosInstance.delete(`/comments/${commentId}`);
    } catch (error) {
      console.error(`Failed to delete comment ${commentId}:`, error);
      throw error;
    }
  },

  /**
   * Vote on a comment
   */
  async voteComment(
    commentId: string,
    voteType: 1 | -1,
  ): Promise<{
    voteType: 1 | -1;
    voteCount: { upvotes: number; downvotes: number };
  }> {
    try {
      const response = await axiosInstance.post(`/comments/${commentId}/vote`, {
        voteType,
      });
      return {
        voteType: response.data.voteType,
        voteCount: response.data.voteCount,
      };
    } catch (error) {
      console.error(`Failed to vote on comment ${commentId}:`, error);
      throw error;
    }
  },

  /**
   * Remove vote from a comment
   */
  async unvoteComment(
    commentId: string,
  ): Promise<{ voteCount: { upvotes: number; downvotes: number } }> {
    try {
      const response = await axiosInstance.delete(
        `/comments/${commentId}/vote`,
      );
      return {
        voteCount: response.data.voteCount,
      };
    } catch (error) {
      console.error(`Failed to unvote comment ${commentId}:`, error);
      throw error;
    }
  },

  /**
   * Get the current user's vote state on a comment
   */
  async getUserCommentVoteState(commentId: string): Promise<1 | -1 | null> {
    try {
      const response = await axiosInstance.get(
        `/comments/${commentId}/my-vote`,
      );
      return response.data.voteType ?? null;
    } catch (error) {
      console.error(
        `Failed to fetch vote state for comment ${commentId}:`,
        error,
      );
      return null;
    }
  },
};
