import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  FileText,
  Hash,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  SquareArrowOutUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIBadge from "./AIBadge";

interface Tag {
  id: string;
  name: string;
}

interface DiscussionCardProps {
  id?: string;
  user_id?: string;
  title: string;
  author: string;
  authorSchool?: string;
  authorInitials: string;
  authorProfileUrl?: string;
  field: string;
  tags?: Tag[];
  preview: string;
  fullContent: string;
  aiSummary?: string;
  documentUrl?: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  userVoteState?: 1 | -1 | null;
  isSaved?: boolean;
  isVerified?: boolean;
  isAiVerified?: boolean;
  tag: string;
  index?: number;
  isOwn?: boolean;
  isAuthor?: boolean;
  created_at?: string;
  onVote?: (voteType: 1 | -1) => Promise<void>;
  onUnvote?: () => Promise<void>;
  onSave?: () => Promise<boolean | void>;
  onTagClick?: (tagId: string) => void;
  onEdit?: (postData: DiscussionCardProps) => void;
  onDelete?: (postId: string) => void;
}

const formatDocumentName = (rawName: string): string => {
  let name = rawName.replace(/\.(pdf|docx?|txt|jpg|png|gif|zip)$/i, "");
  name = name.replace(/^[\d\-_]+/, "");
  name = name.replace(/[-_]/g, " ");
  name = name.replace(/\b\w/g, (char) => char.toUpperCase());
  return name || rawName;
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    path = path.replace(/\/+$/, "");
    const segments = path.split("/");
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      const decoded = decodeURIComponent(lastSegment);
      return formatDocumentName(decoded);
    }
    return "document";
  } catch {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    const cleaned = lastPart.split(/[?#]/)[0];
    const formatted = formatDocumentName(cleaned);
    return formatted || "document";
  }
};

// Helper to format creation date
const formatCreationDate = (dateString?: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "just now";
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    const days = Math.floor(diffDays);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
};

// Helper to render document preview (unchanged)
const renderDocumentPreview = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".pdf")) {
    return (
      <iframe
        src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
        className="w-full h-full min-h-[500px] rounded-lg"
        title="PDF Preview"
      />
    );
  }
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
    return (
      <img
        src={url}
        alt="Document preview"
        className="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto"
      />
    );
  }
  if (lowerUrl.match(/\.(mp4|webm|ogg)$/)) {
    return (
      <video controls className="w-full max-h-[80vh] rounded-lg">
        <source src={url} />
        Your browser does not support the video tag.
      </video>
    );
  }
  return (
    <div className="text-center p-8">
      <p className="text-muted-foreground mb-4">
        Preview not available for this file type.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <FileText className="h-4 w-4" />
        Download file
      </a>
    </div>
  );
};

