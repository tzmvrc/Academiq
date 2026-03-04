import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Send,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/formatTime";
import { BrutalTag } from "@/components/ui/BrutalTag";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import type { Comment } from "@/components/forum/CommentCard";
import { CommentCard } from "@/components/forum/CommentCard";
import { Sidebar } from "@/components/layout/Sidebar";
import axiosInstance from "@/integration/axiosInstance";

type ForumUser = { id: string; name: string; profile_url?: string | null };
type ForumSubject = { id: string; name: string };

type Forum = {
  id: string;
  title: string;
  content: string;
  created_at?: string;
  vote_count?: number;
  comments_count?: number;
  ai_summary?: string | null;
  is_ai_verified?: boolean;
  users?: ForumUser | null;
  subjects?: ForumSubject | null;
  document_url?: string | null;
};

// Helper to count all comments including nested
const countComments = (comments: Comment[]): number => {
  return comments.reduce((acc, comment) => {
    return acc + 1 + (comment.replies ? countComments(comment.replies) : 0);
  }, 0);
};

const getFileNameFromUrl = (url: string) => {
  try {
    const cleanUrl = url.split("?")[0];
    return decodeURIComponent(
      cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1),
    );
  } catch {
    return "Attached Document";
  }
};

// Safely read logged-in user from localStorage
const getCurrentUser = (): { id?: string; name?: string } => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return { id: parsed?.id, name: parsed?.name };
  } catch {
    return {};
  }
};

