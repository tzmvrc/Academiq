import { supabase } from "../../database/supabase.js";
import { AIService } from "../ai/aiService.js";
import { NotificationService } from "../notification/notification_service.js";
import { AchievementService } from "../achievement_service.js";
import { getIO } from "../../middlewares/socket.js";

/**
 * Comment Verification Service
 *
 * Handles real-time verification of comments after they are posted.
 * Uses async/non-blocking approach to avoid blocking user experience.
 */

export const CommentVerificationService = {
  /**
   * Verify a comment asynchronously (fire and forget)
   * Called after comment is created and saved to database
   *
   * @param {string} commentId - UUID of the comment
   * @param {string} forumId - UUID of the forum
   * @param {string} content - Comment content to verify
   * @returns {Promise<void>}
   */
  async verifyCommentAsync(commentId, forumId, content) {
    // Fire and forget - don't await
    this.verifyCommentInternal(commentId, forumId, content).catch((err) => {
      console.error(
        `⚠️  Background verification failed for comment ${commentId}:`,
        err,
      );
    });
  },

  /**
   * Internal verification logic
   */
  async verifyCommentInternal(commentId, forumId, content) {
    try {
      console.log(`🔍 Verifying comment ${commentId}...`);

      // Fetch forum data for context
      const { data: forum, error: forumError } = await supabase
        .from("forums")
        .select("title, content, user_id")
        .eq("id", forumId)
        .single();

      if (forumError || !forum) {
        console.error(`  ⚠️  Failed to fetch forum ${forumId}:`, forumError);
        return;
      }

      // Fetch comment user for notifications
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", commentId)
        .single();

      if (commentError || !comment) {
        console.error(
          `  ⚠️  Failed to fetch comment ${commentId}:`,
          commentError,
        );
        return;
      }

      // Call AI service to verify comment with forum context
      const verificationResult = await AIService.verifyComment(
        commentId,
        forum.title,
        forum.content,
        content,
      );

      const { status, source_url, reason, confidence } = verificationResult;
      const isVerified = status === "verified" || status === true;

      console.log(
        `  ✅ Verification result: status=${status}, source_url=${source_url}`,
      );

      // Save verification result to database
      const { error: updateError } = await supabase
        .from("comments")
        .update({
          is_ai_verified: isVerified,
          verification_source_url: source_url,
          verification_checked_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (updateError) {
        console.error(
          `  ❌ Failed to save verification for comment ${commentId}:`,
          updateError,
        );
        return;
      }

      console.log(
        `  ✅ Comment ${commentId} verification saved (verified=${isVerified})`,
      );

      // If verified with source URL, create notification and trigger achievements
      if (isVerified && source_url) {
        try {
          await NotificationService.createNotification({
            userId: comment.user_id,
            type: "comment_verified",
            referenceId: commentId,
            message: `Your comment was verified by AI through: ${new URL(source_url).hostname}`,
            metadata: {
              source_url,
              reason,
              commentPreview: content.substring(0, 100),
            },
          });
          console.log(`  ✅ User notified of verification`);

          // Trigger achievement evaluation for verified comment
          AchievementService.triggerOnVerificationConfirmed(
            comment.user_id,
          ).catch((err) => console.error("Achievement evaluation error:", err));
        } catch (notifErr) {
          console.error(`  ⚠️  Failed to create notification:`, notifErr);
        }

        // Emit real-time event to notify users
        const io = getIO();
        if (io) {
          io.emit("comment:verified", {
            commentId,
            isVerified: true,
            sourceUrl: source_url,
            confidence,
          });
        }
      }
    } catch (error) {
      console.error(`❌ Comment verification error for ${commentId}:`, error);
      // Silently fail - don't block comment creation
    }
  },
};
