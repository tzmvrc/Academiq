import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000/ai";

/**
 * AI Service wrapper - communicates with FastAPI AI service
 */
export const AIService = {
  /**
   * Validate a comment and award points
   *
   * @param {string} commentId - UUID of the comment
   * @param {string} forumTitle - Title of the forum
   * @param {string} forumContent - Content of the forum
   * @param {string} commentText - Comment text to validate
   * @param {array} existingComments - List of existing comments in thread
   * @param {string} threadSummary - Optional summary of thread
   * @returns {Promise<{is_related, is_duplicate, awarded_points, reason}>}
   */
  async validatePoints(
    commentId,
    forumTitle,
    forumContent,
    commentText,
    existingComments,
    threadSummary,
  ) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/validate-points`, {
        forum_title: forumTitle,
        forum_content: forumContent,
        comment_text: commentText,
        existing_comments: existingComments || [],
        thread_summary: threadSummary || null,
      });

      // Add comment_id back for tracking
      return {
        ...response.data,
        comment_id: commentId,
      };
    } catch (error) {
      console.error("❌ Point validation failed:", error.message);
      throw new Error(`Point validation failed: ${error.message}`);
    }
  },

  /**
   * Verify claims in a comment
   *
   * @param {string} commentId - UUID of the comment
   * @param {string} forumTitle - Title of the forum for context
   * @param {string} forumContent - Content of the forum for context
   * @param {string} commentContent - Comment content to verify
   * @returns {Promise<{status, source_url, reason}>}
   */
  async verifyComment(commentId, forumTitle, forumContent, commentContent) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/verify-comment`, {
        forum_title: forumTitle,
        forum_content: forumContent,
        comment_text: commentContent,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Comment verification failed:", error.message);
      throw new Error(`Comment verification failed: ${error.message}`);
    }
  },

  /**
   * Validate if a source URL is credible and relevant to comment
   *
   * @param {string} commentId - UUID of the comment
   * @param {string} sourceUrl - URL to validate
   * @param {string} commentContent - Comment text for context
   * @returns {Promise<{is_credible: boolean, is_relevant: boolean, reason: string}>}
   */
  async validateSource(commentId, sourceUrl, commentContent) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/validate-source`, {
        comment_id: commentId,
        source_url: sourceUrl,
        comment_content: commentContent,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Source validation failed:", error.message);
      throw new Error(`Source validation failed: ${error.message}`);
    }
  },

  /**
   * Summarize thread comments
   *
   * @param {array} comments - List of comment texts to summarize
   * @returns {Promise<{summary: string}>}
   */
  async summarizeThread(comments) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/summarize`, {
        comments: comments || [],
      });

      return response.data;
    } catch (error) {
      console.error("❌ Thread summarization failed:", error.message);
      throw new Error(`Thread summarization failed: ${error.message}`);
    }
  },
};
