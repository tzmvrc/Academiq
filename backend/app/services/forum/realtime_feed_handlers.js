import { RealtimeFeedService } from "./realtime_feed_service.js";

/**
 * Socket Event Handlers for Realtime Feed
 * Registers socket handlers that respond to client requests
 * and update subscriptions for realtime feed events
 */

export const initializeRealtimeFeedHandlers = (socketServer) => {
  // Initialize the realtime feed service with socket server
  RealtimeFeedService.initializeRealtimeFeed(socketServer);

  console.log("✅ Realtime feed handlers initialized");

  // Handle client subscriptions
  socketServer.on("connection", (socket) => {
    const userId = socket.user?.id;

    // Subscribe to specific subject
    socket.on("feed:subscribeSubject", ({ subjectId }) => {
      if (!subjectId) {
        console.warn("⚠️ Missing subjectId for subscription");
        return;
      }
      RealtimeFeedService.subscribeToSubject(socket, subjectId);
      socket.emit("feed:subscriptionConfirmed", {
        type: "subject",
        subjectId,
      });
    });

    // Unsubscribe from specific subject
    socket.on("feed:unsubscribeSubject", ({ subjectId }) => {
      if (!subjectId) {
        console.warn("⚠️ Missing subjectId for unsubscription");
        return;
      }
      RealtimeFeedService.unsubscribeFromSubject(socket, subjectId);
      socket.emit("feed:unsubscriptionConfirmed", {
        type: "subject",
        subjectId,
      });
    });

    // Subscribe to specific user's updates
    socket.on("feed:subscribeUser", ({ userId: targetUserId }) => {
      if (!targetUserId) {
        console.warn("⚠️ Missing userId for subscription");
        return;
      }
      RealtimeFeedService.subscribeToUser(socket, targetUserId);
      socket.emit("feed:subscriptionConfirmed", {
        type: "user",
        userId: targetUserId,
      });
    });

    // Unsubscribe from specific user's updates
    socket.on("feed:unsubscribeUser", ({ userId: targetUserId }) => {
      if (!targetUserId) {
        console.warn("⚠️ Missing userId for unsubscription");
        return;
      }
      RealtimeFeedService.unsubscribeFromUser(socket, targetUserId);
      socket.emit("feed:unsubscriptionConfirmed", {
        type: "user",
        userId: targetUserId,
      });
    });

    // Acknowledge ready state
    socket.on("feed:ready", (data) => {
      console.log(`✅ User ${userId} ready for feed updates:`, data);
    });

    // Error handling
    socket.on("error", (err) => {
      console.error(`❌ Socket error for user ${userId}:`, err);
    });
  });
};

/**
 * Export event emission functions for use by other controllers
 * These can be called from forum controllers when events happen
 */
export const emitFeedEvents = {
  /**
   * Emit when new forum is published
   * Usage in forum_controller.js: emitFeedEvents.forumPublished(socketServer, forumData)
   */
  forumPublished: (socketServer, forumData) => {
    RealtimeFeedService.emitNewForumPublished(socketServer, forumData);
  },

  /**
   * Emit when forum receives engagement
   * Usage: emitFeedEvents.engagementUpdated(socketServer, forumId, engagementData)
   */
  engagementUpdated: (socketServer, forumId, engagementData) => {
    RealtimeFeedService.emitForumEngagementUpdated(
      socketServer,
      forumId,
      engagementData,
    );
  },

  /**
   * Emit when forum is verified by AI
   * Usage: emitFeedEvents.forumVerified(socketServer, forumId, verificationData)
   */
  forumVerified: (socketServer, forumId, verificationData) => {
    RealtimeFeedService.emitForumVerified(
      socketServer,
      forumId,
      verificationData,
    );
  },

  /**
   * Notify user of vector update
   * Usage: emitFeedEvents.vectorUpdated(socketServer, userId)
   */
  vectorUpdated: (socketServer, userId) => {
    RealtimeFeedService.notifyVectorUpdated(socketServer, userId);
  },

  /**
   * Notify user of trending content
   * Usage: emitFeedEvents.trendingContent(socketServer, userId, forumId, reason)
   */
  trendingContent: (socketServer, userId, forumId, reason) => {
    RealtimeFeedService.notifyTrendingContent(
      socketServer,
      userId,
      forumId,
      reason,
    );
  },
};
