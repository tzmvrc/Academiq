import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import io from "socket.io-client"; // Ensure socket.io-client is installed

/**
 * usePointNotifications
 *
 * Listens for point award notifications via Socket.IO.
 * Displays toast notifications when user gains points on comments.
 *
 * @param {string} userId - Current logged-in user's ID
 * @param {boolean} enabled - Whether to enable notifications (default: true)
 * @returns {object} { isConnected, lastPoints }
 */
export const usePointNotifications = (userId, enabled = true) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPoints, setLastPoints] = useState(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Connect to Socket.IO if not already connected
    if (!socketRef.current) {
      const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      socketRef.current = io(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Handle connection
      socketRef.current.on("connect", () => {
        console.log("✅ Connected to notification server");
        setIsConnected(true);

        // Join user-specific room for notifications
        socketRef.current.emit("join:notifications", { userId });
      });

      // Handle disconnection
      socketRef.current.on("disconnect", () => {
        console.log("❌ Disconnected from notification server");
        setIsConnected(false);
      });

      // Listen for point award notifications
      socketRef.current.on("notification:new", (notification) => {
        handlePointNotification(notification);
      });

      // Handle reconnection
      socketRef.current.on("reconnect", () => {
        console.log("🔄 Reconnected to notification server");
        socketRef.current.emit("join:notifications", { userId });
      });
    }

    return () => {
      // Cleanup on unmount
      if (socketRef.current && !enabled) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, enabled]);

  const handlePointNotification = useCallback((notification) => {
    const { type, message, metadata } = notification;

    // Check if this is a points award notification
    if (type === "points_awarded" && metadata?.points) {
      const points = metadata.points;
      setLastPoints(points);

      // Show toast notification
      toast.success(`🎉 ${message}`, {
        duration: 5000,
        icon: "⭐",
        style: {
          borderRadius: "8px",
          background: "#10B981",
          color: "#fff",
          padding: "16px",
          fontSize: "14px",
          fontWeight: "600",
        },
      });

      console.log(`✅ User earned +${points} points`);
    }
  }, []);

  return {
    isConnected,
    lastPoints,
  };
};

/**
 * Alternative: usePointNotificationsWithPolling
 *
 * Uses polling instead of WebSockets if Socket.IO is not available.
 * Less real-time but works in environments without WebSocket support.
 *
 * @param {string} userId - Current logged-in user's ID
 * @param {number} pollInterval - Polling interval in milliseconds (default: 5000)
 * @returns {object} { hasUnread, lastPoints }
 */
export const usePointNotificationsWithPolling = (
  userId,
  pollInterval = 5000,
) => {
  const [hasUnread, setHasUnread] = useState(false);
  const [lastPoints, setLastPoints] = useState(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const pollNotifications = async () => {
      try {
        // Fetch unread notifications from backend
        const response = await fetch(`/api/notifications?limit=5`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) return;

        const { data: notifications } = await response.json();

        // Check for new point awards
        notifications.forEach((notif) => {
          if (notif.type === "points_awarded" && notif.metadata?.points) {
            const points = notif.metadata.points;
            setLastPoints(points);
            setHasUnread(true);

            // Show toast
            toast.success(`🎉 You gained +${points} points`, {
              duration: 5000,
              icon: "⭐",
              style: {
                borderRadius: "8px",
                background: "#10B981",
                color: "#fff",
                padding: "16px",
                fontSize: "14px",
                fontWeight: "600",
              },
            });
          }
        });
      } catch (error) {
        console.error("❌ Failed to poll notifications:", error);
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(pollNotifications, pollInterval);

    // Initial poll
    pollNotifications();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [userId, pollInterval]);

  return {
    hasUnread,
    lastPoints,
  };
};
