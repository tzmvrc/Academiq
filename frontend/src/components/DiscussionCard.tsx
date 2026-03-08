import { useState } from "react";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import AIBadge from "../components/AIBadge";

interface DiscussionCardProps {
  title: string;
  author: string;
  authorInitials: string;
  field: string;
  preview: string;
  aiSummary: string;
  upvotes: number;
  comments: number;
  isVerified?: boolean;
  tag: string;
  index?: number;
}

const DiscussionCard = ({
  title,
  author,
  authorInitials,
  field,
  preview,
  aiSummary,
  upvotes,
  comments,
  isVerified = true,
  tag,
  index = 0,
}: DiscussionCardProps) => {
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [saved, setSaved] = useState(false);

  const voteScore = upvotes + (upvoted ? 1 : 0) - (downvoted ? 1 : 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-primary/10 w-full"
    >
      {/* Author row */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[10px] sm:text-xs font-semibold text-primary">{authorInitials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{author}</p>
          <p className="text-xs text-muted-foreground truncate">{field}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isVerified && <AIBadge variant="verified" />}
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

      {/* AI Summary */}
      <div className="rounded-lg bg-ai-subtle/50 border border-ai/10 p-2.5 sm:p-3 mb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="h-3 w-3 text-ai" />
          <span className="text-xs font-medium text-ai">AI Summary</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1" onClick={(e) => e.preventDefault()}>
        <button
          onClick={(e) => { e.preventDefault(); setUpvoted(!upvoted); if (downvoted) setDownvoted(false); }}
          className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 transition-colors ${
            upvoted ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <ArrowBigUp className={`h-4 w-4 ${upvoted ? "fill-primary" : ""}`} />
        </button>
        <span className="text-xs font-semibold text-foreground min-w-[1.5rem] text-center">{voteScore}</span>
        <button
          onClick={(e) => { e.preventDefault(); setDownvoted(!downvoted); if (upvoted) setUpvoted(false); }}
          className={`flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 transition-colors ${
            downvoted ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <ArrowBigDown className={`h-4 w-4 ${downvoted ? "fill-destructive" : ""}`} />
        </button>
        <button className="flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-medium">{comments}</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); setSaved(!saved); }}
          className={`ml-auto rounded-md p-1.5 transition-colors ${
            saved ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {saved ? <BookmarkCheck className="h-4 w-4 fill-primary" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
    </motion.article>
  );
};

export default DiscussionCard;
