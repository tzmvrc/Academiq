import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { motion } from "framer-motion";
import AIBadge from "./AIBadge";

interface Tag {
  id: string;
  name: string;
}

interface DiscussionCardProps {
  id?: string;
  user_id?: string; // author ID
  title: string;
  author: string;
  authorSchool?: string;
  authorInitials: string;
  authorProfileUrl?: string;
  field: string; // subject name
  tags?: Tag[]; // array of tags
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
  tag: string; // legacy, subject name
  index?: number;
  onVote?: (voteType: 1 | -1) => Promise<void>;
  onUnvote?: () => Promise<void>;
  onSave?: () => Promise<boolean | void>;
  onTagClick?: (tagId: string) => void; // optional tag click handler
  isAuthor?: boolean; // whether current user is the author
  onEdit?: (postData: DiscussionCardProps) => void;
  onDelete?: (postId: string) => void;
}

// Format raw filename into a readable display name
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
  tag: legacyTag, // kept for compatibility
  index = 0,
  onVote,
  onUnvote,
  onSave,
  onTagClick,
  isAuthor = false,
  onEdit,
  onDelete,
}: DiscussionCardProps) => {
  const navigate = useNavigate();
  const [upvoted, setUpvoted] = useState<boolean>(userVoteState === 1);
  const [downvoted, setDownvoted] = useState<boolean>(userVoteState === -1);
  const [saved, setSaved] = useState<boolean>(isSaved);
  const [isVoting, setIsVoting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const upvoteCount = upvotes;
  const downvoteCount = downvotes;

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && !(event.target as Element).closest(".post-menu")) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
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

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

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
    if (onEdit) {
      // Pass all necessary data for editing
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
        tag: legacyTag,
        isAuthor,
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-primary/10 w-full">
      {/* Author row */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isVerified && isAiVerified && <AIBadge variant="verified" />}
          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium whitespace-nowrap">
            {field}
          </span>
        </div>

        {isAuthor && (
          <div className="relative ml-auto post-menu">
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

      {/* Tags row */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={(e) => handleTagClick(tag.id, e)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors">
              <Hash className="h-2.5 w-2.5" />
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Document Attachment */}
      {documentUrl && (
        <div className="mb-3">
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 transition-colors hover:bg-muted/50 hover:border-primary/20 group/document">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-sm font-medium text-foreground group-hover/document:text-primary transition-colors">
              {getFileNameFromUrl(documentUrl)}
            </span>
          </a>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary?.trim()?.length > 0 && (
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

      {/* Actions */}
      <div
        className="flex items-center gap-0.5 sm:gap-1"
        onClick={(e) => e.preventDefault()}>
        <button
          onClick={handleUpvote}
          disabled={isVoting}
          className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 transition-colors disabled:opacity-50 ${
            upvoted
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}>
          <ArrowBigUp className={`h-4 w-4 ${upvoted ? "fill-primary" : ""}`} />
          <span className="text-xs font-semibold">{upvoteCount}</span>
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
          <span className="text-xs font-semibold">{downvoteCount}</span>
        </button>
        <button className="flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-medium">{comments}</span>
        </button>
        <button
          onClick={handleSave}
          className={`ml-auto rounded-md p-1.5 transition-colors ${
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
    </motion.article>
  );
};

export default DiscussionCard;
