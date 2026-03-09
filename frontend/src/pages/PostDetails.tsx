import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowBigUp, ArrowBigDown, MessageCircle, Bookmark, BookmarkCheck,
  Sparkles, FileText, Image, File, Reply, Calendar, ChevronDown, ChevronUp,
  MoreHorizontal, Pencil, Trash2
} from "lucide-react";
import AIBadge from "@/components/AIBadge";
import { PostDetailsSkeleton } from "@/components/SkeletonLoaders";
import CreatePostModal from "@/components/CreatePostModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { toast } from "@/hooks/use-toast";

// Simulated current user
const CURRENT_USER = { name: "You (Demo User)", initials: "AK" };

interface Comment {
  id: string;
  author: string;
  initials: string;
  timestamp: string;
  text: string;
  upvotes: number;
  isVerified?: boolean;
  isAuthor?: boolean;
  replies?: Comment[];
}

const initialPostData = {
  title: "Attention Is All You Need — Revisited in 2026",
  author: CURRENT_USER.name,
  authorInitials: CURRENT_USER.initials,
  university: "Stanford University",
  field: "NLP · Deep Learning",
  date: "March 2, 2026",
  content: `Three years after the transformer revolution, it's time to take stock of what has changed, what remains, and what new architectures are challenging the dominant paradigm.

The original "Attention Is All You Need" paper fundamentally changed the landscape of machine learning. Self-attention mechanisms replaced recurrence entirely, enabling unprecedented parallelization and scaling. But the field hasn't stood still.

## The Challengers

**State Space Models (SSMs)** like Mamba have demonstrated competitive performance on long-sequence tasks while maintaining linear complexity. Their ability to handle sequences of 100K+ tokens without the quadratic cost of attention is compelling.

**RWKV** offers another alternative, combining the training parallelism of transformers with the inference efficiency of RNNs. Its "linear attention" mechanism is particularly interesting for edge deployment.

## What Remains

Despite these challengers, transformers continue to dominate in several areas:

- **Few-shot learning**: The attention mechanism's ability to dynamically route information remains unmatched.
- **Multimodal reasoning**: Vision transformers and their variants power the best multimodal models.
- **Scale**: The largest and most capable models are still transformer-based.

## Looking Forward

The future likely isn't "transformers vs. alternatives" but rather hybrid architectures that combine the strengths of multiple approaches. Early work on Mamba-Transformer hybrids shows promising results.`,
  aiSummary: "Compares original transformer architecture with modern alternatives including Mamba, RWKV, and hybrid approaches across standard benchmarks. Finds that while challengers offer efficiency gains, transformers maintain advantages in few-shot learning and multimodal tasks.",
  upvotes: 284,
  comments: 47,
  tag: "Deep Learning",
  fileName: "transformer_analysis.pdf",
};

