import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useSocket } from "@/components/SocketContext";
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  FileText,
  Image,
  File,
  Reply,
  Calendar,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  Hash,
} from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import AIBadge from "@/components/AIBadge";
import { PostDetailsSkeleton } from "@/components/SkeletonLoaders";
import CreatePostModal from "@/components/CreatePostModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { toast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  user_id?: string;
  author: string;
  initials: string;
  profileUrl?: string | null;
  timestamp: string;
  originalCreatedAt: string;
  text: string;
  upvotes: number;
  downvotes: number;
  myVote: 1 | -1 | null;
  isVerified?: boolean;
  isAuthor?: boolean;
  replies?: Comment[];
}

interface BackendForum {
  id: string;
  user_id: string;
  title: string;
  content: string;
  document_url?: string | null;
  ai_summary?: string | null;
  is_ai_verified?: boolean;
  comments_count?: number;
  upvotes_count?: number;
  downvotes_count?: number;
  created_at: string;
  user?: {
    // changed from 'users' to 'user'
    id?: string;
    name?: string;
    profile_url?: string | null;
    school?: string;
  } | null;
  tags?: { id: string; name: string; slug?: string }[];
  subject?: {
    // changed from 'subjects' to 'subject'
    id?: string;
    name?: string;
  } | null;
}

interface BackendComment {
  id: string;
  forum_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  content: string;
  created_at: string;
  upvotes_count?: number;
  downvotes_count?: number;
  users?: {
    id?: string;
    name?: string;
    profile_url?: string | null;
  } | null;
}

const getInitials = (name?: string | null) => {
  if (!name) return "UN";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getCurrentUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return {
        id: parsed?.id || parsed?.user_id || null,
        name: parsed?.name || "You",
        initials: getInitials(parsed?.name || "You"),
        profileUrl: parsed?.profile_url || null,
      };
    }

    const id =
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("id");

    return {
      id: id || null,
      name: "You",
      initials: "YO",
    };
  } catch {
    return {
      id: null,
      name: "You",
      initials: "YO",
    };
  }
};

const CURRENT_USER = getCurrentUser();

const buildCommentTree = (
  comments: (BackendComment & { myVote?: 1 | -1 | null })[],
  currentUserId: string | null,
): Comment[] => {
  const map = new Map<string, Comment>();

  comments.forEach((comment) => {
    map.set(comment.id, {
      id: comment.id,
      user_id: comment.user_id,
      author: comment.users?.name || "Unknown User",
      initials: getInitials(comment.users?.name),
      profileUrl: comment.users?.profile_url || null,
      timestamp: formatElapsedTime(comment.created_at),
      originalCreatedAt: comment.created_at, // <-- new
      text: comment.content,
      upvotes: comment.upvotes_count || 0,
      downvotes: comment.downvotes_count || 0,
      myVote: comment.myVote ?? null,
      isVerified: false,
      isAuthor: currentUserId ? comment.user_id === currentUserId : false,
      replies: [],
    });
  });

  const roots: Comment[] = [];

  comments.forEach((comment) => {
    const node = map.get(comment.id)!;
    const parentId = comment.parent_comment_id;

    if (parentId && map.has(parentId)) {
      map.get(parentId)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const countCommentsRecursive = (list: Comment[]): number =>
  list.reduce((total, item) => {
    return total + 1 + countCommentsRecursive(item.replies || []);
  }, 0);

const updateCommentInTree = (
  list: Comment[],
  commentId: string,
  updater: (comment: Comment) => Comment,
): Comment[] =>
  list.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    return {
      ...comment,
      replies: comment.replies
        ? updateCommentInTree(comment.replies, commentId, updater)
        : [],
    };
  });

const formatElapsedTime = (dateString?: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  // Today → show elapsed
  if (isSameDay) {
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  }

  // Yesterday
  if (isYesterday) {
    return "Yesterday";
  }

  // Older → fallback date
  return date.toLocaleDateString();
};

const deleteCommentFromTree = (list: Comment[], commentId: string): Comment[] =>
  list
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: comment.replies
        ? deleteCommentFromTree(comment.replies, commentId)
        : [],
    }));

