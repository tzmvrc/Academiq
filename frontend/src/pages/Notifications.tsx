import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  UserPlus,
  Sparkles,
  Trophy,
} from "lucide-react";
import { NotificationSkeleton } from "@/components/SkeletonLoaders";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  reference_id: string;
  metadata: any;
}

const iconMap: Record<string, any> = {
  reply: MessageCircle,
  upvote: ArrowBigUp,
  downvote: ArrowBigDown,
  follow: UserPlus,
  ai_summary: Sparkles,
  points: Trophy,
};

const iconColors: Record<string, string> = {
  reply: "text-accent bg-accent/10",
  upvote: "text-primary bg-primary/10",
  downvote: "text-destructive bg-destructive/10",
  follow: "text-success bg-success/10",
  ai_summary: "text-ai bg-ai-subtle",
  points: "text-yellow-500 bg-yellow-500/10",
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 6;
  // const DISPLAY_LIMIT = expanded ? notifications.length : LIMIT;

  const fetchNotifications = useCallback(
    async (reset = true) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setIsLoading(true);
        setOffset(0);
      } else {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
      }
      try {
        const res = await axiosInstance.get(
          `/notifications?limit=${LIMIT}&offset=${currentOffset}`,
        );
        const newNotifications = res.data.notifications;
        if (reset) {
          setNotifications(newNotifications);
        } else {
          setNotifications((prev) => [...prev, ...newNotifications]);
        }
        setHasMore(newNotifications.length === LIMIT);
        setOffset((prev) => prev + LIMIT);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
        toast({
          title: "Failed to load notifications",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [offset, hasMore, loadingMore],
  );

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      // Dispatch event to update navbar badge
      window.dispatchEvent(new Event("notificationsRead"));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    const { type, reference_id, metadata } = notification;
    if (
      type === "reply" ||
      type === "upvote" ||
      type === "downvote" ||
      type === "ai_summary"
    ) {
      const forumId = metadata?.forumId || reference_id;
      if (forumId) navigate(`/post/${forumId}`);
    } else if (type === "follow") {
      const followerName = metadata?.followerName || reference_id;
      if (followerName) navigate(`/${encodeURIComponent(followerName)}`);
    } else if (type === "points") {
      navigate("/profile");
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosInstance.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast({ title: "All notifications marked as read" });
      // Dispatch event to update navbar badge
      window.dispatchEvent(new Event("notificationsRead"));
    } catch (err) {
      console.error("Failed to mark all as read", err);
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    }
  };

  const groupNotificationsByDate = (notifs: Notification[]) => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    notifs.forEach((n) => {
      const createdAt = new Date(n.created_at);
      if (createdAt >= todayStart) today.push(n);
      else if (createdAt >= yesterdayStart) yesterday.push(n);
      else older.push(n);
    });
    return { today, yesterday, older };
  };

  const renderGroup = (title: string, items: Notification[]) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground px-1">
        {title}
      </h3>
      {items.map((n, i) => {
        const Icon = iconMap[n.type] || Bell;
        const isFollowWithProfileUrl =
          n.type === "follow" && n.metadata?.profile_url;
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => handleNotificationClick(n)}
            className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 transition-all hover:shadow-sm cursor-pointer ${
              !n.is_read
                ? "border-primary/15 bg-primary/[0.02]"
                : "border-border bg-card"
            }`}>
            {isFollowWithProfileUrl ? (
              <img
                src={n.metadata.profile_url}
                alt={n.metadata.followerName || "User"}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0 object-cover"
              />
            ) : (
              <div
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${iconColors[n.type] || "bg-secondary"}`}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm leading-relaxed ${!n.is_read ? "text-foreground font-medium" : "text-foreground/80"}`}>
                {n.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.is_read && (
              <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />
            )}
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-accent" />
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
            Notifications
          </h1>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Mark all as read
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8">
        Stay updated with your academic community.
      </p>

      <div className="space-y-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <NotificationSkeleton key={i} index={i} />
          ))
        ) : (
          <>
            {(() => {
              const displayedNotifications = expanded
                ? notifications
                : notifications.slice(0, LIMIT);
              const { today, yesterday, older } = groupNotificationsByDate(
                displayedNotifications,
              );
              return (
                <>
                  {today.length > 0 && renderGroup("Today", today)}
                  {yesterday.length > 0 && renderGroup("Yesterday", yesterday)}
                  {older.length > 0 && renderGroup("Older", older)}
                </>
              );
            })()}
            {(notifications.length > LIMIT || hasMore) && (
              <div className="flex justify-center pt-4">
                {expanded ? (
                  <button
                    onClick={() => setExpanded(false)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    See less
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setExpanded(true);
                      if (notifications.length <= LIMIT && hasMore) {
                        fetchNotifications(false);
                      }
                    }}
                    disabled={loadingMore}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {loadingMore ? "Loading..." : "See more"}
                  </button>
                )}
              </div>
            )}
            {notifications.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No notifications yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
