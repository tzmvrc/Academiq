import { CommentModel } from "../../models/comment_model.js";
import { getIO } from "../../middlewares/socket.js";
import { NotificationService } from "../../services/notification/notification_service.js";
import { ForumModel } from "../../models/forum_model.js";
import { UserModel } from "../../models/user_model.js";
import { ActivityService } from "../activity_service.js";
import { CommentVerificationService } from "./commentVerificationService.js";
import { CommentModerationService } from "./commentModerationService.js";
import { AchievementService } from "../achievement_service.js";
import { AIService } from "../ai/aiService.js";
import { supabase } from "../../database/supabase.js";

export const CommentsController = {
  // GET /api/forums/:id/comments
  async getCommentsByForumId(req, res) {
    try {
      const forumId = req.params.id;

      const { data, error } = await CommentModel.findByForumId(forumId);
      if (error) throw error;

      // Comments now include upvotes_count and downvotes_count from the database
      res.json({ comments: data });
    } catch (err) {
      console.error("Get Forum Comments Error:", err);
      res.status(500).json({ error: "Failed to fetch forum comments" });
    }
  },

  // GET /api/comments/:id
  async getCommentById(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await CommentModel.findById(id);
      if (error) throw error;

      res.json({ comment: data });
    } catch (err) {
      console.error("Get Comment Error:", err);
      res.status(404).json({ error: "Comment not found" });
    }
  },

  // GET /api/comments/users/me
  async getMyComments(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await CommentModel.findByUserId(userId);
      if (error) throw error;

      res.json({ comments: data });
    } catch (err) {
      console.error("Get My Comments Error:", err);
      res.status(500).json({ error: "Failed to fetch user comments" });
    }
  },

  // POST /api/forums/:id/comments
  async createComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const { content, parent_comment_id = null } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const payload = {
        forum_id: forumId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id,
      };

      const { data: created, error } = await CommentModel.create(payload);
      if (error) throw error;

      // Fetch the created comment with user info
      const { data: comment, error: fetchErr } = await CommentModel.findById(
        created.id,
      );
      if (fetchErr) throw fetchErr;

      // Fetch forum details for moderation and notifications
      const { data: forum } = await ForumModel.findById(forumId);

      // --- Invalidate forum cache: update updated_at ---
      await supabase
        .from("forums")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", forumId);

      // Fetch commenter's name
      const commenter = await UserModel.findById(userId);
      const commenterName = commenter?.name || "someone";

      // --- TIER 1: Trigger async point validation (immediate) - fire and forget ---
      // If points = 0, comment will be deleted and user notified
      if (forum) {
        CommentModerationService.validatePointsImmediately(
          comment.id,
          userId,
          forumId,
          forum.title,
          forum.content,
          comment.content,
        )
          .then((result) => {
            // TIER 2: If points > 0, validate sources AND verify comment
            if (result.approved && result.pointsAwarded > 0) {
              // Search for source URL
              CommentModerationService.validateSourcesAfterPoints(
                comment.id,
                result.pointsAwarded,
                comment.content,
              ).catch((err) =>
                console.error("Tier 2 source validation error:", err),
              );

              // Verify comment for authenticity (only if points > 0)
              CommentVerificationService.verifyCommentAsync(
                comment.id,
                forumId,
                comment.content,
              ).catch((err) =>
                console.error("Verification service error:", err),
              );
            }

            // --- Trigger achievement evaluation after comment approved ---
            AchievementService.triggerOnCommentCreated(userId).catch((err) =>
              console.error("Achievement evaluation error:", err),
            );
          })
          .catch((err) => console.error("Tier 1 moderation error:", err));
      }

      // --- Notifications ---
      if (parent_comment_id) {
        const { data: parentComment } =
          await CommentModel.findById(parent_comment_id);
        if (parentComment && parentComment.user_id !== userId) {
          await NotificationService.createNotification({
            userId: parentComment.user_id,
            type: "reply",
            referenceId: comment.id,
            message: `${commenterName} replied to your comment`,
            metadata: { commentId: comment.id, forumId },
          });
        }
      } else {
        if (forum && forum.user_id !== userId) {
          await NotificationService.createNotification({
            userId: forum.user_id,
            type: "reply",
            referenceId: comment.id,
            message: `${commenterName} commented on your forum "${forum.title.substring(0, 50)}"`,
            metadata: {
              forumTitle: forum.title,
              commentId: comment.id,
              forumId: forum.id,
            },
          });
        }

        ActivityService.logActivityAsync(userId, forumId, "comment", {
          title: forum?.title,
          tags: forum?.tags || [],
          subject: forum?.subject,
        }).catch((err) => console.error("Failed to log comment:", err));
      }

      const io = getIO();
      io.to(`post:${forumId}`).emit("comment_created", comment);

      // --- TRIGGER: Auto-summarize thread at milestones (5, 10, 15, 20 comments) ---
      try {
        const { data: updatedForum } =
          await ForumModel.findByIdUnfiltered(forumId);
        const commentCount = updatedForum?.comments_count || 0;
        const milestones = [5, 10, 15, 20];

        if (milestones.includes(commentCount)) {
          console.log(
            `📊 Comment milestone reached: ${commentCount} comments for forum ${forumId}`,
          );

          // Fire and forget - don't block comment creation
          setImmediate(async () => {
            try {
              // Fetch all comments for this forum
              const { data: allComments } =
                await CommentModel.findByForumId(forumId);
              const commentTexts = (allComments || []).map((c) => c.content);

              if (commentTexts.length > 0) {
                // Call AI to summarize
                const summaryResult =
                  await AIService.summarizeThread(commentTexts);
                const summary = summaryResult.summary || "";

                // Update forum with summary
                await supabase
                  .from("forums")
                  .update({ ai_summary: summary })
                  .eq("id", forumId);

                console.log(
                  `✅ Forum summary updated at ${commentCount} comments`,
                );

                // Notify forum author about summary
                try {
                  const forumAuthorId = updatedForum?.user_id;
                  if (forumAuthorId) {
                    const summaryPreview = summary
                      .substring(0, 100)
                      .replace(/"/g, "'");

                    await NotificationService.createNotification({
                      userId: forumAuthorId,
                      type: "ai_summary_ready",
                      referenceId: forumId,
                      message: `Your forum has reached ${commentCount} comments! AI summary is now available.`,
                      metadata: {
                        forumId,
                        commentCount,
                        summaryPreview,
                      },
                    });

                    console.log(
                      `📬 Summary notification sent to forum author ${forumAuthorId}`,
                    );
                  }
                } catch (notifErr) {
                  console.error(
                    `⚠️  Failed to send summary notification:`,
                    notifErr,
                  );
                }

                // Emit summary update event
                io.to(`post:${forumId}`).emit("forum_summarized", {
                  forumId,
                  commentCount,
                  summary,
                });
              }
            } catch (err) {
              console.error(`⚠️  Error summarizing forum at milestone:`, err);
              // Don't throw - summarization failure shouldn't block anything
            }
          });
        }
      } catch (err) {
        console.error(`⚠️  Error checking milestone for summarization:`, err);
      }

      res.status(201).json({ comment });
    } catch (err) {
      console.error("Create Comment Error:", err);
      res.status(500).json({ error: "Failed to create comment" });
    }
  },

  // PUT /api/comments/:id
  async updateComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Fetch the original comment before updating
      const { data: originalComment, error: fetchErr } =
        await CommentModel.findById(id);
      if (fetchErr || !originalComment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Check authorization - only author can edit
      if (originalComment.user_id !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this comment" });
      }

      // Fetch forum for moderation context
      const { data: forum } = await ForumModel.findById(
        originalComment.forum_id,
      );

      // --- AI REGRADING: Validate edited content ---
      let regradingResult;
      try {
        console.log(`📝 Regrading comment ${id}...`);
        console.log(`   Old points: ${originalComment.points_awarded || 0}`);

        regradingResult =
          await CommentModerationService.validatePointsImmediately(
            id,
            userId,
            originalComment.forum_id,
            forum?.title || "Unknown",
            forum?.content || "No content",
            content.trim(),
          );

        console.log(
          `   New points from AI: ${regradingResult.pointsAwarded || 0}`,
        );
      } catch (err) {
        console.error("❌ Regrading validation error:", err);
        // If AI fails, allow update but don't regrade
        regradingResult = {
          approved: true,
          pointsAwarded: originalComment.points_awarded || 0,
        };
        console.log(
          `   Using original points due to error: ${regradingResult.pointsAwarded}`,
        );
      }

      // If regrading rejected, don't allow update
      if (!regradingResult.approved) {
        return res.status(422).json({
          error: "Your edited comment was rejected by AI validation",
          reason:
            regradingResult.reason || "Content does not meet quality standards",
          currentContent: originalComment.content,
        });
      }

      // Update only the content field
      const { data: updatedComment, error: updateErr } =
        await CommentModel.update(id, {
          content: content.trim(),
          updated_at: new Date().toISOString(),
        });
      if (updateErr) throw updateErr;

      // --- POINTS REGRADING: ALWAYS subtract old first, then add new ---
      const { data: user } = await UserModel.findById(userId);
      const oldPointsAwarded = originalComment.points_awarded || 0;
      const newPointsAwarded = regradingResult.pointsAwarded || 0;
      const pointsDifference = newPointsAwarded - oldPointsAwarded;

      console.log(`💰 Point calculation for comment ${id}:`);
      console.log(
        `   Old: ${oldPointsAwarded}, New: ${newPointsAwarded}, Difference: ${pointsDifference}`,
      );

      // ALWAYS update user points: subtract old, then add new
      let userCurrentPoints = user?.points || 0;
      let calculatedPoints = Math.max(
        0,
        userCurrentPoints - oldPointsAwarded + newPointsAwarded,
      );

      console.log(
        `   User points: ${userCurrentPoints} - ${oldPointsAwarded} + ${newPointsAwarded} = ${calculatedPoints}`,
      );

      // Update comment points_awarded in database
      await supabase
        .from("comments")
        .update({ points_awarded: newPointsAwarded })
        .eq("id", id);

      // Update user points in database
      const { error: updateUserErr } = await supabase
        .from("users")
        .update({ points: calculatedPoints })
        .eq("id", userId);

      if (!updateUserErr && pointsDifference !== 0) {
        // Notify user only if points changed
        const pointChange =
          pointsDifference > 0
            ? `+${pointsDifference}`
            : String(pointsDifference);
        await NotificationService.createNotification({
          userId,
          type: "points_adjusted",
          referenceId: id,
          message: `Your comment points were recalculated: ${pointChange} points. New total: ${calculatedPoints} points (edited: "${content.substring(0, 60)}${content.length > 60 ? "..." : ""}")`,
          metadata: {
            points: pointsDifference,
            newTotal: calculatedPoints,
            commentId: id,
          },
        });
      }

      // Special case: If AI rejects (0 points), delete the comment
      if (newPointsAwarded === 0) {
        await CommentModel.delete(id);

        console.log(`❌ Comment ${id} REJECTED and DELETED`);
        console.log(
          `   Points already deducted: ${oldPointsAwarded}. New user total: ${calculatedPoints}`,
        );

        // Notify about rejection
        const deductionMessage =
          oldPointsAwarded > 0
            ? `-${oldPointsAwarded} points deducted. New total: ${calculatedPoints} points`
            : "No points were awarded for this comment.";

        await NotificationService.createNotification({
          userId,
          type: "comment_rejected",
          referenceId: id,
          message: `Your edited comment was rejected by AI validation. ${deductionMessage}`,
          metadata: {
            points: -oldPointsAwarded,
            newTotal: calculatedPoints,
            commentId: id,
          },
        });

        // Invalidate forum cache
        await supabase
          .from("forums")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", originalComment.forum_id);

        // Emit deletion event
        const io = getIO();
        io.to(`post:${originalComment.forum_id}`).emit("comment_deleted", {
          commentId: id,
          forumId: originalComment.forum_id,
          reason: "AI validation rejected after edit",
          pointsDeducted: oldPointsAwarded,
        });

        return res.json({
          message: "Comment rejected by AI validation and deleted",
          pointsDeducted: oldPointsAwarded,
        });
      }

      // Fetch the final updated comment
      const { data: finalComment, error: finalFetchErr } =
        await CommentModel.findById(id);
      if (finalFetchErr) throw finalFetchErr;

      // --- Invalidate forum cache ---
      await supabase
        .from("forums")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", originalComment.forum_id);

      // Emit real-time event with updated points
      const io = getIO();
      io.to(`post:${originalComment.forum_id}`).emit(
        "comment_updated",
        finalComment,
      );

      res.json({ comment: finalComment });
    } catch (err) {
      console.error("Update Comment Error:", err);
      res.status(500).json({ error: "Failed to update comment" });
    }
  },

  // DELETE /api/comments/:id
  async deleteComment(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;

      // Fetch comment first to get forum_id, user_id, and points_awarded
      const { data: comment, error: fetchErr } =
        await CommentModel.findById(id);
      if (fetchErr || !comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Check authorization - only author can delete
      if (comment.user_id !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this comment" });
      }

      // Get the comment's points to deduct
      const pointsToDeduct = comment.points_awarded || 0;

      // Deduct points before deletion (only if there are points to deduct)
      if (pointsToDeduct > 0) {
        try {
          // Fetch current user
          const user = await UserModel.findById(userId);

          if (!user) {
            console.error(`  ⚠️  Failed to fetch user for points deduction`);
          } else {
            // Get user's current points (ensure it's a number)
            const currentUserPoints = user.points || 0;
            // Subtract only this comment's points
            const newUserPoints = Math.max(
              0,
              currentUserPoints - pointsToDeduct,
            );

            console.log(
              `  💰 Deducting points: current=${currentUserPoints}, deducting=${pointsToDeduct}, new=${newUserPoints}`,
            );

            // Update user points
            const { error: updateUserErr } = await supabase
              .from("users")
              .update({ points: newUserPoints })
              .eq("id", userId);

            if (updateUserErr) {
              console.error(`  ❌ Failed to deduct points:`, updateUserErr);
            } else {
              // Notify user about point deduction
              await NotificationService.createNotification({
                userId,
                type: "points_deducted",
                referenceId: id,
                message: `You deleted a comment. -${pointsToDeduct} points deducted. New total: ${newUserPoints} points`,
                metadata: {
                  points: pointsToDeduct,
                  newTotal: newUserPoints,
                  commentId: id,
                },
              });
            }
          }
        } catch (err) {
          console.error(`  ⚠️  Error deducting points:`, err);
          // Don't block comment deletion if points deduction fails
        }
      }

      // Delete the comment
      const { error } = await CommentModel.delete(id);
      if (error) throw error;

      // --- Invalidate forum cache: update the forum's updated_at ---
      await supabase
        .from("forums")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", comment.forum_id);

      // Emit real-time event
      const io = getIO();
      io.to(`post:${comment.forum_id}`).emit("comment_deleted", {
        commentId: id,
        forumId: comment.forum_id,
        pointsDeducted: pointsToDeduct,
      });

      res.json({
        message: "Comment deleted successfully",
        pointsDeducted: pointsToDeduct,
      });
    } catch (err) {
      console.error("Delete Comment Error:", err);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  },
};