const DiscussionCard = ({
  id,
  user_id,
  title,
  author,
  authorSchool,
  authorInitials,
  authorProfileUrl,
  field,
  tags = [],
  preview,
  fullContent,
  aiSummary,
  documentUrl,
  upvotes,
  downvotes,
  comments,
  userVoteState,
  isSaved = false,
  isVerified = true,
  isAiVerified,
  onVote,
  onUnvote,
  onSave,
  onTagClick,
  isAuthor = false,
  onEdit,
  onDelete,
  index = 0,
  created_at,
}: DiscussionCardProps) => {
  const navigate = useNavigate();
  const [upvoted, setUpvoted] = useState<boolean>(userVoteState === 1);
  const [downvoted, setDownvoted] = useState<boolean>(userVoteState === -1);
  const [saved, setSaved] = useState<boolean>(isSaved);
  const [isVoting, setIsVoting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  // Sync upvoted/downvoted state with userVoteState prop
  useEffect(() => {
    setUpvoted(userVoteState === 1);
    setDownvoted(userVoteState === -1);
  }, [userVoteState]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isVoting || !onVote || !onUnvote) return;
    setIsVoting(true);
    try {
      if (upvoted) {
        await onUnvote();
        setUpvoted(false);
      } else {
        await onVote(1);
        setUpvoted(true);
        if (downvoted) setDownvoted(false);
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDownvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isVoting || !onVote || !onUnvote) return;
    setIsVoting(true);
    try {
      if (downvoted) {
        await onUnvote();
        setDownvoted(false);
      } else {
        await onVote(-1);
        setDownvoted(true);
        if (upvoted) setUpvoted(false);
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onSave) return;
    try {
      const result = await onSave();
      if (typeof result === "boolean") {
        setSaved(result);
      } else {
        setSaved((prev) => !prev);
      }
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handleTagClick = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(tagId);
    } else {
      navigate(`/feed?tagId=${tagId}`);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit && id) {
      onEdit({
        id,
        user_id,
        title,
        author,
        authorSchool,
        authorInitials,
        authorProfileUrl,
        field,
        tags,
        preview,
        fullContent,
        aiSummary,
        documentUrl,
        upvotes,
        downvotes,
        comments,
        userVoteState,
        isSaved,
        isVerified,
        isAiVerified,
        tag: field,
        isAuthor,
        created_at,
      });
    }
    setShowMenu(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && id) {
      onDelete(id);
    }
    setShowMenu(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, .post-menu, .tag-button, .doc-attachment"))
      return;
    setIsPostModalOpen(true);
  };

  const handleDocumentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (documentUrl) {
      setIsDocModalOpen(true);
    }
  };

  const closePostModal = () => setIsPostModalOpen(false);
  const closeDocModal = () => setIsDocModalOpen(false);

  const formattedDate = formatCreationDate(created_at);

  const renderPostModal = () => (
    <AnimatePresence>
      {isPostModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closePostModal}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-xl border border-border">
            <button
              onClick={closePostModal}
              className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="p-6">
              {/* ... modal content same as before ... */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {authorProfileUrl ? (
                    <img
                      src={authorProfileUrl}
                      alt={author}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-primary">
                      {authorInitials}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{author}</p>
                  <p className="text-xs text-muted-foreground">
                    {authorSchool || "No school"}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {isVerified && isAiVerified && <AIBadge variant="verified" />}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {field}
                  </span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-4">
                {title}
              </h2>
              <div className="prose prose-sm max-w-none text-foreground/90 mb-6">
                {fullContent.split("\n\n").map((para, i) => (
                  <p key={i} className="mb-4 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
              {aiSummary && aiSummary.trim().length > 0 && (
                <div className="rounded-lg bg-ai-subtle/50 border border-ai/10 p-4 mb-6">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-4 w-4 text-ai" />
                    <span className="text-sm font-medium text-ai">
                      AI Summary
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {aiSummary}
                  </p>
                </div>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTagClick) onTagClick(tag.id);
                        else navigate(`/feed?tagId=${tag.id}`);
                        closePostModal();
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors">
                      <Hash className="h-2.5 w-2.5" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
              {documentUrl && (
                <div className="mb-6">
                  <button
                    onClick={handleDocumentClick}
                    className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50 hover:border-primary/20">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <span className="truncate text-sm font-medium text-foreground">
                        {getFileNameFromUrl(documentUrl)}
                      </span>
                    </div>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ArrowBigUp className="h-4 w-4" />
                  <span>{upvotes}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ArrowBigDown className="h-4 w-4" />
                  <span>{downvotes}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>{comments}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderDocumentModal = () => (
    <AnimatePresence>
      {isDocModalOpen && documentUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeDocModal}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] overflow-auto rounded-xl bg-card shadow-xl border border-border">
            <div className="sticky top-0 bg-card border-b border-border p-3 flex justify-between items-center">
              <h3 className="font-medium text-foreground truncate">
                {getFileNameFromUrl(documentUrl)}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Open in new tab">
                  <SquareArrowOutUpRight className="h-4 w-4" />
                </a>
                <button
                  onClick={closeDocModal}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex justify-center items-center bg-muted/20">
              {renderDocumentPreview(documentUrl)}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.4 }}
        className="group rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-primary/10 w-full cursor-pointer"
        onClick={handleCardClick}>
        {/* Author row */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <Link
            to={`/${encodeURIComponent(author)}`}
            className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"
            onClick={(e) => e.stopPropagation()}>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {authorProfileUrl ? (
                <img
                  src={authorProfileUrl}
                  alt={author}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] sm:text-xs font-semibold text-primary">
                  {authorInitials}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {author}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {authorSchool || "No school"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isVerified && isAiVerified && <AIBadge variant="verified" />}
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium whitespace-nowrap">
              {field}
            </span>
          </div>

          {isAuthor && (
            <div className="relative ml-auto post-menu" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-lg border border-border bg-card shadow-lg py-1">
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit Post
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
          {title}
        </h3>

        {/* Preview */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {preview}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={(e) => handleTagClick(tag.id, e)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors tag-button">
                <Hash className="h-2.5 w-2.5" />
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Document Attachment */}
        {documentUrl && (
          <div className="mb-3">
            <button
              onClick={handleDocumentClick}
              className="w-full flex items-center cursor-pointer justify-between gap-2 rounded-md border border-border bg-muted/30 p-2 transition-colors hover:bg-muted/50 hover:border-primary/20 group/doc">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-sm font-medium text-foreground group-hover/doc:text-primary transition-colors">
                  {getFileNameFromUrl(documentUrl)}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && aiSummary.trim().length > 0 && (
          <div className="rounded-lg bg-ai-subtle/50 border border-ai/10 p-2.5 sm:p-3 mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-ai" />
              <span className="text-xs font-medium text-ai">AI Summary</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {aiSummary}
            </p>
          </div>
        )}

        {/* Action buttons with date beside save icon */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Left side: upvote, downvote, comment buttons */}
          <button
            onClick={handleUpvote}
            disabled={isVoting}
            className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 transition-colors disabled:opacity-50 ${
              upvoted
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            <ArrowBigUp
              className={`h-4 w-4 ${upvoted ? "fill-primary" : ""}`}
            />
            <span className="text-xs font-semibold">{upvotes}</span>
          </button>
          <button
            onClick={handleDownvote}
            disabled={isVoting}
            className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 transition-colors disabled:opacity-50 ${
              downvoted
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            <ArrowBigDown
              className={`h-4 w-4 ${downvoted ? "fill-destructive" : ""}`}
            />
            <span className="text-xs font-semibold">{downvotes}</span>
          </button>
          <button
            onClick={() => navigate(`/post/${id}`)}
            className="flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-medium">{comments}</span>
          </button>

          {/* Right side: date + save button */}
          <div className="ml-auto flex items-center gap-2">
            {formattedDate && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formattedDate}
              </span>
            )}
            <button
              onClick={handleSave}
              className={`rounded-md p-1.5 transition-colors ${
                saved
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              {saved ? (
                <BookmarkCheck className="h-4 w-4 fill-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </motion.article>

      {renderPostModal()}
      {renderDocumentModal()}
    </>
  );
};

export default DiscussionCard;
