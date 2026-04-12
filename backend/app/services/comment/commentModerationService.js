import { supabase } from "../../database/supabase.js";
import { AIService } from "../ai/aiService.js";
import { NotificationService } from "../notification/notification_service.js";
import { UserModel } from "../../models/user_model.js";

/**
 * Comment Moderation Service
 *
 * Two-tier system for real-time comment verification:
 * 1. TIER 1 (Immediate): Point validation - if points = 0, delete comment
 * 2. TIER 2 (Post-Points): Source validation - validate URLs and adjust points
 */

export const CommentModerationService = {
  /**
   * TIER 1: Immediate point validation after comment creation
   * If points awarded = 0, delete comment and notify user why
   *
   * @param {string} commentId - UUID of the comment
   * @param {string} userId - UUID of comment author
   * @param {string} forumId - UUID of the forum
   * @param {string} forumTitle - Title of the forum
   * @param {string} forumContent - Content of the forum
   * @param {string} commentContent - Content of the comment
   * @returns {Promise<{approved: boolean, pointsAwarded?: number, reason: string}>}
   */
  async validatePointsImmediately(
    commentId,
    userId,
    forumId,
    forumTitle,
    forumContent,
    commentContent,
  ) {
    try {
      console.log(`⏱️  [TIER 1] Validating points immediately: ${commentId}`);

      // Fetch existing comments for context
      const { data: existingComments, error: commentsError } = await supabase
        .from("comments")
        .select("content")
        .eq("forum_id", forumId)
        .neq("id", commentId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (commentsError) {
        console.error(`  ⚠️  Failed to fetch context comments:`, commentsError);
      }

      const existingCommentTexts = existingComments
        ? existingComments.map((c) => c.content)
        : [];

      // Call AI to validate points
      const validationResult = await AIService.validatePoints(
        commentId,
        forumTitle,
        forumContent,
        commentContent,
        existingCommentTexts,
        null,
      );

      const { awarded_points: pointsScore, reason } = validationResult;
      const pointsAwarded = Math.max(
        0,
        Math.min(10, parseInt(pointsScore) || 0),
      );

      console.log(
        `  📊 Points validation: ${pointsAwarded}/10 | Reason: ${reason}`,
      );

      // ===== CRITICAL: If points = 0, delete comment =====
      if (pointsAwarded === 0) {
        console.log(
          `  ❌ Zero points detected. Deleting comment ${commentId}...`,
        );

        // Delete the comment
        const { error: deleteError } = await supabase
          .from("comments")
          .delete()
          .eq("id", commentId);

        if (deleteError) {
          console.error(
            `  ❌ Failed to delete low-quality comment ${commentId}:`,
            deleteError,
          );
          throw deleteError;
        }

        console.log(`  ✅ Comment deleted (zero quality)`);

        // Notify user why their comment was deleted
        try {
          await NotificationService.createNotification({
            userId,
            type: "comment_moderation",
            referenceId: commentId,
            message: `Your comment was removed by AI moderation. Reason: ${reason}`,
            metadata: {
              action: "deleted",
              reason: "zero_points",
              commentPreview: commentContent.substring(0, 100),
              aiReason: reason,
            },
          });
          console.log(`  ✅ User notified of deletion`);
        } catch (notifErr) {
          console.error(`  ⚠️  Failed to notify user:`, notifErr);
        }

        return {
          approved: false,
          reason: "zero_points",
          pointsAwarded: 0,
        };
      }

      // ===== If points > 0, save them to database =====
      console.log(`  ✅ Comment approved with ${pointsAwarded} points`);

      const { error: updateError } = await supabase
        .from("comments")
        .update({
          points_awarded: pointsAwarded,
          points_reason: reason,
          points_processed_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (updateError) {
        console.error(
          `  ❌ Failed to save points for ${commentId}:`,
          updateError,
        );
        throw updateError;
      }

      // Update user points
      try {
        const user = await UserModel.findById(userId);
        if (user) {
          const newPoints = (user.points || 0) + pointsAwarded;
          await UserModel.updatePoints(userId, newPoints);
          console.log(
            `  ✅ User points: +${pointsAwarded} → Total: ${newPoints}`,
          );

          // Create notification for points earned
          await NotificationService.createNotification({
            userId,
            type: "points_awarded",
            referenceId: commentId,
            message: `You earned +${pointsAwarded} points from your comment: "${commentContent.substring(0, 60)}${commentContent.length > 60 ? "..." : ""}"`,
            metadata: {
              points: pointsAwarded,
              reason: reason.substring(0, 100),
              commentId,
            },
          });
        }
      } catch (err) {
        console.error(`  ⚠️  Failed to update user points:`, err);
      }

      return {
        approved: true,
        reason: "points_validated",
        pointsAwarded,
      };
    } catch (error) {
      console.error(
        `❌ Immediate points validation failed for ${commentId}:`,
        error,
      );
      // Fail gracefully - allow comment if validation fails
      return {
        approved: true,
        reason: "validation_error_allowed",
        pointsAwarded: 0,
      };
    }
  },

  /**
   * TIER 2: Source validation after points are determined
   * Validate URLs in comment and reduce points by 30% if sources are invalid
   * Triggered after TIER 1 completes (if points > 0)
   *
   * @param {string} commentId - UUID of comment
   * @param {number} pointsAwarded - Points awarded in TIER 1
   * @param {string} commentContent - Comment text (may contain URLs)
   * @returns {Promise<{sourceValid: boolean, adjustment: number}>}
   */
  async validateSourcesAfterPoints(commentId, pointsAwarded, commentContent) {
    try {
      console.log(
        `🔗 [TIER 2] Validating sources: ${commentId} (${pointsAwarded} pts)`,
      );

      // Extract potential URLs from comment content
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = commentContent.match(urlRegex) || [];

      if (urls.length === 0) {
        console.log(`  ℹ️  No URLs found in comment`);
        return { sourceValid: true, adjustment: 0 };
      }

      console.log(`  🔍 Found ${urls.length} URL(s) to validate`);

      let pointAdjustment = 0;
      let flaggedUrls = [];
      let userId = null;

      // Get user ID for notifications
      try {
        const { data: comment } = await supabase
          .from("comments")
          .select("user_id")
          .eq("id", commentId)
          .single();
        userId = comment?.user_id;
      } catch (err) {
        console.error(`  ⚠️  Failed to fetch user_id:`, err);
      }

      // Validate each URL
      for (const url of urls) {
        try {
          const sourceValidation = await AIService.validateSource(
            commentId,
            url,
            commentContent,
          );

          const { is_credible, is_relevant, reason } = sourceValidation;

          console.log(
            `    📍 ${url.substring(0, 50)}... | Credible: ${is_credible} | Relevant: ${is_relevant}`,
          );

          // If source is not credible or not relevant
          if (!is_credible || !is_relevant) {
            flaggedUrls.push({
              url,
              credible: is_credible,
              relevant: is_relevant,
              reason,
            });

            // Reduce points by 30% for unreliable source
            const reduction = Math.floor(pointsAwarded * 0.3);
            pointAdjustment -= reduction;

            console.log(
              `    ⚠️  Invalid source. Reducing points by ${reduction}`,
            );
          }
        } catch (err) {
          console.error(`    ❌ Failed to validate URL:`, err);
          // On error, don't penalize
        }
      }

      // If points were reduced, update database and notify user
      if (pointAdjustment < 0) {
        const newPoints = Math.max(0, pointsAwarded + pointAdjustment);

        console.log(`  📉 Adjusting points: ${pointsAwarded} → ${newPoints}`);

        // Update points in database
        const { error: updateError } = await supabase
          .from("comments")
          .update({
            points_awarded: newPoints,
            points_reason: `Original: ${pointsAwarded} pts. Reduced by ${Math.abs(pointAdjustment)} due to invalid sources.`,
          })
          .eq("id", commentId);

        if (updateError) {
          console.error(`  ❌ Failed to update points:`, updateError);
        } else {
          console.log(`  ✅ Points updated in database`);

          // Update user points
          if (userId) {
            try {
              const user = await UserModel.findById(userId);
              if (user) {
                const adjustedUserPoints = Math.max(
                  0,
                  (user.points || 0) + pointAdjustment,
                );

                await UserModel.updatePoints(userId, adjustedUserPoints);

                console.log(
                  `  ✅ User points adjusted: ${Math.abs(pointAdjustment)} reduction`,
                );
              }
            } catch (err) {
              console.error(`  ⚠️  Failed to adjust user points:`, err);
            }

            // Notify user about source issues
            try {
              await NotificationService.createNotification({
                userId,
                type: "source_validation",
                referenceId: commentId,
                message: `Your comment's points were reduced by ${Math.abs(pointAdjustment)} due to ${flaggedUrls.length} invalid source(s).`,
                metadata: {
                  pointsReduced: Math.abs(pointAdjustment),
                  originalPoints: pointsAwarded,
                  newPoints,
                  flaggedUrlsCount: flaggedUrls.length,
                  flaggedUrls,
                },
              });
              console.log(`  ✅ User notified of point reduction`);
            } catch (notifErr) {
              console.error(`  ⚠️  Failed to notify user:`, notifErr);
            }
          }
        }

        return { sourceValid: false, adjustment: pointAdjustment };
      }

      console.log(`  ✅ All sources validated successfully`);
      return { sourceValid: true, adjustment: 0 };
    } catch (error) {
      console.error(
        `❌ Source validation failed for comment ${commentId}:`,
        error,
      );
      return { sourceValid: true, adjustment: 0 }; // Fail gracefully
    }
  },
};