const CommentComponent = ({
  comment,
  depth = 0,
  onEdit,
  onDelete,
  onVote,
  onReply,
}: {
  comment: Comment;
  depth?: number;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onVote: (id: string, voteType: 1 | -1) => void;
  onReply: (parentCommentId: string, text: string) => Promise<void>;
}) => {
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // ... existing handlers (handleReplySubmit, handleSaveEdit) unchanged ...

  return (
    <div
      className={`${depth > 0 ? "ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-border" : ""}`}>
      <div className="py-3 sm:py-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Avatar + Name (clickable link) */}
          <Link
            to={`/${encodeURIComponent(comment.author)}`}
            className="flex items-center gap-2 sm:gap-3 shrink-0"
            onClick={(e) => e.stopPropagation()}>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
              {comment.profileUrl ? (
                <img
                  src={comment.profileUrl}
                  alt={comment.author}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] sm:text-xs font-semibold text-primary">
                  {comment.initials}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              {comment.author}
            </span>
          </Link>

          {/* Rest of the row (badges, timestamp, menu) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1">
            {comment.isAuthor && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                You
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {comment.timestamp}
            </span>
            {comment.isVerified && <AIBadge variant="comment" />}

            {comment.isAuthor && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-lg border border-border bg-card shadow-lg py-1">
                    <button
                      onClick={() => {
                        setEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comment text (unchanged) */}
        {editing ? (
          <div className="mt-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditText(comment.text);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90 mt-1.5 leading-relaxed">
            {comment.text}
          </p>
        )}

        {/* Vote and reply buttons (unchanged) */}
        <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
          <button
            onClick={() => onVote(comment.id, 1)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              comment.myVote === 1
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <ArrowBigUp
              className={`h-4 w-4 ${comment.myVote === 1 ? "fill-primary" : ""}`}
            />
            {comment.upvotes}
          </button>

          <button
            onClick={() => onVote(comment.id, -1)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              comment.myVote === -1
                ? "text-destructive font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <ArrowBigDown
              className={`h-4 w-4 ${comment.myVote === -1 ? "fill-destructive" : ""}`}
            />
            {comment.downvotes}
          </button>

          <button
            onClick={() => setShowReplyBox((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
        </div>
      </div>

      {/* Reply box and replies (unchanged) */}
      {showReplyBox && (
        <div className="mt-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to ${comment.author}...`}
            disabled={isSubmittingReply}
            rows={3}
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none disabled:opacity-60"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setShowReplyBox(false);
                setReplyText("");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleReplySubmit}
              disabled={isSubmittingReply || !replyText.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmittingReply ? "Replying..." : "Reply"}
            </button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <>
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-primary font-medium ml-9 sm:ml-11 mb-1 hover:underline">
            {showReplies ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {comment.replies.length}{" "}
            {comment.replies.length === 1 ? "reply" : "replies"}
          </button>

          {showReplies &&
            comment.replies.map((reply) => (
              <CommentComponent
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onVote={onVote}
                onReply={onReply}
              />
            ))}
        </>
      )}

      <DeleteConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete(comment.id)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
      />
    </div>
  );
};

const PostDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [postData, setPostData] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [saved, setSaved] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { socket } = useSocket();

  // Socket listeners
  useEffect(() => {
    if (!socket || !id) return;

    // Join the room for this post
    if (socket.connected) {
      socket.emit("join_post_room", id);
    } else {
      socket.once("connect", () => {
        socket.emit("join_post_room", id);
      });
    }

    // Helper to check if a comment already exists (prevents duplicates)
    const commentExists = (list: Comment[], targetId: string): boolean => {
      for (const c of list) {
        if (c.id === targetId) return true;
        if (c.replies && commentExists(c.replies, targetId)) return true;
      }
      return false;
    };

    // --- New comment ---
    const onCommentCreated = (comment: BackendComment) => {
      if (comment.forum_id !== id) return;
      if (CURRENT_USER.id === comment.user_id) return;
      setComments((prev) => {
        // Avoid adding duplicate (from optimistic update)
        if (commentExists(prev, comment.id)) return prev;

        const newComment: Comment = {
          id: comment.id,
          user_id: comment.user_id,
          author: comment.users?.name || "Unknown User",
          initials: getInitials(comment.users?.name),
          profileUrl: comment.users?.profile_url || null,
          timestamp: formatElapsedTime(comment.created_at),
          originalCreatedAt: comment.created_at,
          text: comment.content,
          upvotes: comment.upvotes_count || 0,
          downvotes: comment.downvotes_count || 0,
          myVote: null,
          isVerified: false,
          isAuthor: CURRENT_USER.id === comment.user_id,
          replies: [],
        };

        if (comment.parent_comment_id) {
          // Insert as reply
          const insertReply = (list: Comment[]): Comment[] =>
            list.map((c) => {
              if (c.id === comment.parent_comment_id) {
                return { ...c, replies: [...(c.replies || []), newComment] };
              }
              if (c.replies) {
                return { ...c, replies: insertReply(c.replies) };
              }
              return c;
            });
          return insertReply(prev);
        } else {
          // Top-level comment
          return [newComment, ...prev];
        }
      });

      setPostData((prev: any) => ({
        ...prev,
        comments: (prev?.comments || 0) + 1,
      }));
    };

    // --- Edit comment ---
    const onCommentUpdated = (updated: BackendComment) => {
      if (updated.forum_id !== id) return;

      setComments((prev) =>
        updateCommentInTree(prev, updated.id, (c) => ({
          ...c,
          text: updated.content,
          upvotes: updated.upvotes_count || 0,
          downvotes: updated.downvotes_count || 0,
        })),
      );
    };

    // --- Delete comment ---
    const onCommentDeleted = (data: { commentId: string; forumId: string }) => {
      if (data.forumId !== id) return;

      setComments((prev) => deleteCommentFromTree(prev, data.commentId));
      setPostData((prev: any) => ({
        ...prev,
        comments: Math.max((prev?.comments || 1) - 1, 0),
      }));
    };

    // --- Vote on comment ---
    const onCommentVoted = (data: {
      commentId: string;
      voteType: 1 | -1 | null;
      upvotes: number;
      downvotes: number;
      userId: string;
    }) => {
      setComments((prev) =>
        updateCommentInTree(prev, data.commentId, (c) => ({
          ...c,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
          myVote: data.userId === CURRENT_USER.id ? data.voteType : c.myVote,
        })),
      );
    };

    // Register listeners
    socket.on("comment_created", onCommentCreated);
    socket.on("comment_updated", onCommentUpdated);
    socket.on("comment_deleted", onCommentDeleted);
    socket.on("comment_voted", onCommentVoted);

    // Cleanup on unmount
    return () => {
      socket.off("comment_created", onCommentCreated);
      socket.off("comment_updated", onCommentUpdated);
      socket.off("comment_deleted", onCommentDeleted);
      socket.off("comment_voted", onCommentVoted);
      socket.emit("leave_post_room", id);
    };
  }, [socket, id]);

  const handleReplyToComment = async (
    parentCommentId: string,
    text: string,
  ) => {
    try {
      const res = await axiosInstance.post(`/forums/${id}/comments`, {
        content: text,
        parent_comment_id: parentCommentId,
      });

      const created = res.data?.comment;

      const mappedReply: Comment = {
        id: created.id,
        user_id: created.user_id,
        author: created.users?.name || CURRENT_USER.name,
        initials: getInitials(created.users?.name || CURRENT_USER.name),
        profileUrl: created.users?.profile_url || CURRENT_USER.profileUrl,
        timestamp: formatElapsedTime(created.created_at),
        originalCreatedAt: created.created_at,
        text: created.content,
        upvotes: created.upvotes_count || 0,
        downvotes: created.downvotes_count || 0,
        myVote: null,
        isAuthor: true,
        replies: [],
      };

      const insertReplyIntoTree = (list: Comment[]): Comment[] =>
        list.map((comment) => {
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), mappedReply],
            };
          }

          return {
            ...comment,
            replies: comment.replies
              ? insertReplyIntoTree(comment.replies)
              : [],
          };
        });

      setComments((prev) => insertReplyIntoTree(prev));
      setPostData((prev: any) => ({
        ...prev,
        comments: (prev?.comments || 0) + 1,
      }));

      toast({ title: "Reply posted!" });
    } catch (err: any) {
      console.error("Create reply error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to post reply",
        variant: "destructive",
      });
    }
  };

  const fetchPostDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      const requests: Promise<any>[] = [
        axiosInstance.get(`/forums/${id}`),
        axiosInstance.get(`/forums/${id}/comments`),
      ];

      if (CURRENT_USER.id) {
        requests.push(
          axiosInstance
            .get(`/forums/${id}/save`)
            .catch(() => ({ data: { saved: false } })),
        );
        requests.push(
          axiosInstance
            .get(`/forums/${id}/my-vote`)
            .catch(() => ({ data: { voteType: null } })),
        );
      }

      const [forumRes, commentsRes, saveRes, voteRes] =
        await Promise.all(requests);

      const forum: BackendForum = forumRes.data?.forum;
      const forumTags = forum.tags || [];
      const userSchool = forum.user?.school || "";
      const rawComments: BackendComment[] = commentsRes.data?.comments || [];

      const commentsWithVoteState = await Promise.all(
        rawComments.map(async (comment) => {
          if (!CURRENT_USER.id) {
            return { ...comment, myVote: null as 1 | -1 | null };
          }

          try {
            const res = await axiosInstance.get(
              `/comments/${comment.id}/my-vote`,
            );
            return {
              ...comment,
              myVote: (res.data?.voteType ?? null) as 1 | -1 | null,
            };
          } catch {
            return { ...comment, myVote: null as 1 | -1 | null };
          }
        }),
      );

      const mappedPost = {
        id: forum.id,
        user_id: forum.user_id,
        created_at: forum.created_at,
        subject_id: forum.subject?.id || "",
        title: forum.title,
        author: forum.user?.name || "Unknown User",
        authorInitials: getInitials(forum.user?.name),
        authorProfileUrl: forum.user?.profile_url || null,
        authorSchool: userSchool,
        university: forum.subject?.name || "General",
        field: "",
        content: forum.content,
        aiSummary: forum.ai_summary || "",
        upvotes: forum.upvotes_count || 0,
        downvotes: forum.downvotes_count || 0,
        comments: forum.comments_count || 0,
        tag: forum.subject?.name || "General",
        fileName: forum.document_url || "",
        isAiVerified: forum.is_ai_verified || false,
        tags: forumTags,
      };

      setPostData(mappedPost);
      const tree = buildCommentTree(commentsWithVoteState, CURRENT_USER.id);
      // Sort top-level comments by originalCreatedAt descending (newest first)
      tree.sort(
        (a, b) =>
          new Date(b.originalCreatedAt).getTime() -
          new Date(a.originalCreatedAt).getTime(),
      );
      setComments(tree);

      if (saveRes?.data) {
        setSaved(!!saveRes.data.saved);
      }

      if (voteRes?.data?.voteType === 1) {
        setUpvoted(true);
        setDownvoted(false);
      } else if (voteRes?.data?.voteType === -1) {
        setDownvoted(true);
        setUpvoted(false);
      } else {
        setUpvoted(false);
        setDownvoted(false);
      }
    } catch (err: any) {
      console.error("Fetch post detail error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to load post details",
        variant: "destructive",
      });
      navigate("/feed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatElapsedTime = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    const isSameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    // Today → show elapsed
    if (isSameDay) {
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
    }

    // Yesterday
    if (isYesterday) {
      return "Yesterday";
    }

    // Older → fallback date
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchPostDetails();
  }, [id]);

  const isPostAuthor = postData?.user_id === CURRENT_USER.id;

  const handleAddComment = async () => {
    if (isSubmittingComment) return;

    if (!newComment.trim()) {
      toast({ title: "Comment cannot be empty", variant: "destructive" });
      return;
    }

    try {
      setIsSubmittingComment(true);

      const res = await axiosInstance.post(`/forums/${id}/comments`, {
        content: newComment.trim(),
      });

      const created = res.data?.comment;

      const mappedComment: Comment = {
        id: created.id,
        user_id: created.user_id,
        author: created.users?.name || CURRENT_USER.name,
        initials: getInitials(created.users?.name || CURRENT_USER.name),
        profileUrl: created.users?.profile_url || CURRENT_USER.profileUrl,
        timestamp: formatElapsedTime(created.created_at),
        originalCreatedAt: created.created_at,
        text: created.content,
        upvotes: created.upvotes_count || 0,
        downvotes: created.downvotes_count || 0,
        myVote: null,
        isAuthor: true,
        replies: [],
      };

      setComments((prev) => [mappedComment, ...prev]);
      setNewComment("");
      setPostData((prev: any) => ({
        ...prev,
        comments: (prev?.comments || 0) + 1,
      }));

      toast({ title: "Comment posted!" });
    } catch (err: any) {
      console.error("Create comment error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Add this helper above getFileNameFromUrl
  const formatDocumentName = (rawName: string): string => {
    // Remove common file extensions
    let name = rawName.replace(/\.(pdf|docx?|txt|jpg|png|gif|zip)$/i, "");
    // Strip leading numbers, dashes, underscores
    name = name.replace(/^[\d\-_]+/, "");
    // Replace dashes and underscores with spaces
    name = name.replace(/[-_]/g, " ");
    // Capitalize each word
    name = name.replace(/\b\w/g, (char) => char.toUpperCase());
    return name || rawName; // fallback to original if result is empty
  };

  // Then replace the existing getFileNameFromUrl with:
  const getFileNameFromUrl = (url?: string | null) => {
    if (!url) return "Attachment";

    try {
      const cleanUrl = url.split("?")[0];
      const fileName = cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1);
      const decoded = decodeURIComponent(fileName) || "Attachment";
      return formatDocumentName(decoded);
    } catch {
      return "Attachment";
    }
  };

  const handleEditComment = async (commentId: string, text: string) => {
    try {
      const res = await axiosInstance.put(`/comments/${commentId}`, {
        content: text,
      });

      const updated = res.data?.comment;

      setComments((prev) =>
        updateCommentInTree(prev, commentId, (comment) => ({
          ...comment,
          text: updated?.content || text,
        })),
      );

      toast({ title: "Comment updated!" });
    } catch (err: any) {
      console.error("Update comment error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to update comment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await axiosInstance.delete(`/comments/${commentId}`);

      setComments((prev) => deleteCommentFromTree(prev, commentId));
      setPostData((prev: any) => ({
        ...prev,
        comments: Math.max((prev?.comments || 1) - 1, 0),
      }));

      toast({ title: "Comment deleted." });
    } catch (err: any) {
      console.error("Delete comment error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const handleVoteComment = async (commentId: string, voteType: 1 | -1) => {
    const targetComment = (() => {
      const findInTree = (list: Comment[]): Comment | null => {
        for (const comment of list) {
          if (comment.id === commentId) return comment;
          const found = findInTree(comment.replies || []);
          if (found) return found;
        }
        return null;
      };
      return findInTree(comments);
    })();

    if (!targetComment) return;

    try {
      if (targetComment.myVote === voteType) {
        const res = await axiosInstance.delete(`/comments/${commentId}/vote`);
        const counts = res.data?.voteCount || { upvotes: 0, downvotes: 0 };

        setComments((prev) =>
          updateCommentInTree(prev, commentId, (comment) => ({
            ...comment,
            myVote: null,
            upvotes: counts.upvotes,
            downvotes: counts.downvotes,
          })),
        );
      } else {
        const res = await axiosInstance.post(`/comments/${commentId}/vote`, {
          voteType,
        });
        const counts = res.data?.voteCount || { upvotes: 0, downvotes: 0 };

        setComments((prev) =>
          updateCommentInTree(prev, commentId, (comment) => ({
            ...comment,
            myVote: voteType,
            upvotes: counts.upvotes,
            downvotes: counts.downvotes,
          })),
        );
      }
    } catch (err: any) {
      console.error("Vote comment error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to update comment vote",
        variant: "destructive",
      });
    }
  };

  const handleEditPost = async (data: {
    title: string;
    content: string;
    category: string;
    fileName?: string;
  }) => {
    try {
      await axiosInstance.put(`/forums/${id}`, {
        title: data.title,
        content: data.content,
        subject_id: postData.subject_id,
        document_url: data.fileName || null,
      });

      setPostData((prev: any) => ({
        ...prev,
        title: data.title,
        content: data.content,
        fileName: data.fileName || "",
      }));

      setShowEditModal(false);
      toast({ title: "Post updated!" });
    } catch (err: any) {
      console.error("Update post error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to update post",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async () => {
    try {
      await axiosInstance.delete(`/forums/${id}`);
      toast({ title: "Post deleted.", description: "Redirecting to feed..." });
      setTimeout(() => navigate("/feed"), 500);
    } catch (err: any) {
      console.error("Delete post error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const handleVotePost = async (type: 1 | -1) => {
    try {
      if ((type === 1 && upvoted) || (type === -1 && downvoted)) {
        const res = await axiosInstance.delete(`/forums/${id}/vote`);
        const counts = res.data?.voteCount || { upvotes: 0, downvotes: 0 };

        setUpvoted(false);
        setDownvoted(false);
        setPostData((prev: any) => ({
          ...prev,
          upvotes: counts.upvotes,
          downvotes: counts.downvotes,
        }));
        return;
      }

      const res = await axiosInstance.post(`/forums/${id}/vote`, {
        voteType: type,
      });

      const counts = res.data?.voteCount || { upvotes: 0, downvotes: 0 };

      setUpvoted(type === 1);
      setDownvoted(type === -1);
      setPostData((prev: any) => ({
        ...prev,
        upvotes: counts.upvotes,
        downvotes: counts.downvotes,
      }));
    } catch (err: any) {
      console.error("Vote error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to update vote",
        variant: "destructive",
      });
    }
  };

  const handleToggleSave = async () => {
    try {
      const res = await axiosInstance.post(`/forums/${id}/save`);
      setSaved(!!res.data?.saved);
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to update save status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <PostDetailsSkeleton />;
  if (!postData) return null;

  const totalComments = postData.comments || countCommentsRecursive(comments);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
      <Link
        to="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Feed
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
            {postData.tag}
          </span>
          {postData.isAiVerified && <AIBadge variant="verified" />}

          {isPostAuthor && (
            <div className="relative ml-auto">
              <button
                onClick={() => setShowPostMenu(!showPostMenu)}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {showPostMenu && (
                <div className="absolute right-0 top-full mt-1 z-10 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
                  <button
                    onClick={() => {
                      setShowEditModal(true);
                      setShowPostMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit Post
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowPostMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight mb-4">
          {postData.title}
        </h1>
        <div className="flex items-start sm:items-center gap-3 mb-6 flex-col sm:flex-row">
          <Link
            to={`/${encodeURIComponent(postData.author)}`}
            className="flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {postData.authorProfileUrl ? (
                <img
                  src={postData.authorProfileUrl}
                  alt={postData.author}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  {postData.authorInitials}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {postData.author}
                </p>
                {isPostAuthor && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Author
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {postData.authorSchool ? `${postData.authorSchool} • ` : ""}
                {postData.university}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground sm:ml-auto">
            <Calendar className="h-3.5 w-3.5" />{" "}
            {formatElapsedTime(postData.created_at)}
          </div>
        </div>

        <div className="prose prose-sm max-w-none mb-8">
          {postData.content
            .split("\n\n")
            .map((paragraph: string, i: number) => {
              if (paragraph.startsWith("## "))
                return (
                  <h2
                    key={i}
                    className="text-base sm:text-lg font-heading font-semibold text-foreground mt-6 mb-3">
                    {paragraph.replace("## ", "")}
                  </h2>
                );
              if (paragraph.startsWith("- "))
                return (
                  <ul key={i} className="space-y-1 mb-4">
                    {paragraph.split("\n").map((item: string, j: number) => (
                      <li
                        key={j}
                        className="text-sm text-foreground/90 leading-relaxed ml-4 list-disc">
                        {item.replace("- ", "")}
                      </li>
                    ))}
                  </ul>
                );
              return (
                <p
                  key={i}
                  className="text-sm text-foreground/90 leading-relaxed mb-4"
                  style={{ whiteSpace: "pre-wrap" }}
                  dangerouslySetInnerHTML={{
                    __html: paragraph.replace(
                      /\*\*(.*?)\*\*/g,
                      "<strong>$1</strong>",
                    ),
                  }}
                />
              );
            })}
        </div>
        {/* Tags row */}
        {postData.tags && postData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {postData.tags.map((tag: { id: string; name: string }) => (
              <button
                key={tag.id}
                onClick={() => navigate(`/feed?tagId=${tag.id}`)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors">
                <Hash className="h-2.5 w-2.5" />
                {tag.name}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowAiSummary(!showAiSummary)}
          className="w-full rounded-lg bg-ai-subtle border cursor-pointer border-ai/10 p-3 mb-6 text-left hover:border-ai/20 transition-colors">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-ai" />
            <span className="text-sm font-medium text-ai">AI Summary</span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-ai ml-auto transition-transform ${showAiSummary ? "rotate-180" : ""}`}
            />
          </div>
          {showAiSummary && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {postData.aiSummary || "No AI summary available."}
            </motion.p>
          )}
        </button>
        {postData.fileName && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Attachment
            </h3>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              <a
                href={postData.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-muted-foreground hover:border-primary/20 hover:text-foreground transition-colors cursor-pointer">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {getFileNameFromUrl(postData.fileName)}
                </span>
              </a>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2 border-t border-b border-border py-3 mb-8 overflow-x-auto">
          <button
            onClick={() => handleVotePost(1)}
            className={`flex items-center gap-1 sm:gap-1.5 cursor-pointer rounded-lg px-2 sm:px-3 py-2 text-sm transition-colors shrink-0 ${
              upvoted
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            <ArrowBigUp
              className={`h-5 w-5 ${upvoted ? "fill-primary" : ""}`}
            />
            <span>{postData.upvotes || 0}</span>
          </button>

          <button
            onClick={() => handleVotePost(-1)}
            className={`flex items-center gap-1 sm:gap-1.5 cursor-pointer rounded-lg px-2 sm:px-3 py-2 text-sm transition-colors shrink-0 ${
              downvoted
                ? "bg-destructive/10 text-destructive font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            <ArrowBigDown
              className={`h-5 w-5 ${downvoted ? "fill-destructive" : ""}`}
            />
            <span>{postData.downvotes || 0}</span>
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button className="flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{totalComments}</span>
          </button>

          <button
            onClick={handleToggleSave}
            className={`ml-auto flex items-center cursor-pointer gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm transition-colors shrink-0 ${
              saved
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            {saved ? (
              <BookmarkCheck className="h-4 w-4 fill-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
          </button>
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" /> Comments (
            {totalComments})
          </h2>

          <div className="flex gap-2 sm:gap-3 mb-6">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] sm:text-xs font-semibold text-primary">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {CURRENT_USER.profileUrl ? (
                    <img
                      src={CURRENT_USER.profileUrl}
                      alt={CURRENT_USER.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] sm:text-xs font-semibold text-primary">
                      {CURRENT_USER.initials}
                    </span>
                  )}
                </div>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                disabled={isSubmittingComment}
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none font-body disabled:opacity-60"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmittingComment ? "Posting..." : "Comment"}
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {comments
              .filter(
                (comment, index, self) =>
                  index === self.findIndex((c) => c.id === comment.id),
              )
              .map((comment) => (
                <CommentComponent
                  key={comment.id}
                  comment={comment}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onVote={handleVoteComment}
                  onReply={handleReplyToComment}
                />
              ))}
          </div>
        </div>
      </motion.article>

      <CreatePostModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialData={{
          title: postData.title,
          content: postData.content,
          category: postData.tag,
          fileName: postData.fileName,
        }}
        mode="edit"
        forumId={postData.id}
        onSuccess={fetchPostDetails}
      />

      <DeleteConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone. All comments and attached files will be removed."
      />
    </div>
  );
};

export default PostDetails;
