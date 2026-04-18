import { io } from "socket.io";

/**
 * RealtimeFeedService: Manages realtime feed updates via WebSockets
 * Emits events when new forums are published to notify connected clients
 */

export const RealtimeFeedService = {
  /**
   * Initialize realtime feed updates
   * Should be called from the socket setup in server.js
   */
  initializeRealtimeFeed(socketServer) {
    console.log("🔌 Setting up realtime feed service...");

    socketServer.on("connection", (socket) => {
      const userId = socket.user?.id;
      console.log(`✅ User ${userId} connected to realtime feed`);

      // Join user to a personal room for feed updates
      if (userId) {
        socket.join(`feed:${userId}`);
        socket.emit("feed:ready", {
          message: "You are connected to realtime updates",
        });
      }

      // Listen for cleanup on disconnect
      socket.on("disconnect", () => {
        if (userId) {
          console.log(`🚪 User ${userId} disconnected from realtime feed`);
        }
      });
    });
  },

  /**
   * Emit new forum published event to users
   * Triggers realtime boost in their feed
   */
  emitNewForumPublished(socketServer, forumData) {
    if (!socketServer) {
      console.warn(
        "⚠️ Socket server not available, skipping realtime broadcast",
      );
      return;
    }

    const {
      id: forumId,
      title,
      subject_id: subjectId,
      user_id: authorId,
      is_ai_verified: isAiVerified,
    } = forumData;

    console.log(`📢 Broadcasting new forum published: ${forumId} (${title})`);

    // Broadcast to all connected clients
    socketServer.emit("feed:forumPublished", {
      forumId,
      title,
      subjectId,
      authorId,
      isAiVerified,
      timestamp: new Date().toISOString(),
    });

    // Also emit to specific subject room for subject-focused feeds
    socketServer.to(`subject:${subjectId}`).emit("feed:subjectForumPublished", {
      forumId,
      title,
      authorId,
      isAiVerified,
      timestamp: new Date().toISOString(),
    });

    // Emit to author's followers
    socketServer.to(`followers:${authorId}`).emit("feed:authorForumPublished", {
      forumId,
      title,
      subjectId,
      authorId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Emit forum engagement update (votes, comments)
   * Moves forum up in feed if significant engagement
   */
  emitForumEngagementUpdated(socketServer, forumId, engagementData) {
    if (!socketServer) return;

    const { upvotes, downvotes, commentCount, trending } = engagementData;

    console.log(
      `⭐ Forum ${forumId} engagement updated: ${upvotes} upvotes, ${commentCount} comments`,
    );

    socketServer.emit("feed:engagementUpdated", {
      forumId,
      upvotes,
      downvotes,
      commentCount,
      trending, // boolean indicating if forum is now trending
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Emit forum verification event
   * New AI-verified forums get priority in feed
   */
  emitForumVerified(socketServer, forumId, verificationData) {
    if (!socketServer) return;

    const {
      subject_id: subjectId,
      is_valid: isValid,
      confidence,
    } = verificationData;

    console.log(`✅ Forum ${forumId} verified (confidence: ${confidence})`);

    socketServer.emit("feed:forumVerified", {
      forumId,
      subjectId,
      isValid,
      confidence,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Notify specific user that their vector has been updated
   * Triggers feed refresh with new personalization
   */
  notifyVectorUpdated(socketServer, userId) {
    if (!socketServer) return;

    console.log(`🧠 Notifying user ${userId} of vector update`);

    socketServer.to(`feed:${userId}`).emit("feed:vectorUpdated", {
      message: "Your interest profile has been updated",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Notify user of trending content in their interest areas
   * Proactive notification for content they might like
   */
  notifyTrendingContent(socketServer, userId, forumId, reason) {
    if (!socketServer) return;

    console.log(`🔥 Notifying user ${userId} of trending content: ${forumId}`);

    socketServer.to(`feed:${userId}`).emit("feed:trendingContent", {
      forumId,
      reason, // "high_engagement", "vector_match", etc.
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Client subscribes to specific subject updates
   */
  subscribeToSubject(socket, subjectId) {
    socket.join(`subject:${subjectId}`);
    console.log(`👁️ User subscribed to subject: ${subjectId}`);
  },

  /**
   * Client unsubscribes from specific subject
   */
  unsubscribeFromSubject(socket, subjectId) {
    socket.leave(`subject:${subjectId}`);
    console.log(`👋 User unsubscribed from subject: ${subjectId}`);
  },

  /**
   * Subscribe to user's followers updates
   */
  subscribeToUser(socket, userId) {
    socket.join(`followers:${userId}`);
    console.log(`👁️ User subscribed to user updates: ${userId}`);
  },

  /**
   * Unsubscribe from user's followers updates
   */
  unsubscribeFromUser(socket, userId) {
    socket.leave(`followers:${userId}`);
    console.log(`👋 User unsubscribed from user updates: ${userId}`);
  },
};
