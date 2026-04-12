import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Info, // added info icon
} from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import { formatDistanceToNow, isAfter, subDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Post {
  id: string;
  title: string;
  created_at: string;
  validation_status: "pending" | "approved" | "rejected";
  validation_reason?: string;
}

const PendingPostsPanel = () => {
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [recentApprovedPosts, setRecentApprovedPosts] = useState<Post[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [allPending, setAllPending] = useState<Post[]>([]);
  const [allApproved, setAllApproved] = useState<Post[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllApproved, setShowAllApproved] = useState(false);

  const isFetching = useRef(false);

  const fetchData = useCallback(async (showLoading = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    if (showLoading) setInitialLoading(true);
    try {
      const response = await axiosInstance.get(
        "/forums/users/me/pending?limit=50",
      );
      const allPosts: Post[] = response.data.forums || [];

      const pending = allPosts.filter((p) => p.validation_status === "pending");
      const approved = allPosts.filter(
        (p) => p.validation_status === "approved",
      );

      const oneDayAgo = subDays(new Date(), 1);
      const recentApproved = approved.filter((p) =>
        isAfter(new Date(p.created_at), oneDayAgo),
      );

      setPendingPosts(pending.slice(0, 3));
      setRecentApprovedPosts(recentApproved.slice(0, 3));
      setAllPending(pending);
      setAllApproved(approved);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      if (showLoading) setInitialLoading(false);
      isFetching.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Background refresh every 30 seconds (without showing loading skeleton)
  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Listen for post‑created event to instantly add the new post
  useEffect(() => {
    const handlePostCreated = (event: CustomEvent<Post>) => {
      const newPost = event.detail;
      if (!newPost || newPost.validation_status !== "pending") return;

      // Add to the top of pending lists
      setPendingPosts((prev) => [newPost, ...prev].slice(0, 3));
      setAllPending((prev) => [newPost, ...prev]);
    };

    window.addEventListener("post-created", handlePostCreated as EventListener);
    return () =>
      window.removeEventListener(
        "post-created",
        handlePostCreated as EventListener,
      );
  }, []);

  const hasAnyPending = pendingPosts.length > 0;
  const hasAnyRecentApproved = recentApprovedPosts.length > 0;

  const PostItem = ({
    post,
    showReason = false,
  }: {
    post: Post;
    showReason?: boolean;
  }) => (
    <div className="border-b border-border last:border-0 pb-2 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {post.title.length > 50
              ? post.title.slice(0, 50) + "..."
              : post.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="shrink-0">
          {post.validation_status === "pending" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
              <Loader2 className="h-3 w-3 animate-spin" />
              pending
            </span>
          )}
          {post.validation_status === "approved" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
              <CheckCircle className="h-3 w-3" />
              approved
            </span>
          )}
          {post.validation_status === "rejected" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
              <XCircle className="h-3 w-3" />
              rejected
            </span>
          )}
        </div>
      </div>
      {showReason && post.validation_reason && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {post.validation_reason}
        </p>
      )}
    </div>
  );

  const showPanel = !initialLoading && (hasAnyPending || hasAnyRecentApproved);

  if (!showPanel && !initialLoading) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {initialLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border bg-card p-4 mt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading posts...</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border bg-card p-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Your Posts
                {/* Info icon with hover tooltip */}
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 whitespace-nowrap z-10 shadow-md border border-border">
                    Posts are checked by AI before being approved
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover"></div>
                  </div>
                </div>
              </h3>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Eye className="h-3 w-3" /> View All
              </button>
            </div>

            {hasAnyPending && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Pending Review
                </h4>
                <div className="space-y-3">
                  {pendingPosts.map((post) => (
                    <PostItem key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}

            {hasAnyRecentApproved && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Recently Approved (last 24h)
                </h4>
                <div className="space-y-3">
                  {recentApprovedPosts.map((post) => (
                    <PostItem key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal with portal – full implementation */}
      {modalOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
              onClick={() => {
                setModalOpen(false);
                setShowAllPending(false);
                setShowAllApproved(false);
              }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md h-[500px] flex flex-col rounded-xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
                  <h2 className="text-lg font-heading font-semibold text-foreground">
                    Your Posts – Status Overview
                  </h2>
                  <button
                    onClick={() => {
                      setModalOpen(false);
                      setShowAllPending(false);
                      setShowAllApproved(false);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <Tabs defaultValue="pending" className="h-full">
                    <TabsList className="grid w-full grid-cols-2 sticky top-0 bg-card z-10 border-b border-border">
                      <TabsTrigger value="pending">
                        Pending ({allPending.length})
                      </TabsTrigger>
                      <TabsTrigger value="approved">
                        Approved ({allApproved.length})
                      </TabsTrigger>
                    </TabsList>
                    <div className="px-5 py-4">
                      <TabsContent value="pending" className="space-y-3 mt-0">
                        {allPending.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No pending posts.
                          </p>
                        ) : (
                          <>
                            {(showAllPending
                              ? allPending
                              : allPending.slice(0, 5)
                            ).map((post) => (
                              <PostItem key={post.id} post={post} showReason />
                            ))}
                            {allPending.length > 5 && (
                              <button
                                onClick={() =>
                                  setShowAllPending(!showAllPending)
                                }
                                className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-2">
                                {showAllPending ? (
                                  <>
                                    Show less <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    View all ({allPending.length - 5} more){" "}
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </TabsContent>
                      <TabsContent value="approved" className="space-y-3 mt-0">
                        {allApproved.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No approved posts.
                          </p>
                        ) : (
                          <>
                            {(showAllApproved
                              ? allApproved
                              : allApproved.slice(0, 5)
                            ).map((post) => (
                              <PostItem key={post.id} post={post} showReason />
                            ))}
                            {allApproved.length > 5 && (
                              <button
                                onClick={() =>
                                  setShowAllApproved(!showAllApproved)
                                }
                                className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-2">
                                {showAllApproved ? (
                                  <>
                                    Show less <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    View all ({allApproved.length - 5} more){" "}
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default PendingPostsPanel;
