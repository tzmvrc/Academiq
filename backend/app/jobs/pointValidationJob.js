import cron from "node-cron";
import { supabase } from "../database/supabase.js";
import { AIService } from "../services/ai/aiService.js";
import { NotificationService } from "../services/notification/notification_service.js";
import { UserModel } from "../models/user_model.js";

/**
 * Point Validation Scheduler Job
 *
 * Runs every 1 hour and:
 * 1. Fetches comments where points_processed_at IS NULL (not yet graded)
 * 2. Calls AI service to validate points
 * 3. Saves points, reason, and marks as processed
 * 4. Updates user points balance
 * 5. Notifies user
 */

class PointValidationJob {
  constructor() {
    this.isRunning = false;
    this.task = null;
  }

  /**
   * Start the scheduled job (every 1 hour)
   */
  start() {
    // Run every hour at minute 0 (0 * * * *)
    this.task = cron.schedule("0 * * * *", async () => {
      try {
        if (this.isRunning) {
          console.log(
            "⏭️  Point validation already running, skipping this cycle",
          );
          return;
        }

        this.isRunning = true;
        console.log(
          `\n⏰ [${new Date().toISOString()}] Starting point validation job...`,
        );

        await this.processUngraduatedComments();

        console.log("✅ Point validation job completed\n");
      } catch (error) {
        console.error("❌ Point validation job error:", error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log(
      "✅ Point validation scheduler started (runs every 1 hour at :00)",
    );
  }

  /**
   * Fetch and process all ungraded comments
   */
  async processUngraduatedComments() {
    try {
      // Fetch all comments where points_processed_at IS NULL
      const { data: comments, error } = await supabase
        .from("comments")
        .select("id, user_id, forum_id, content, created_at")
        .is("points_processed_at", null)
        .limit(100); // Process max 100 per cycle to avoid overload

      if (error) {
        console.error("❌ Failed to fetch ungraded comments:", error);
        return;
      }

      if (!comments || comments.length === 0) {
        console.log("ℹ️  No ungraded comments found");
        return;
      }

      console.log(
        `📝 Found ${comments.length} ungraded comments. Processing...`,
      );

      // Get subject mapping for all forums
      const forumIds = [...new Set(comments.map((c) => c.forum_id))];
      const { data: forums } = await supabase
        .from("forums")
        .select("id, subject_id")
        .in("id", forumIds);

      const forumSubjectMap = {};
      forums?.forEach((f) => {
        forumSubjectMap[f.id] = f.subject_id;
      });

      // Get subject names
      const subjectIds = [...new Set(Object.values(forumSubjectMap))];
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds);

      const subjectNameMap = {};
      subjects?.forEach((s) => {
        subjectNameMap[s.id] = s.name;
      });

      // Process each comment
      for (const comment of comments) {
        try {
          await this.gradeComment(comment, forumSubjectMap, subjectNameMap);
        } catch (err) {
          console.error(`⚠️  Failed to grade comment ${comment.id}:`, err);
          // Continue with next comment
        }
      }

      console.log(`✅ Processed ${comments.length} comments`);
    } catch (error) {
      console.error("❌ Error processing graduated comments:", error);
    }
  }

  /**
   * Grade a single comment via AI and save results
   */
  async gradeComment(comment, forumSubjectMap, subjectNameMap) {
    const {
      id: commentId,
      user_id: userId,
      forum_id: forumId,
      content,
    } = comment;

    console.log(`  🔄 Grading comment ${commentId}...`);

    try {
      // Fetch forum details
      const { data: forum, error: forumError } = await supabase
        .from("forums")
        .select("title, content")
        .eq("id", forumId)
        .single();

      if (forumError || !forum) {
        console.error(`  ❌ Failed to fetch forum ${forumId}:`, forumError);
        throw new Error(`Forum not found: ${forumId}`);
      }

      // Fetch existing comments for this forum
      const { data: existingComments, error: commentsError } = await supabase
        .from("comments")
        .select("content")
        .eq("forum_id", forumId)
        .neq("id", commentId) // Exclude current comment
        .order("created_at", { ascending: false })
        .limit(10); // Last 10 comments

      if (commentsError) {
        console.error(
          `  ⚠️  Failed to fetch existing comments: ${commentsError.message}`,
        );
      }

      const existingCommentTexts = existingComments
        ? existingComments.map((c) => c.content)
        : [];

      // Call AI service to validate points with correct parameters
      const validationResult = await AIService.validatePoints(
        commentId,
        forum.title,
        forum.content,
        content,
        existingCommentTexts,
        null, // No thread summary for now
      );

      const {
        awarded_points: points,
        reason,
        is_related,
        is_duplicate,
      } = validationResult;

      // Extract points from response (ensure it's an integer 0-10)
      const pointsToAward = Math.max(0, Math.min(10, parseInt(points) || 0));

      // Save validation result to database
      const { error: updateError } = await supabase
        .from("comments")
        .update({
          points_awarded: pointsToAward,
          points_reason: reason,
          points_processed_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (updateError) {
        console.error(
          `  ❌ Failed to save points for comment ${commentId}:`,
          updateError,
        );
        throw updateError;
      }

      console.log(`  ✅ Comment graded with ${pointsToAward} points`);

      // Update user points (idempotent - only added once when initial points_awarded is 0)
      if (pointsToAward > 0) {
        try {
          const user = await UserModel.findById(userId);
          if (user) {
            const newPoints = (user.points || 0) + pointsToAward;
            await UserModel.updatePoints(userId, newPoints);
            console.log(
              `  ✅ User ${userId} now has ${newPoints} total points`,
            );

            // Notify user
            try {
              await NotificationService.createNotification({
                userId,
                type: "points_awarded",
                referenceId: commentId,
                message: `You gained +${pointsToAward} points on your comment`,
                metadata: {
                  points: pointsToAward,
                  reason: reason.substring(0, 100), // Truncate for UI
                },
              });
            } catch (notifErr) {
              console.error("  ⚠️  Failed to create notification:", notifErr);
              // Don't throw - continue processing
            }
          }
        } catch (err) {
          console.error(`  ⚠️  Failed to update user points:`, err);
          // Don't throw - comment was already graded
        }
      }
    } catch (error) {
      console.error(`  ❌ Error grading comment ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      console.log("⏹️  Point validation scheduler stopped");
    }
  }
}

export const pointValidationJob = new PointValidationJob();