export const PostDetail: React.FC = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState("feed");

  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentVotes, setCommentVotes] = useState<
    Record<string, 1 | -1 | null>
  >({});

  const [forum, setForum] = useState<Forum | null>(() => {
    // Initialize from cache if available
    try {
      const cached = localStorage.getItem(`forum_${postId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    // Only load if not cached
    try {
      const cached = localStorage.getItem(`forum_${postId}`);
      return !cached;
    } catch {
      return true;
    }
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myVote, setMyVote] = useState<1 | -1 | null>(null);
  const [voting, setVoting] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isForumSaved, setIsForumSaved] = useState(false);

  const me = useMemo(() => getCurrentUser(), []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const buildCommentTree = (
    flat: any[],
    votes: Record<string, 1 | -1 | null>,
  ): Comment[] => {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];

    // Create nodes
    flat.forEach((c) => {
      map.set(c.id, {
        id: c.id,
        author: c.users?.name ?? "Unknown",
        authorId: c.user_id,
        avatar: c.users?.profile_url ?? undefined,
        content: c.content,
        timestamp: formatTimeAgo(c.created_at),
        isAIVerified: c.is_ai_verified ?? false,
        voteCount: c.vote_count ?? 0,
        userVote: votes[c.id] ?? null,
        replies: [],
      });
    });

    // Link parent/child
    flat.forEach((c) => {
      const node = map.get(c.id);
      if (!node) return;

      if (c.parent_comment_id) {
        const parent = map.get(c.parent_comment_id);
        parent?.replies?.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const fetchComments = async () => {
    if (!postId) return;

    try {
      const res = await axiosInstance.get(`/forums/${postId}/comments`);
      const rawComments = res.data.comments || [];

      // Fetch votes for all comments
      const votes: Record<string, 1 | -1 | null> = {};
      for (const comment of rawComments) {
        try {
          const voteRes = await axiosInstance.get(
            `/comments/${comment.id}/my-vote`,
          );
          const voteType = voteRes.data?.voteType;
          votes[comment.id] =
            voteType === 1 || voteType === -1 ? voteType : null;
        } catch (err: any) {
          // If 401 or not found, user hasn't voted on this comment
          if (err?.response?.status) {
            votes[comment.id] = null;
          }
        }
      }

      setCommentVotes(votes);
      const nested = buildCommentTree(rawComments, votes);
      setComments(nested);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  };

  useEffect(() => {
    if (!postId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await axiosInstance.get(`/forums/${postId}`);
        const f: Forum = res.data.forum;

        setForum(f);
        // Cache the forum data
        localStorage.setItem(`forum_${postId}`, JSON.stringify(f));
        setVoteCount(f.vote_count ?? 0);

        // Fetch user's vote if authenticated (optional endpoint - 401 is expected for non-authenticated users)
        try {
          const voteRes = await axiosInstance.get(`/forums/${postId}/my-vote`);
          const raw = Number(voteRes.data?.voteType);
          setMyVote(raw === 1 || raw === -1 ? (raw as 1 | -1) : null);
        } catch (voteErr: any) {
          // If 401, user is not authenticated - this is fine, skip
          if (voteErr?.response?.status === 401) {
            setMyVote(null);
          } else if (voteErr?.response?.status) {
            console.error("Failed to fetch vote:", voteErr);
          }
        }

        // Fetch save status if authenticated (optional endpoint - 401 is expected for non-authenticated users)
        try {
          const saveRes = await axiosInstance.get(`/forums/${postId}/save`);
          setIsForumSaved(saveRes.data?.saved ?? false);
        } catch (saveErr: any) {
          // If 401, user is not authenticated - this is fine, skip
          if (saveErr?.response?.status === 401) {
            setIsForumSaved(false);
          } else if (saveErr?.response?.status) {
            console.error("Failed to fetch save status:", saveErr);
          }
        }

        await fetchComments();
      } catch (err: any) {
        const msg =
          err?.response?.data?.error || err?.message || "Failed to load forum.";
        setErrorMsg(msg);
        setForum(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleUpvote = async () => {
    if (!postId || voting) return;

    try {
      setVoting(true);

      // toggle off if already upvoted
      if (myVote === 1) {
        const res = await axiosInstance.delete(`/forums/${postId}/vote`);
        setMyVote(null);
        setVoteCount(res.data.voteCount);
        // Update localStorage
        const votes = JSON.parse(localStorage.getItem("userVotes") || "{}");
        delete votes[postId];
        localStorage.setItem("userVotes", JSON.stringify(votes));
        return;
      }

      const res = await axiosInstance.post(`/forums/${postId}/vote`, {
        voteType: 1,
      });
      setMyVote(1);
      setVoteCount(res.data.voteCount);
      // Update localStorage
      const votes = JSON.parse(localStorage.getItem("userVotes") || "{}");
      votes[postId] = 1;
      localStorage.setItem("userVotes", JSON.stringify(votes));
    } catch (err) {
      console.error("Upvote failed:", err);
    } finally {
      setVoting(false);
    }
  };

  const handleDownvote = async () => {
    if (!postId || voting) return;

    try {
      setVoting(true);

      // toggle off if already downvoted
      if (myVote === -1) {
        const res = await axiosInstance.delete(`/forums/${postId}/vote`);
        setMyVote(null);
        setVoteCount(res.data.voteCount);
        // Update localStorage
        const votes = JSON.parse(localStorage.getItem("userVotes") || "{}");
        delete votes[postId];
        localStorage.setItem("userVotes", JSON.stringify(votes));
        return;
      }

      const res = await axiosInstance.post(`/forums/${postId}/vote`, {
        voteType: -1,
      });
      setMyVote(-1);
      setVoteCount(res.data.voteCount);
      // Update localStorage
      const votes = JSON.parse(localStorage.getItem("userVotes") || "{}");
      votes[postId] = -1;
      localStorage.setItem("userVotes", JSON.stringify(votes));
    } catch (err) {
      console.error("Downvote failed:", err);
    } finally {
      setVoting(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate("/dashboard");
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !postId || postingComment) return;

    try {
      const res = await axiosInstance.post(`/forums/${postId}/comments`, {
        content: newComment,
        parent_comment_id: null,
      });

      const created = res.data.comment;

      const newCommentObj: Comment = {
        id: created.id,
        author: created.users?.name ?? me?.name ?? "You",
        authorId: created.user_id ?? me?.id ?? "",
        avatar: created.users?.profile_url,
        content: created.content,
        timestamp: formatTimeAgo(created.created_at),
        isAIVerified: created.is_ai_verified ?? false,
        voteCount: 0,
        userVote: null,
        replies: [],
      };

      // Optimistic prepend (top-level)
      setComments((prev) => [newCommentObj, ...prev]);
      setNewComment("");

      // Update local forum count immediately
      setForum((prev) =>
        prev
          ? { ...prev, comments_count: (prev.comments_count ?? 0) + 1 }
          : prev,
      );
    } catch (err) {
      console.error("Create comment failed:", err);
    }
  };

  const handleVote = async (commentId: string, direction: "up" | "down") => {
    try {
      const voteType = direction === "up" ? 1 : -1;
      const currentVote = commentVotes[commentId] ?? null;

      // Calculate vote count delta for optimistic update
      let countDelta = 0;
      if (currentVote === voteType) {
        // Removing existing vote
        countDelta = -voteType;
      } else if (currentVote === null) {
        // Adding new vote
        countDelta = voteType;
      } else {
        // Switching vote (e.g., upvote to downvote)
        countDelta = voteType - currentVote;
      }

      // Update state first (optimistic update)
      const newVotes = { ...commentVotes };
      if (currentVote === voteType) {
        newVotes[commentId] = null;
      } else {
        newVotes[commentId] = voteType;
      }
      setCommentVotes(newVotes);

      // Update comment tree with new votes and vote counts (optimistic)
      const updateVoteInTree = (items: Comment[]): Comment[] => {
        return items.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              userVote: newVotes[commentId],
              voteCount: c.voteCount + countDelta,
            };
          }
          if (c.replies) return { ...c, replies: updateVoteInTree(c.replies) };
          return c;
        });
      };
      setComments((prev) => updateVoteInTree(prev));

      // Make API call and sync with actual vote count from response
      let response;
      if (currentVote === voteType) {
        // Toggle off - delete vote
        response = await axiosInstance.delete(`/comments/${commentId}/vote`);
      } else {
        // Add or change vote - post vote
        response = await axiosInstance.post(`/comments/${commentId}/vote`, {
          voteType,
        });
      }

      // Update with actual vote count from response
      const actualVoteCount = response.data?.voteCount ?? null;
      if (actualVoteCount !== null) {
        const updateWithActualCount = (items: Comment[]): Comment[] => {
          return items.map((c) => {
            if (c.id === commentId) {
              return {
                ...c,
                voteCount: actualVoteCount,
              };
            }
            if (c.replies)
              return { ...c, replies: updateWithActualCount(c.replies) };
            return c;
          });
        };
        setComments((prev) => updateWithActualCount(prev));
      }
    } catch (err: any) {
      // On error, refetch comments to get correct state
      await fetchComments();

      if (err?.response?.status === 401) {
        console.log("User not authenticated for voting");
      } else {
        console.error("Vote comment failed:", err);
      }
    }
  };

  const handleEdit = async (commentId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      await axiosInstance.put(`/comments/${commentId}`, {
        content: newContent,
      });

      // Update local state
      const updateComment = (items: Comment[]): Comment[] => {
        return items.map((c) => {
          if (c.id === commentId) return { ...c, content: newContent };
          if (c.replies) return { ...c, replies: updateComment(c.replies) };
          return c;
        });
      };
      setComments((prev) => updateComment(prev));
    } catch (err) {
      console.error("Edit comment failed:", err);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await axiosInstance.delete(`/comments/${commentId}`);

      // Update local state
      const deleteComment = (items: Comment[]): Comment[] => {
        return items
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies ? deleteComment(c.replies) : undefined,
          }));
      };
      setComments((prev) => deleteComment(prev));

      // Decrement count
      setForum((prev) =>
        prev
          ? {
              ...prev,
              comments_count: Math.max(0, (prev.comments_count ?? 0) - 1),
            }
          : prev,
      );
    } catch (err) {
      console.error("Delete comment failed:", err);
    }
  };

  const handleReply = async (parentId: string, replyContent: string) => {
    if (!postId || !replyContent.trim()) return;

    try {
      await axiosInstance.post(`/forums/${postId}/comments`, {
        content: replyContent.trim(),
        parent_comment_id: parentId,
      });

      await fetchComments();

      setForum((prev) =>
        prev
          ? { ...prev, comments_count: (prev.comments_count ?? 0) + 1 }
          : prev,
      );
    } catch (err: any) {
      console.error("Reply failed:", err);
      if (err?.response?.status === 401) {
        console.log("User not authenticated for replying");
      }
    }
  };

  const handleUpdateForum = async () => {
    if (!postId) return;

    const newTitle = prompt("Edit title:", forum?.title);
    if (!newTitle || !newTitle.trim()) return;

    const newContent = prompt("Edit content:", forum?.content);
    if (!newContent || !newContent.trim()) return;

    try {
      const res = await axiosInstance.put(`/forums/${postId}`, {
        title: newTitle,
        content: newContent,
      });

      setForum(res.data.forum);
    } catch (err) {
      console.error("Update forum failed:", err);
    }
  };

  const handleDeleteForum = async () => {
    if (!postId || !confirm("Are you sure you want to delete this forum?"))
      return;

    try {
      await axiosInstance.delete(`/forums/${postId}`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Delete forum failed:", err);
    }
  };

  const handleSaveForum = async () => {
    if (!postId || voting) return;

    try {
      setIsSaving(true);
      const res = await axiosInstance.post(`/forums/${postId}/save`);
      const newSavedState = res.data.saved ?? false;
      setIsForumSaved(newSavedState);

      // Update localStorage cache for FeedTab
      const savedForums = JSON.parse(
        localStorage.getItem("savedForums") || "[]",
      );
      const savedSet = new Set<string>(savedForums);
      if (newSavedState) {
        savedSet.add(postId);
      } else {
        savedSet.delete(postId);
      }
      localStorage.setItem("savedForums", JSON.stringify([...savedSet]));
    } catch (err) {
      console.error("Save forum failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Derived display values
  const subjectName = forum?.subjects?.name ?? "—";
  const authorName = forum?.users?.name ?? "Unknown";
  const title = forum?.title ?? "";
  const body = forum?.content ?? "";
  const isAuthor = me?.id && forum?.users?.id && me.id === forum.users.id;

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          <div
            className={`${isCollapsed ? "max-w-7xl" : "max-w-6xl"} mx-auto space-y-6`}
          >
            {/* Back Button */}
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Feed
            </button>

            {/* Loading / Error */}
            {loading && (
              <BrutalCard className="p-6">
                <p className="font-medium">Loading post…</p>
              </BrutalCard>
            )}

            {!loading && errorMsg && (
              <BrutalCard className="p-6">
                <p className="font-bold text-destructive mb-2">
                  Could not load forum
                </p>
                <p className="text-muted-foreground">{errorMsg}</p>
                <div className="mt-4">
                  <BrutalButton
                    variant="primary"
                    onClick={() => navigate("/dashboard")}
                  >
                    Go back
                  </BrutalButton>
                </div>
              </BrutalCard>
            )}

            {/* Post Card */}
            {!loading && !errorMsg && forum && (
              <BrutalCard className="overflow-hidden">
                <div className="flex">
                  {/* Main Content */}
                  <div className="flex-1 p-6">
                    {/* Header with Tags and Actions */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start gap-3">
                        <BrutalTag color="violet">{subjectName}</BrutalTag>

                        {(forum.is_ai_verified ?? false) && (
                          <BrutalTag color="teal">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Verified
                          </BrutalTag>
                        )}
                      </div>

                      {/* Forum Actions */}
                      <div className="flex items-center gap-2">
                        <BrutalButton
                          variant="outline"
                          size="sm"
                          onClick={handleSaveForum}
                          disabled={isSaving}
                          className={`text-xs ${isForumSaved ? "bg-mint text-foreground" : ""}`}
                        >
                          {isSaving
                            ? "..."
                            : isForumSaved
                              ? "✓ Saved"
                              : "💾 Save"}
                        </BrutalButton>

                        {isAuthor && (
                          <>
                            <BrutalButton
                              variant="outline"
                              size="sm"
                              onClick={handleUpdateForum}
                              className="text-xs"
                            >
                              ✎ Edit
                            </BrutalButton>
                            <BrutalButton
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteForum}
                              className="text-xs text-destructive"
                            >
                              🗑 Delete
                            </BrutalButton>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold mb-3">{title}</h1>

                    {/* Author */}
                    <p className="text-muted-foreground mb-6">
                      by{" "}
                      <span className="font-semibold text-foreground">
                        {authorName}
                      </span>
                    </p>

                    {/* Content */}
                    <div className="prose prose-lg max-w-none">
                      {body.split("\n").map((paragraph, i) => (
                        <p key={i} className="mb-4 text-foreground">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {forum.document_url && (
                      <div
                        onClick={() =>
                          window.open(
                            forum.document_url!,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="mt-8 cursor-pointer border-[3px] border-foreground rounded-lg p-5 bg-muted/30 hover:bg-muted/50 transition-all shadow-brutal-sm hover:translate-y-[-2px] hover:shadow-brutal"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border-[3px] border-foreground rounded-lg flex items-center justify-center bg-background font-bold">
                            📄
                          </div>

                          <div>
                            <p className="font-bold text-lg">
                              {getFileNameFromUrl(forum.document_url)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Click to open document
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Summary */}
                    {forum.ai_summary && (
                      <div className="mt-8 p-5 bg-blue/10 border-[3px] border-blue rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-blue rounded-lg border-2 border-foreground flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-foreground" />
                          </div>
                          <h3 className="font-bold text-lg">AI Summary</h3>
                        </div>
                        <p className="text-muted-foreground">
                          {forum.ai_summary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Vote Panel */}
                  <div className="flex flex-col items-center justify-start gap-3 p-6 min-w-[100px] border-l-4 border-foreground bg-yellow">
                    <button
                      type="button"
                      disabled={voting}
                      onClick={handleUpvote}
                      className={`
                      w-12 h-12 bg-background border-[3px] border-foreground rounded-lg shadow-brutal-sm
                      flex items-center justify-center transition-all
                      hover:translate-y-[-2px] hover:shadow-brutal
                      active:translate-y-[2px] active:shadow-none
                      ${myVote === 1 ? "ring-2 ring-foreground bg-teal/20" : ""}
                      ${voting ? "opacity-60 cursor-not-allowed" : ""}
                    `}
                    >
                      <ArrowUp
                        className={`w-6 h-6 ${myVote === 1 ? "text-foreground" : "text-teal"}`}
                      />
                    </button>

                    <span className="text-2xl font-bold">{voteCount}</span>

                    <button
                      type="button"
                      disabled={voting}
                      onClick={handleDownvote}
                      className={`
                      w-12 h-12 bg-background border-[3px] border-foreground rounded-lg shadow-brutal-sm
                      flex items-center justify-center transition-all
                      hover:translate-y-[-2px] hover:shadow-brutal
                      active:translate-y-[2px] active:shadow-none
                      ${myVote === -1 ? "ring-2 ring-foreground bg-destructive/20" : ""}
                      ${voting ? "opacity-60 cursor-not-allowed" : ""}
                    `}
                    >
                      <ArrowDown
                        className={`w-6 h-6 ${
                          myVote === -1 ? "text-foreground" : "text-destructive"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </BrutalCard>
            )}

            {/* Comments Section */}
            {!loading && !errorMsg && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">
                    {forum?.comments_count ?? countComments(comments)} Comments
                  </h2>
                </div>

                {/* Comment input - minimal, at top (copied from OLD design) */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full border-[2px] border-foreground flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                    {(me?.name?.[0] ?? "Y").toUpperCase()}
                  </div>

                  <div className="flex-1 flex items-center bg-muted/30 border-[2px] border-foreground rounded-lg overflow-hidden">
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2.5 bg-transparent font-medium focus:outline-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment();
                      }}
                    />

                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-3 py-2.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
                      aria-label="Post comment"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3 pl-11 overflow-visible">
                  {comments.map((comment, index) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      currentUserId={me?.id ?? ""}
                      onVote={handleVote}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReply={handleReply}
                      isLast={index === comments.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
