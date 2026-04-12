import { supabase } from "../database/supabase.js";
import { NotificationService } from "./notification/notification_service.js";

/**
 * Achievement Service - Evaluates and unlocks user achievements
 * Triggered on: post creation, comment creation, upvote received, verification confirmed, follower added
 * Prevents duplicate unlocking by checking user_achievements table
 */
export const AchievementService = {
  /**
   * Evaluate user achievements after an action
   * @param {string} userId - User ID to evaluate
   * @param {string} triggerType - Type of action that triggered evaluation
   * @returns {Promise<Array>} - Array of newly unlocked achievement IDs
   */
  async evaluateAchievements(userId, triggerType = "generic") {
    try {
      const unlockedAchievements = [];

      // Fetch all achievements from database
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*");

      if (achievementsError) throw achievementsError;
      if (!allAchievements || allAchievements.length === 0)
        return unlockedAchievements;

      // Fetch user stats
      const userStats = await this.getUserStats(userId);

      // Fetch already unlocked achievements for this user
      const { data: unlockedList, error: unlockedError } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      if (unlockedError) throw unlockedError;
      const unlockedAchievementIds = new Set(
        unlockedList?.map((ua) => ua.achievement_id) || [],
      );

      // Check each achievement
      for (const achievement of allAchievements) {
        // Skip if already unlocked
        if (unlockedAchievementIds.has(achievement.id)) continue;

        // Check if criteria is met
        const isMet = this.checkAchievementCriteria(
          achievement,
          userStats,
          triggerType,
        );

        if (isMet) {
          // Unlock achievement
          const { error: unlockError } = await supabase
            .from("user_achievements")
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
              unlocked_at: new Date().toISOString(),
            });

          if (!unlockError) {
            unlockedAchievements.push({
              id: achievement.id,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              points: achievement.points,
            });

            // Award points from achievement
            if (achievement.points > 0) {
              const { data: user } = await supabase
                .from("users")
                .select("points")
                .eq("id", userId)
                .single();

              const newPoints = (user?.points || 0) + achievement.points;
              await supabase
                .from("users")
                .update({ points: newPoints })
                .eq("id", userId);
            }

            // Notify user about achievement unlock
            await NotificationService.createNotification({
              userId,
              type: "achievement_unlocked",
              referenceId: achievement.id,
              message: `🎉 You unlocked achievement: "${achievement.name}"${achievement.points ? ` (+${achievement.points} points)` : ""}`,
              metadata: {
                achievementId: achievement.id,
                achievementName: achievement.name,
                pointsAwarded: achievement.points,
              },
            });
          }
        }
      }

      return unlockedAchievements;
    } catch (err) {
      console.error("Achievement evaluation error:", err);
      return [];
    }
  },

  /**
   * Get comprehensive user statistics for achievement evaluation
   * @param {string} userId - User ID to get stats for
   * @returns {Promise<Object>} - User statistics object
   */
  async getUserStats(userId) {
    const stats = {
      totalPosts: 0,
      totalCommentsMade: 0,
      verifiedAnswersGiven: 0,
      totalUpvotesReceived: 0,
      totalDownvotesReceived: 0,
      totalCommentsReceived: 0,
      totalInteractionsReceived: 0,
      upvotesGiven: 0,
      totalDocuments: 0,
      timesFeatured: 0,
      totalActivityDays: 0,
      commentsSinceJoin: 0,
      distinctSubjectsCommented: 0,
      distinctSubjectsPosted: 0,
      distinctTagsUsed: 0,
      weekendPosts: 0,
      followersCount: 0,
      followingCount: 0,
      schoolFollowersCount: 0,
      totalSaves: 0,
      aiVerifiedPosts: 0,
      userSchool: null,
      schoolRank: null,
    };

    try {
      // Get user school for school-based stats
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("school")
        .eq("id", userId)
        .single();

      if (!userError && userData) {
        stats.userSchool = userData.school;
      }

      // Total posts created
      const { data: postsData, error: postsError } = await supabase
        .from("forums")
        .select("id, created_at, document_url, ai_summary")
        .eq("user_id", userId);

      if (!postsError && postsData) {
        stats.totalPosts = postsData.length;
        // Count documents
        stats.totalDocuments = postsData.filter((p) => p.document_url).length;
        // Count AI verified posts
        stats.aiVerifiedPosts = postsData.filter((p) => p.ai_summary).length;
        // Count weekend posts
        stats.weekendPosts = postsData.filter((p) => {
          const date = new Date(p.created_at);
          const day = date.getDay();
          return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
        }).length;
      }

      // Total comments made
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, forum_id")
        .eq("user_id", userId);

      if (!commentsError && commentsData) {
        stats.totalCommentsMade = commentsData.length;
      }

      // Verified comments (is_ai_verified = true)
      const { data: verifiedData, error: verifiedError } = await supabase
        .from("comments")
        .select("id")
        .eq("user_id", userId)
        .eq("is_ai_verified", true);

      if (!verifiedError && verifiedData) {
        stats.verifiedAnswersGiven = verifiedData.length;
      }

      // Total upvotes received (on user's comments and posts)
      const { data: upvotesData, error: upvotesError } = await supabase.rpc(
        "get_user_upvotes_received",
        { p_user_id: userId },
      );

      if (!upvotesError && upvotesData) {
        stats.totalUpvotesReceived = upvotesData[0]?.upvote_count || 0;
      }

      // Total comments received on user's posts
      const { data: commentsReceivedData, error: commentsReceivedError } =
        await supabase
          .from("comments")
          .select("id", { count: "exact" })
          .in(
            "forum_id",
            (postsData || []).map((p) => p.id),
          );

      if (!commentsReceivedError && commentsReceivedData) {
        stats.totalCommentsReceived = commentsReceivedData.length || 0;
      }

      // Total interactions received (upvotes + comments)
      stats.totalInteractionsReceived =
        stats.totalUpvotesReceived + stats.totalCommentsReceived;

      // Upvotes given by user
      const { data: upvotesGivenData, error: upvotesGivenError } =
        await supabase
          .from("post_votes")
          .select("id", { count: "exact" })
          .eq("user_id", userId)
          .eq("vote_type", 1);

      if (!upvotesGivenError && upvotesGivenData) {
        stats.upvotesGiven = upvotesGivenData.length || 0;
      }

      // Times featured (assuming featured flag in forums table)
      const { data: featuredData, error: featuredError } = await supabase
        .from("forums")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .eq("is_featured", true);

      if (!featuredError && featuredData) {
        stats.timesFeatured = featuredData.length || 0;
      }

      // Distinct tags used
      const { data: tagsData, error: tagsError } = await supabase
        .from("forum_tags")
        .select("tag_id", { count: "exact" })
        .in(
          "forum_id",
          (postsData || []).map((p) => p.id),
        );

      if (!tagsError && tagsData) {
        // Get unique tag count
        const { data: uniqueTagsData } = await supabase
          .from("forum_tags")
          .select("tag_id", { count: "exact" })
          .in(
            "forum_id",
            (postsData || []).map((p) => p.id),
          );
        const uniqueTags = new Set((uniqueTagsData || []).map((t) => t.tag_id));
        stats.distinctTagsUsed = uniqueTags.size;
      }

      // Followers count
      const { data: followersData, error: followersError } = await supabase
        .from("peers")
        .select("id")
        .eq("following_id", userId);

      if (!followersError && followersData) {
        stats.followersCount = followersData.length;
      }

      // Following count
      const { data: followingData, error: followingError } = await supabase
        .from("peers")
        .select("id")
        .eq("follower_id", userId);

      if (!followingError && followingData) {
        stats.followingCount = followingData.length;
      }

      // School followers (followers from same school)
      if (stats.userSchool) {
        const { data: schoolFollowersData, error: schoolFollowersError } =
          await supabase
            .from("peers")
            .select("follower:follower_id(school)")
            .eq("following_id", userId);

        if (
          !schoolFollowersError &&
          schoolFollowersData &&
          Array.isArray(schoolFollowersData)
        ) {
          const followers = schoolFollowersData.filter(
            (p) => p.follower?.school === stats.userSchool,
          );
          stats.schoolFollowersCount = followers.length;
        }
      }

      // Total saves (bookmarks by user)
      const { data: savesData, error: savesError } = await supabase
        .from("forum_saves")
        .select("id", { count: "exact" })
        .eq("user_id", userId);

      if (!savesError && savesData) {
        stats.totalSaves = savesData.length || 0;
      }

      // Distinct subjects commented on
      const { data: subjectsCommentedData, error: subjectsCommentedError } =
        await supabase.rpc("get_user_distinct_subjects", { p_user_id: userId });

      if (!subjectsCommentedError && subjectsCommentedData) {
        stats.distinctSubjectsCommented =
          subjectsCommentedData[0]?.subject_count || 0;
      }

      // Distinct subjects posted on
      const { data: subjectsPostedData, error: subjectsPostedError } =
        await supabase
          .from("forums")
          .select("subject")
          .eq("user_id", userId)
          .not("subject", "is", null);

      if (!subjectsPostedError && subjectsPostedData) {
        stats.distinctSubjectsPosted = new Set(
          subjectsPostedData.map((f) => f.subject),
        ).size;
      }

      // School rank (calculate based on points in user's school)
      if (stats.userSchool) {
        const { data: schoolUsersData, error: schoolUsersError } =
          await supabase
            .from("users")
            .select("id, points")
            .eq("school", stats.userSchool)
            .order("points", { ascending: false });

        if (!schoolUsersError && schoolUsersData) {
          const rank = schoolUsersData.findIndex((u) => u.id === userId) + 1;
          stats.schoolRank = rank > 0 ? rank : null;
        }
      }

      // Total activity days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: activityDaysData, error: activityDaysError } =
        await supabase
          .from("comments")
          .select("created_at")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo.toISOString());

      if (!activityDaysError && activityDaysData) {
        const uniqueDays = new Set(
          (activityDaysData || []).map((c) =>
            new Date(c.created_at).toDateString(),
          ),
        );
        stats.totalActivityDays = uniqueDays.size;
      }
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }

    return stats;
  },

  /**
   * Check if a single achievement criteria is met
   * @param {Object} achievement - Achievement object from database
   * @param {Object} userStats - User statistics
   * @param {string} triggerType - Type of action that triggered evaluation
   * @returns {boolean} - True if criteria is met
   */
  checkAchievementCriteria(achievement, userStats, triggerType) {
    const { criteria_type, criteria_target } = achievement;

    switch (criteria_type) {
      case "total_posts":
        return userStats.totalPosts >= criteria_target;

      case "total_comments_made":
        return userStats.totalCommentsMade >= criteria_target;

      case "total_comments_received":
        return userStats.totalCommentsReceived >= criteria_target;

      case "verified_answers_given":
        return userStats.verifiedAnswersGiven >= criteria_target;

      case "total_upvotes_received":
        return userStats.totalUpvotesReceived >= criteria_target;

      case "total_downvotes_received":
        return userStats.totalDownvotesReceived >= criteria_target;

      case "total_interactions_received":
        return userStats.totalInteractionsReceived >= criteria_target;

      case "upvotes_given":
        return userStats.upvotesGiven >= criteria_target;

      case "total_documents":
        return userStats.totalDocuments >= criteria_target;

      case "times_featured":
        return userStats.timesFeatured >= criteria_target;

      case "distinct_subjects":
        return (
          userStats.distinctSubjectsCommented +
            userStats.distinctSubjectsPosted >=
          criteria_target
        );

      case "distinct_tags_used":
        return userStats.distinctTagsUsed >= criteria_target;

      case "weekend_posts":
        return userStats.weekendPosts >= criteria_target;

      case "active_days":
        return userStats.totalActivityDays >= criteria_target;

      case "followers_reach":
        return userStats.followersCount >= criteria_target;

      case "following_reach":
        return userStats.followingCount >= criteria_target;

      case "school_followers":
        return userStats.schoolFollowersCount >= criteria_target;

      case "school_rank":
        return (
          userStats.schoolRank !== null &&
          userStats.schoolRank <= criteria_target
        );

      case "total_saves":
        return userStats.totalSaves >= criteria_target;

      case "ai_verified_posts":
        return userStats.aiVerifiedPosts >= criteria_target;

      case "total_activity_days":
        return userStats.totalActivityDays >= criteria_target;

      case "trigger_action":
        // Achievements triggered by specific actions (e.g., first comment, first post)
        return triggerType === criteria_target;

      default:
        return false;
    }
  },

  /**
   * Trigger achievement evaluation after comment creation
   * @param {string} userId - Comment author ID
   */
  async triggerOnCommentCreated(userId) {
    await this.evaluateAchievements(userId, "comment_created");
  },

  /**
   * Trigger achievement evaluation after post creation
   * @param {string} userId - Post author ID
   */
  async triggerOnPostCreated(userId) {
    await this.evaluateAchievements(userId, "post_created");
  },

  /**
   * Trigger achievement evaluation after upvote received
   * @param {string} userId - User who received the upvote (content author)
   */
  async triggerOnUpvoteReceived(userId) {
    await this.evaluateAchievements(userId, "upvote_received");
  },

  /**
   * Trigger achievement evaluation after comment verification
   * @param {string} userId - Comment author ID (who got verified)
   */
  async triggerOnVerificationConfirmed(userId) {
    await this.evaluateAchievements(userId, "verification_confirmed");
  },

  /**
   * Trigger achievement evaluation after follower added
   * @param {string} userId - User who was followed
   */
  async triggerOnFollowerAdded(userId) {
    await this.evaluateAchievements(userId, "follower_added");
  },

  /**
   * Trigger achievement evaluation after user upvotes something
   * @param {string} userId - User who gave the upvote
   */
  async triggerOnUpvoteGiven(userId) {
    await this.evaluateAchievements(userId, "upvote_given");
  },

  /**
   * Trigger achievement evaluation after user saves forum
   * @param {string} userId - User who saved the forum
   */
  async triggerOnForumSaved(userId) {
    await this.evaluateAchievements(userId, "forum_saved");
  },

  /**
   * Trigger achievement evaluation when forum is featured
   * @param {string} userId - Forum author ID
   */
  async triggerOnFeatured(userId) {
    await this.evaluateAchievements(userId, "forum_featured");
  },

  /**
   * Trigger achievement evaluation for forum activity
   * @param {string} userId - Forum author ID
   */
  async triggerOnForumActivity(userId) {
    await this.evaluateAchievements(userId, "forum_activity");
  },
};
