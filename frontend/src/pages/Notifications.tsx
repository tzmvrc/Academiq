import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  UserPlus,
  Sparkles,
  Trophy,
  X,
  Hash,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationSkeleton } from "@/components/SkeletonLoaders";
import { useSocket } from "@/components/SocketContext";
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

interface RejectedForumModalData {
  forumId: string;
  title: string;
  content: string;
  subject: string;
  tags: { id: string; name: string }[];
  reason: string;
}

interface RemovedCommentModalData {
  commentId: string;
  commentContent: string;
  reason: string;
}

interface PointsModalData {
  commentId: string;
  commentContent: string;
  points: number;
  reason: string;
}

interface VerifiedCommentModalData {
  commentId: string;
  commentContent: string;
  sourceUrl: string;
  reason: string;
}

interface AchievementModalData {
  achievementId: string;
  achievementName: string;
  description: string;
  pointsAwarded: number;
  icon: string;
}

const iconMap: Record<string, any> = {
  reply: MessageCircle,
  upvote: ArrowBigUp,
  downvote: ArrowBigDown,
  follow: UserPlus,
  ai_summary: Sparkles,
  points_awarded: Trophy,
  points: Trophy,
  points_deducted: Trophy,
  points_adjusted: Trophy,
  comment_moderation: AlertCircle,
  comment_verified: CheckCircle,
  source_validation: AlertCircle,
  achievement_unlocked: Trophy,
};

const iconColors: Record<string, string> = {
  reply: "text-accent bg-accent/10",
  upvote: "text-primary bg-primary/10",
  downvote: "text-destructive bg-destructive/10",
  follow: "text-success bg-success/10",
  ai_summary: "text-ai bg-ai-subtle",
  points_awarded: "text-yellow-500 bg-yellow-500/10",
  points: "text-yellow-500 bg-yellow-500/10",
  points_deducted: "text-orange-500 bg-orange-500/10",
  points_adjusted: "text-orange-500 bg-orange-500/10",
  comment_moderation: "text-destructive bg-destructive/10",
  comment_verified: "text-success bg-success/10",
  source_validation: "text-warning bg-warning/10",
  achievement_unlocked: "text-purple-500 bg-purple-500/10",
};

