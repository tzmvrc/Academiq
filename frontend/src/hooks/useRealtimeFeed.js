import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../integration/socket";

/**
 * useRealtimeFeed Hook
 * Subscribes to realtime feed events and triggers query invalidation
 * to refresh the feed with newly published content
 *
 * Usage:
 * ```tsx
 * const { subscribeToSubject, unsubscribeFromSubject } = useRealtimeFeed();
 * ```
 */
export const useRealtimeFeed = () => {
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const unsubscribersRef = useRef([]);

  // Initialize socket on first render if authenticated
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (token && !socketRef.current) {
      try {
        socketRef.current = getSocket(token);
        console.log("🔌 Realtime feed socket initialized");
      } catch (err) {
        console.warn("⚠️ Failed to initialize socket:", err);
      }
    }
  }, []);

  // Handle new forum published
  const handleNewForumPublished = useCallback(() => {
    console.log("🔄 New forum published - invalidating feed cache");
    queryClient.invalidateQueries({
      queryKey: ["personalizedFeed"],
    });
  }, [queryClient]);

  // Handle engagement update
  const handleEngagementUpdated = useCallback(
    ({ trending }) => {
      if (trending) {
        console.log("🔄 Forum trending - refreshing feed");
        queryClient.invalidateQueries({
          queryKey: ["personalizedFeed"],
        });
      }
    },
    [queryClient],
  );

  // Handle forum verification
  const handleForumVerified = useCallback(() => {
    console.log("🔄 Forum verified - refreshing feed for new content");
    queryClient.invalidateQueries({
      queryKey: ["personalizedFeed"],
    });
  }, [queryClient]);

  // Handle vector update
  const handleVectorUpdated = useCallback(() => {
    console.log("🔄 Interest vector updated - completely refreshing feed");
    // Completely clear feed cache to force refetch with new vector
    queryClient.removeQueries({
      queryKey: ["personalizedFeed"],
    });
  }, [queryClient]);

  // Handle trending content notification
  const handleTrendingContent = useCallback(
    ({ forumId, reason }) => {
      console.log(`🔥 Trending content notification: ${forumId} (${reason})`);
      // Refresh feed to show trending content
      queryClient.invalidateQueries({
        queryKey: ["personalizedFeed"],
      });
    },
    [queryClient],
  );

  // Setup socket listeners
  useEffect(() => {
    if (!socketRef.current?.connected) {
      console.log("⚠️ Socket not available yet");
      return;
    }

    console.log("🔌 Setting up realtime feed listeners");

    // Listen to feed events
    socketRef.current.on("feed:forumPublished", handleNewForumPublished);
    socketRef.current.on("feed:engagementUpdated", handleEngagementUpdated);
    socketRef.current.on("feed:forumVerified", handleForumVerified);
    socketRef.current.on("feed:vectorUpdated", handleVectorUpdated);
    socketRef.current.on("feed:trendingContent", handleTrendingContent);

    // Store unsubscribers for cleanup
    unsubscribersRef.current = [
      () =>
        socketRef.current?.off("feed:forumPublished", handleNewForumPublished),
      () =>
        socketRef.current?.off(
          "feed:engagementUpdated",
          handleEngagementUpdated,
        ),
      () => socketRef.current?.off("feed:forumVerified", handleForumVerified),
      () => socketRef.current?.off("feed:vectorUpdated", handleVectorUpdated),
      () =>
        socketRef.current?.off("feed:trendingContent", handleTrendingContent),
    ];

    return () => {
      console.log("🧹 Cleaning up realtime feed listeners");
      unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    handleNewForumPublished,
    handleEngagementUpdated,
    handleForumVerified,
    handleVectorUpdated,
    handleTrendingContent,
  ]);

  // API to subscribe/unsubscribe from specific subjects
  const subscribeToSubject = useCallback((subjectId) => {
    socketRef.current?.emit("feed:subscribeSubject", { subjectId });
    console.log(`👁️ Subscribed to subject: ${subjectId}`);
  }, []);

  const unsubscribeFromSubject = useCallback((subjectId) => {
    socketRef.current?.emit("feed:unsubscribeSubject", { subjectId });
    console.log(`👋 Unsubscribed from subject: ${subjectId}`);
  }, []);

  // API to subscribe/unsubscribe from specific users
  const subscribeToUser = useCallback((authorId) => {
    socketRef.current?.emit("feed:subscribeUser", { userId: authorId });
    console.log(`👁️ Subscribed to user: ${authorId}`);
  }, []);

  const unsubscribeFromUser = useCallback((authorId) => {
    socketRef.current?.emit("feed:unsubscribeUser", { userId: authorId });
    console.log(`👋 Unsubscribed from user: ${authorId}`);
  }, []);

  return {
    subscribeToSubject,
    unsubscribeFromSubject,
    subscribeToUser,
    unsubscribeFromUser,
  };
};
