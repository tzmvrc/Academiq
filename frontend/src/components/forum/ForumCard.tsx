import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Bookmark,
} from "lucide-react";
import { BrutalTag } from "@/components/ui/BrutalTag";

interface ForumCardProps {
  id: string;
  title: string;
  subject: string;
  content: string;
  author: string;
  avatar?: string;
  commentsCount: number;
  voteCount: number;
  documentUrl?: string;
  isAIVerified?: boolean;
  voteColor?: "yellow" | "teal" | "pink" | "coral" | "mint";
  isSaved?: boolean;
  initialUserVote?: 1 | -1 | null;
  onUpvote?: (id: string) => void;
  onDownvote?: (id: string) => void;
  onSave?: (id: string) => void;
}

const voteColorStyles = {
  yellow: "bg-yellow",
  teal: "bg-teal",
  pink: "bg-pink",
  coral: "bg-coral",
  mint: "bg-mint",
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

export const ForumCard: React.FC<ForumCardProps> = ({
  id,
  title,
  subject,
  content,
  author,
  avatar,
  commentsCount,
  voteCount: initialVoteCount,
  documentUrl,
  isAIVerified = false,
  voteColor = "yellow",
  isSaved: initialSaved = false,
  initialUserVote = null,
  onUpvote,
  onDownvote,
  onSave,
}) => {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isSaved, setIsSaved] = useState(initialSaved);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (userVote === 1) {
      // Remove upvote
      setUserVote(null);
      setVoteCount(voteCount - 1);
    } else {
      // Add upvote or change from downvote
      const delta = userVote === -1 ? 2 : 1;
      setUserVote(1);
      setVoteCount(voteCount + delta);
    }
    onUpvote?.(id);
  };

  const handleDownvote = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (userVote === -1) {
      // Remove downvote
      setUserVote(null);
      setVoteCount(voteCount + 1);
    } else {
      // Add downvote or change from upvote
      const delta = userVote === 1 ? -2 : -1;
      setUserVote(-1);
      setVoteCount(voteCount + delta);
    }
    onDownvote?.(id);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave?.(id);
  };
  return (
    <div className="brutal-card flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-muted rounded-full border-2 border-foreground overflow-hidden">
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

        {documentUrl && (
          <div
            onClick={(e) => {
              e.stopPropagation(); // prevent opening main forum
              window.open(documentUrl, "_blank", "noopener,noreferrer");
            }}
            className="mb-4 cursor-pointer border-2 border-foreground rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-all flex items-center gap-3"
          >
            <div className="w-8 h-8 border-2 border-foreground rounded-md flex items-center justify-center bg-background text-sm font-bold">
              📄
            </div>
            <span className="text-sm font-semibold truncate">
              {getFileNameFromUrl(documentUrl)}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium">{commentsCount} comments</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={cn(
              "p-2 rounded-lg border-2 transition-all hover:shadow-brutal",
              isSaved
                ? "border-mint bg-mint text-foreground"
                : "border-foreground bg-background text-foreground hover:border-mint",
            )}
            title={isSaved ? "Unsave forum" : "Save forum"}
          >
            <Bookmark
              className="w-4 h-4"
              fill={isSaved ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      {/* Vote Panel */}
      <div
        className={cn(
          "self-stretch flex flex-col items-center justify-start gap-2 pt-[clamp(16px,3vh,40px)] pb-4 px-4 min-w-[80px] border-l-[3px] border-foreground",
          voteColorStyles[voteColor],
        )}
      >
        <button
          onClick={handleUpvote}
          className={cn(
            "w-10 h-10 bg-background border-2 border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:translate-y-[-2px] hover:shadow-brutal transition-all active:translate-y-[2px] active:shadow-none",
            userVote === 1 && "ring-2 ring-foreground bg-teal/20",
          )}
        >
          <ArrowUp
            className={cn(
              "w-5 h-5",
              userVote === 1 ? "text-foreground" : "text-teal",
            )}
          />
        </button>

        <span className="text-xl font-bold">{voteCount}</span>
        <button
          onClick={handleDownvote}
          className={cn(
            "w-10 h-10 bg-background border-2 border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:translate-y-[-2px] hover:shadow-brutal transition-all active:translate-y-[2px] active:shadow-none",
            userVote === -1 && "ring-2 ring-foreground bg-destructive/20",
          )}
        >
          <ArrowDown
            className={cn(
              "w-5 h-5",
              userVote === -1 ? "text-foreground" : "text-destructive",
            )}
          />
        </button>
      </div>
    </div>
  );
};
