import React from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { BrutalTag } from "@/components/ui/BrutalTag";

interface ForumCardProps {
  title: string;
  subject: string;
  content: string;
  author: string;
  avatar?: string;
  commentsCount: number;
  voteCount: number;
  isAIVerified?: boolean;
  voteColor?: "yellow" | "teal" | "pink" | "coral" | "mint";
  onUpvote?: () => void;
  onDownvote?: () => void;
}

const voteColorStyles = {
  yellow: "bg-yellow",
  teal: "bg-teal",
  pink: "bg-pink",
  coral: "bg-coral",
  mint: "bg-mint",
};

export const ForumCard: React.FC<ForumCardProps> = ({
  title,
  subject,
  content,
  author,
  avatar,
  commentsCount,
  voteCount,
  isAIVerified = false,
  voteColor = "yellow",
  onUpvote,
  onDownvote,
}) => {
  return (
    <div className="brutal-card flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-muted rounded-full border-[2px] border-foreground overflow-hidden">
              {avatar ? (
                <img
                  src={avatar}
                  alt={author}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {author.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="font-semibold text-sm">{author}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <BrutalTag color="violet">{subject}</BrutalTag>
            {isAIVerified && (
              <BrutalTag color="teal">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Verified
              </BrutalTag>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-2 leading-tight">{title}</h3>

        {/* Content Preview */}
        <p className="text-muted-foreground line-clamp-2 mb-4">{content}</p>

        {/* Footer */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">{commentsCount} comments</span>
          </div>
        </div>
      </div>

      {/* Vote Panel */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 min-w-[80px] border-l-[3px] border-foreground",
          voteColorStyles[voteColor],
        )}
      >
        <button
          onClick={onUpvote}
          className="w-10 h-10 bg-background border-[2px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:translate-y-[-2px] hover:shadow-brutal transition-all active:translate-y-[2px] active:shadow-none"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <span className="text-xl font-bold">{voteCount}</span>
        <button
          onClick={onDownvote}
          className="w-10 h-10 bg-background border-[2px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:translate-y-[-2px] hover:shadow-brutal transition-all active:translate-y-[2px] active:shadow-none"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