const Notifications = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 6;

  const [modalOpen, setModalOpen] = useState(false);
  const [rejectedForum, setRejectedForum] =
    useState<RejectedForumModalData | null>(null);
  const [loadingForum, setLoadingForum] = useState(false);

  const [removedCommentModal, setRemovedCommentModal] = useState(false);
  const [removedCommentData, setRemovedCommentData] =
    useState<RemovedCommentModalData | null>(null);

  const [pointsModal, setPointsModal] = useState(false);
  const [pointsData, setPointsData] = useState<PointsModalData | null>(null);

  const [verifiedModal, setVerifiedModal] = useState(false);
  const [verifiedData, setVerifiedData] =
    useState<VerifiedCommentModalData | null>(null);

  const [achievementModal, setAchievementModal] = useState(false);
  const [achievementData, setAchievementData] =
    useState<AchievementModalData | null>(null);

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

  // 🔥 Listen for real‑time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Refresh the list to show the new notification
      fetchNotifications(true);
      // Show a toast for immediate feedback
      toast({
        title:
          notification.type === "forum_validation"
            ? "Post update"
            : "New notification",
        description: notification.message,
        duration: 5000,
      });
      // Trigger navbar badge update (optional)
      window.dispatchEvent(new Event("newNotification"));
    };

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      window.dispatchEvent(new Event("notificationsRead"));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const fetchForumForRejection = async (forumId: string) => {
    setLoadingForum(true);
    try {
      const res = await axiosInstance.get(`/forums/${forumId}`);
      const forum = res.data.forum;
      return {
        forumId,
        title: forum.title,
        content: forum.content,
        subject: forum.subject?.name || "General",
        tags: forum.tags || [],
      };
    } catch (err) {
      console.error("Failed to fetch rejected forum", err);
      toast({
        title: "Could not load forum details",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoadingForum(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    const { type, reference_id, metadata } = notification;

    // Handle removed comment notification
    if (type === "comment_moderation") {
      setRemovedCommentData({
        commentId: reference_id,
        commentContent:
          metadata?.commentPreview || "Comment content not available",
        reason:
          metadata?.aiReason || "Your comment did not meet quality standards",
      });
      setRemovedCommentModal(true);
      return;
    }

    // Handle points earned notification
    if (type === "points_awarded" || type === "points") {
      setPointsData({
        commentId: reference_id,
        commentContent:
          metadata?.commentPreview || "Comment content not available",
        points: metadata?.points || 0,
        reason: metadata?.reason || "Great contribution!",
      });
      setPointsModal(true);
      return;
    }

    // Handle comment verified notification
    if (type === "comment_verified") {
      setVerifiedData({
        commentId: reference_id,
        commentContent:
          metadata?.commentPreview || "Comment content not available",
        sourceUrl: metadata?.source_url || "",
        reason: metadata?.reason || "Your comment was verified",
      });
      setVerifiedModal(true);
      return;
    }

    // Handle achievement unlocked notification
    if (type === "achievement_unlocked") {
      setAchievementData({
        achievementId: reference_id,
        achievementName: metadata?.achievementName || "Achievement Unlocked",
        description:
          metadata?.description || "You've unlocked a new achievement!",
        pointsAwarded: metadata?.pointsAwarded || 0,
        icon: metadata?.icon || "🏆",
      });
      setAchievementModal(true);
      return;
    }

    // Handle source validation notification
    if (type === "source_validation") {
      setPointsData({
        commentId: reference_id,
        commentContent:
          metadata?.commentPreview || "Comment content not available",
        points: -metadata?.pointsReduced || 0,
        reason: `Points reduced due to ${metadata?.flaggedUrlsCount || 0} invalid source(s)`,
      });
      setPointsModal(true);
      return;
    }

    if (type === "forum_validation") {
      if (metadata?.verdict === "rejected") {
        let forumData: RejectedForumModalData | null = null;
        if (metadata.forumTitle && metadata.reason) {
          forumData = {
            forumId: reference_id,
            title: metadata.forumTitle,
            content: metadata.content || "Content not available",
            subject: metadata.subject || "General",
            tags: metadata.tags || [],
            reason: metadata.reason,
          };
        } else {
          const fetched = await fetchForumForRejection(reference_id);
          if (fetched) {
            forumData = {
              ...fetched,
              reason: metadata?.reason || "Validation failed",
            };
          }
        }
        if (forumData) {
          setRejectedForum(forumData);
          setModalOpen(true);
        }
        return;
      } else if (metadata?.verdict === "approved") {
        const forumId = metadata?.forumId || reference_id;
        if (forumId) {
          navigate(`/post/${forumId}`);
          return;
        }
      }
      const forumId = metadata?.forumId || reference_id;
      if (forumId) navigate(`/post/${forumId}`);
      return;
    }

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
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosInstance.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast({ title: "All notifications marked as read" });
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
      {items.map((n) => {
        const Icon = iconMap[n.type] || Bell;
        const isFollowWithProfileUrl =
          n.type === "follow" && n.metadata?.profile_url;
        return (
          <div
            key={n.id}
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
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${
                  iconColors[n.type] || "bg-secondary"
                }`}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm leading-relaxed ${
                  !n.is_read
                    ? "text-foreground font-medium"
                    : "text-foreground/80"
                }`}>
                {n.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.is_read && (
              <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />
            )}
          </div>
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

      {/* Modal for rejected forum */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">
                  Post Rejected
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {loadingForum ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : rejectedForum ? (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        Title
                      </h3>
                      <p className="text-sm text-foreground mt-1">
                        {rejectedForum.title}
                      </p>
                    </div>

                    {rejectedForum.tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          Tags
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rejectedForum.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              <Hash className="h-2.5 w-2.5" />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        Content
                      </h3>
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-3">
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                          {rejectedForum.content}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                      <h3 className="text-sm font-medium text-destructive">
                        Rejection Reason
                      </h3>
                      <p className="text-sm text-foreground/90 mt-1">
                        {rejectedForum.reason}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for removed comment */}
      <AnimatePresence>
        {removedCommentModal && removedCommentData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Comment Removed
                </h2>
                <button
                  onClick={() => setRemovedCommentModal(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Your Comment
                  </h3>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {removedCommentData.commentContent}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                  <h3 className="text-sm font-medium text-destructive">
                    Removal Reason
                  </h3>
                  <p className="text-sm text-foreground/90 mt-1">
                    {removedCommentData.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <button
                  onClick={() => setRemovedCommentModal(false)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for points earned/reduced */}
      <AnimatePresence>
        {pointsModal && pointsData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Points {pointsData.points > 0 ? "Earned" : "Adjusted"}
                </h2>
                <button
                  onClick={() => setPointsModal(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-lg bg-yellow-500/10 p-4 border border-yellow-500/20">
                  <p className="text-3xl font-bold text-yellow-500">
                    {pointsData.points > 0 ? "+" : ""}
                    {pointsData.points}
                  </p>
                  <p className="text-sm text-foreground/90 mt-1">
                    Points {pointsData.points > 0 ? "earned" : "reduced"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Your Comment
                  </h3>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {pointsData.commentContent}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                  <h3 className="text-sm font-medium text-primary">
                    Evaluation Reason
                  </h3>
                  <p className="text-sm text-foreground/90 mt-1">
                    {pointsData.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <button
                  onClick={() => setPointsModal(false)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for verified comment */}
      <AnimatePresence>
        {verifiedModal && verifiedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Comment Verified
                </h2>
                <button
                  onClick={() => setVerifiedModal(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-lg bg-success/10 p-3 border border-success/20">
                  <p className="text-sm text-success font-medium">
                    ✓ Your comment has been verified by AI
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Your Comment
                  </h3>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {verifiedData.commentContent}
                    </p>
                  </div>
                </div>

                {verifiedData.sourceUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-primary" />
                      Source
                    </h3>
                    <a
                      href={verifiedData.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline truncate">
                      {verifiedData.sourceUrl}
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                )}

                {verifiedData.reason && (
                  <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                    <h3 className="text-sm font-medium text-primary">
                      Details
                    </h3>
                    <p className="text-sm text-foreground/90 mt-1">
                      {verifiedData.reason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <button
                  onClick={() => setVerifiedModal(false)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for achievement unlocked */}
      <AnimatePresence>
        {achievementModal && achievementData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="relative bg-gradient-to-r from-purple-500/20 to-purple-600/20 p-8 flex flex-col items-center justify-center border-b border-border">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-2xl font-heading font-bold text-foreground text-center">
                  Achievement Unlocked!
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    {achievementData.achievementName}
                  </h3>
                  <p className="text-sm text-foreground/70 mt-2">
                    {achievementData.description}
                  </p>
                </div>

                {achievementData.pointsAwarded > 0 && (
                  <div className="rounded-lg bg-yellow-500/10 p-4 border border-yellow-500/20 flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-700">
                        Points Earned
                      </p>
                      <p className="text-xl font-bold text-yellow-600">
                        +{achievementData.pointsAwarded}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  onClick={() => setAchievementModal(false)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Awesome!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