const initialComments: Comment[] = [
  {
    id: "1",
    author: "Prof. Michael Torres",
    initials: "MT",
    timestamp: "2 hours ago",
    text: "Excellent analysis. I'd add that in biostatistics, we're seeing SSMs outperform transformers on sequential patient data due to their ability to model temporal dependencies without position embeddings.",
    upvotes: 42,
    isVerified: true,
    replies: [
      {
        id: "1-1",
        author: CURRENT_USER.name,
        initials: CURRENT_USER.initials,
        timestamp: "1 hour ago",
        text: "Great point! The temporal modeling advantage is especially relevant for clinical trial data. Have you tried the Mamba-2 architecture for this use case?",
        upvotes: 18,
        isAuthor: true,
        replies: [
          {
            id: "1-1-1",
            author: "Prof. Michael Torres",
            initials: "MT",
            timestamp: "45 min ago",
            text: "We're running experiments with Mamba-2 now. Preliminary results show a 15% improvement in prediction accuracy for adverse event detection.",
            upvotes: 12,
            isVerified: true,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    author: "Lina Kovacs",
    initials: "LK",
    timestamp: "3 hours ago",
    text: "From a formal verification perspective, the simpler recurrence in SSMs makes them much more amenable to correctness proofs. The attention mechanism's dynamic routing is notoriously difficult to verify.",
    upvotes: 31,
    isVerified: true,
  },
  {
    id: "3",
    author: CURRENT_USER.name,
    initials: CURRENT_USER.initials,
    timestamp: "5 hours ago",
    text: "I've been exploring attention-like mechanisms on quantum circuits. The quadratic complexity is actually less problematic there due to quantum parallelism.",
    upvotes: 24,
    isAuthor: true,
  },
];

const CommentComponent = ({
  comment,
  depth = 0,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  depth?: number;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [showReplies, setShowReplies] = useState(true);
  const [upvoted, setUpvoted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveEdit = () => {
    if (!editText.trim()) {
      toast({ title: "Comment cannot be empty", variant: "destructive" });
      return;
    }
    onEdit(comment.id, editText.trim());
    setEditing(false);
    toast({ title: "Comment updated!" });
  };

  return (
    <div className={`${depth > 0 ? "ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-border" : ""}`}>
      <div className="py-3 sm:py-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] sm:text-xs font-semibold text-primary">{comment.initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{comment.author}</span>
              {comment.isAuthor && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">You</span>
              )}
              <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
              {comment.isVerified && <AIBadge variant="comment" />}

              {/* Author-only menu */}
              {comment.isAuthor && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-lg border border-border bg-card shadow-lg py-1">
                      <button
                        onClick={() => { setEditing(true); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {editing ? (
              <div className="mt-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); setEditText(comment.text); }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/90 mt-1.5 leading-relaxed">{comment.text}</p>
            )}

            <div className="flex items-center gap-2 sm:gap-3 mt-2">
              <button
                onClick={() => setUpvoted(!upvoted)}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  upvoted ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowBigUp className={`h-4 w-4 ${upvoted ? "fill-primary" : ""}`} />
                {comment.upvotes + (upvoted ? 1 : 0)}
              </button>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowBigDown className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
            </div>
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <>
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-primary font-medium ml-9 sm:ml-11 mb-1 hover:underline"
          >
            {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
          {showReplies &&
            comment.replies.map((reply) => (
              <CommentComponent key={reply.id} comment={reply} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
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
  const [postData, setPostData] = useState(initialPostData);
  const [comments, setComments] = useState(initialComments);
  const [saved, setSaved] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isPostAuthor = postData.author === CURRENT_USER.name;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast({ title: "Comment cannot be empty", variant: "destructive" });
      return;
    }
    const comment: Comment = {
      id: `new-${Date.now()}`,
      author: CURRENT_USER.name,
      initials: CURRENT_USER.initials,
      timestamp: "Just now",
      text: newComment.trim(),
      upvotes: 0,
      isAuthor: true,
    };
    setComments([comment, ...comments]);
    setNewComment("");
    toast({ title: "Comment posted!" });
  };

  const editCommentRecursive = (list: Comment[], id: string, text: string): Comment[] =>
    list.map((c) => ({
      ...c,
      text: c.id === id ? text : c.text,
      replies: c.replies ? editCommentRecursive(c.replies, id, text) : undefined,
    }));

  const deleteCommentRecursive = (list: Comment[], id: string): Comment[] =>
    list.filter((c) => c.id !== id).map((c) => ({
      ...c,
      replies: c.replies ? deleteCommentRecursive(c.replies, id) : undefined,
    }));

  const handleEditComment = (id: string, text: string) => {
    setComments(editCommentRecursive(comments, id, text));
  };

  const handleDeleteComment = (id: string) => {
    setComments(deleteCommentRecursive(comments, id));
    toast({ title: "Comment deleted." });
  };

  const handleEditPost = (data: { title: string; content: string; category: string; fileName?: string }) => {
    setPostData({ ...postData, title: data.title, content: data.content, tag: data.category, fileName: data.fileName || "" });
  };

  const handleDeletePost = () => {
    toast({ title: "Post deleted.", description: "Redirecting to feed..." });
    setTimeout(() => navigate("/feed"), 500);
  };

  if (isLoading) return <PostDetailsSkeleton />;

  const voteScore = postData.upvotes + (upvoted ? 1 : 0) - (downvoted ? 1 : 0);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
      <Link to="/feed" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Feed
      </Link>

      <motion.article initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{postData.tag}</span>
          <AIBadge variant="verified" />

          {/* Author-only post controls */}
          {isPostAuthor && (
            <div className="relative ml-auto">
              <button
                onClick={() => setShowPostMenu(!showPostMenu)}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {showPostMenu && (
                <div className="absolute right-0 top-full mt-1 z-10 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
                  <button
                    onClick={() => { setShowEditModal(true); setShowPostMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Post
                  </button>
                  <button
                    onClick={() => { setShowDeleteModal(true); setShowPostMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight mb-4">{postData.title}</h1>

        <div className="flex items-start sm:items-center gap-3 mb-6 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-semibold text-primary">{postData.authorInitials}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{postData.author}</p>
                {isPostAuthor && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Author</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{postData.university} · {postData.field}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground sm:ml-auto">
            <Calendar className="h-3.5 w-3.5" /> {postData.date}
          </div>
        </div>

        {/* AI Summary */}
        <button
          onClick={() => setShowAiSummary(!showAiSummary)}
          className="w-full rounded-lg bg-ai-subtle border border-ai/10 p-3 mb-6 text-left hover:border-ai/20 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-ai" />
            <span className="text-sm font-medium text-ai">AI Summary</span>
            <ChevronDown className={`h-3.5 w-3.5 text-ai ml-auto transition-transform ${showAiSummary ? "rotate-180" : ""}`} />
          </div>
          {showAiSummary && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {postData.aiSummary}
            </motion.p>
          )}
        </button>

        {/* Content */}
        <div className="prose prose-sm max-w-none mb-8">
          {postData.content.split("\n\n").map((paragraph, i) => {
            if (paragraph.startsWith("## ")) return <h2 key={i} className="text-base sm:text-lg font-heading font-semibold text-foreground mt-6 mb-3">{paragraph.replace("## ", "")}</h2>;
            if (paragraph.startsWith("- ")) return (
              <ul key={i} className="space-y-1 mb-4">
                {paragraph.split("\n").map((item, j) => (
                  <li key={j} className="text-sm text-foreground/90 leading-relaxed ml-4 list-disc">{item.replace("- ", "")}</li>
                ))}
              </ul>
            );
            return <p key={i} className="text-sm text-foreground/90 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
          })}
        </div>

        {/* Attachments */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Attachments</h3>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            {postData.fileName && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-muted-foreground hover:border-primary/10 transition-colors cursor-pointer">
                <FileText className="h-4 w-4 text-destructive shrink-0" />
                <span className="truncate">{postData.fileName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-muted-foreground hover:border-primary/10 transition-colors cursor-pointer">
              <Image className="h-4 w-4 text-accent shrink-0" />
              <span className="truncate">benchmark_results.png</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-muted-foreground hover:border-primary/10 transition-colors cursor-pointer">
              <File className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">experiment_data.csv</span>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-t border-b border-border py-3 mb-8 overflow-x-auto">
          <button onClick={() => { setUpvoted(!upvoted); if (downvoted) setDownvoted(false); }} className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm transition-colors shrink-0 ${upvoted ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
            <ArrowBigUp className={`h-5 w-5 ${upvoted ? "fill-primary" : ""}`} />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[2rem] text-center">{voteScore}</span>
          <button onClick={() => { setDownvoted(!downvoted); if (upvoted) setUpvoted(false); }} className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm transition-colors shrink-0 ${downvoted ? "bg-destructive/10 text-destructive font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
            <ArrowBigDown className={`h-5 w-5 ${downvoted ? "fill-destructive" : ""}`} />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button className="flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
            <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">{comments.length}</span>
          </button>
          <button onClick={() => setSaved(!saved)} className={`ml-auto flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm transition-colors shrink-0 ${saved ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
            {saved ? <BookmarkCheck className="h-4 w-4 fill-primary" /> : <Bookmark className="h-4 w-4" />}
            <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
          </button>
        </div>

        {/* Comments */}
        <div>
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" /> Comments ({comments.length})
          </h2>

          <div className="flex gap-2 sm:gap-3 mb-6">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] sm:text-xs font-semibold text-primary">{CURRENT_USER.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none font-body"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button onClick={handleAddComment} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  Comment
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {comments.map((comment) => (
              <CommentComponent key={comment.id} comment={comment} onEdit={handleEditComment} onDelete={handleDeleteComment} />
            ))}
          </div>
        </div>
      </motion.article>

      {/* Edit Post Modal */}
      <CreatePostModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditPost}
        initialData={{ title: postData.title, content: postData.content, category: postData.tag, fileName: postData.fileName }}
        mode="edit"
      />

      {/* Delete Post Confirm */}
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
