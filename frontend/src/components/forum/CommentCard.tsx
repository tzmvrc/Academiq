import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { BrutalTag } from "@/components/ui/BrutalTag";

interface CommentCardProps {
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isAIVerified?: boolean;
  className?: string;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  author,
  avatar,
  content,
  timestamp,
  isAIVerified = false,
  className,
}) => {
  return (
    <div
      className={cn(
        "border-[3px] border-foreground rounded-lg p-4 bg-card shadow-brutal-sm",
        isAIVerified && "border-teal bg-teal/10",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 bg-muted rounded-full border-[2px] border-foreground overflow-hidden flex-shrink-0">
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{author}</span>
            <span className="text-muted-foreground text-sm">• {timestamp}</span>
            {isAIVerified && (
              <BrutalTag color="teal" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Verified
              </BrutalTag>
            )}
          </div>
          <p className="mt-2 text-foreground">{content}</p>
        </div>
      </div>
    </div>
  );
};
