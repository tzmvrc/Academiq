import { useState, useEffect } from "react";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import AIBadge from "./AIBadge";

interface DiscussionCardProps {
  id?: string;
  title: string;
  author: string;
  authorInitials: string;
  authorProfileUrl?: string;
  field: string;
  preview: string;
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
  onVote?: (voteType: 1 | -1) => Promise<void>;
  onUnvote?: () => Promise<void>;
  onSave?: () => Promise<boolean | void>;
}

// Format raw filename into a readable display name
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

// Extract and clean the filename from a URL
const getFileNameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    path = path.replace(/\/+$/, ""); // remove trailing slashes
    const segments = path.split("/");
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      const decoded = decodeURIComponent(lastSegment);
      return formatDocumentName(decoded);
    }
    return "document";
  } catch {
    // Fallback for malformed URLs
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    const cleaned = lastPart.split(/[?#]/)[0];
    const formatted = formatDocumentName(cleaned);
    return formatted || "document";
  }
};

const DiscussionCard = ({
  id,
  title,
  author,
  authorInitials,
  authorProfileUrl,
  field,
  preview,
  aiSummary,
  documentUrl,
  upvotes,
  downvotes,
  comments,
  userVoteState,
  isSaved = false,
  isVerified = true,
  isAiVerified,
  tag,
  index = 0,
  onVote,
  onUnvote,
  onSave,
}: DiscussionCardProps) => {
  const [upvoted, setUpvoted] = useState<boolean>(userVoteState === 1);
  const [downvoted, setDownvoted] = useState<boolean>(userVoteState === -1);
  const [saved, setSaved] = useState<boolean>(isSaved);
  const [isVoting, setIsVoting] = useState(false);

  const upvoteCount = upvotes;
  const downvoteCount = downvotes;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-primary/10 w-full"
    >
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
          <p className="text-xs text-muted-foreground truncate">{field}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isVerified && isAiVerified && <AIBadge variant="verified" />}
          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium whitespace-nowrap">
            {tag}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
        {title}
      </h3>

      {/* Preview */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {preview}
      </p>

      {/* Document Attachment */}
      {documentUrl && (
        <div className="mb-3">
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 transition-colors hover:bg-muted/50 hover:border-primary/20 group/document"
          >
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
        onClick={(e) => e.preventDefault()}
      >
        <button
          onClick={handleUpvote}
          disabled={isVoting}
          className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 transition-colors disabled:opacity-50 ${
            upvoted
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
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
          }`}
        >
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
          }`}
        >
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
