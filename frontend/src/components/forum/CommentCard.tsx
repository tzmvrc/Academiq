import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Reply,
  Edit2,
  Trash2,
  CornerDownRight,
  X,
  Check,
  MoreVertical,
} from "lucide-react";
import { BrutalTag } from "@/components/ui/BrutalTag";
import { BrutalButton } from "@/components/ui/BrutalButton";

export interface Comment {
  id: string;
  author: string;
  authorId: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isAIVerified?: boolean;
  voteCount: number;
  userVote?: 1 | -1 | null;
  replies?: Comment[];
}

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string;
  depth?: number;
  onVote?: (commentId: string, direction: "up" | "down") => void;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
  className?: string;
  isLast?: boolean;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  currentUserId = "user1",
  depth = 0,
  onVote,
  onEdit,
  onDelete,
  onReply,
  className,
  isLast = false,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(comment.content);
  const [localVoteCount, setLocalVoteCount] = useState(comment.voteCount);
  const [userVote, setUserVote] = useState<1 | -1 | null>(
    comment.userVote ?? null,
  );
  const [showMenu, setShowMenu] = useState(false);

  const isAuthor = comment.authorId === currentUserId;
  const maxDepth = 3;

  // Sync vote count when comment updates
  React.useEffect(() => {
    setLocalVoteCount(comment.voteCount);
  }, [comment.voteCount]);

  // Sync user vote when comment updates
  React.useEffect(() => {
    setUserVote(comment.userVote ?? null);
  }, [comment.userVote]);

  const handleVote = (direction: "up" | "down") => {
    const voteValue = direction === "up" ? 1 : -1;

    // Just toggle the local button state - parent handles vote count updates
    if (userVote === voteValue) {
      setUserVote(null);
    } else {
      setUserVote(voteValue);
    }

    onVote?.(comment.id, direction);
  };

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply?.(comment.id, replyContent);
      setReplyContent("");
      setIsReplying(false);
    }
  };

  const handleSubmitEdit = () => {
    if (editContent.trim()) {
      onEdit?.(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "relative space-y-3.5 overflow-visible",
        depth > 0 && "ml-10",
        className,
      )}
    >
      {/* Relationship lines (for replies) */}
      {depth > 0 && (
        <>
          {/* Curve into this comment */}
          <svg
            className="absolute pointer-events-none"
            style={{ left: -16, top: -12, width: 24, height: 38 }}
            fill="none"
          >
            <path
              d="M1 0 L1 22 Q1 34 13 34 L24 34"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="stroke-muted-foreground/40"
            />
          </svg>

          {/* Vertical continuation line (if not last sibling) */}
          {!isLast && (
            <div
              className="absolute"
              style={{
                left: -17,
                top: -12,
                bottom: -10,
                borderLeftWidth: 3,
                borderLeftStyle: "solid",
                borderLeftColor: "rgba(120,120,120,0.50)", // <- change this
              }}
            />
          )}
        </>
      )}
      <div
        className={cn(
          "border-[3px] border-foreground rounded-lg bg-card shadow-brutal-sm group hover:shadow-brutal transition-all",
          comment.isAIVerified && "border-teal bg-teal/10",
          isAuthor && "bg-blue/10 border-blue",
          depth > 0 && "ml-2",
        )}
      >
        <div className="flex flex-col">
          {/* Content */}
          <div className="flex-1 p-3">
            <div className="flex items-start gap-2">
              {/* Avatar */}
              <div className="w-8 h-8 bg-muted rounded-full border-2 border-foreground overflow-hidden shrink-0">
                {comment.avatar ? (
                  <img
                    src={comment.avatar}
                    alt={comment.author}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">
                    {comment.author}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    • {comment.timestamp}
                  </span>
                  {comment.isAIVerified && (
                    <BrutalTag color="teal" className="text-xs py-0.5 px-1.5">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                      AI
                    </BrutalTag>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 bg-background border-2 border-foreground rounded-lg font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <BrutalButton
                        size="sm"
                        variant="primary"
                        onClick={handleSubmitEdit}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </BrutalButton>
                      <BrutalButton
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </BrutalButton>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-foreground text-sm">
                    {comment.content}
                  </p>
                )}

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      {/* Vote Buttons */}
                      <button
                        onClick={() => handleVote("up")}
                        className={cn(
                          "w-6 h-6 rounded-md border-2 border-foreground flex items-center justify-center transition-all hover:bg-teal/20",
                          userVote === 1 && "bg-teal text-foreground",
                        )}
                        title="Upvote"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs min-w-6 text-center">
                        {localVoteCount}
                      </span>
                      <button
                        onClick={() => handleVote("down")}
                        className={cn(
                          "w-6 h-6 rounded-md border-2 border-foreground flex items-center justify-center transition-all hover:bg-destructive/20",
                          userVote === -1 &&
                            "bg-destructive text-destructive-foreground",
                        )}
                        title="Downvote"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      {/* Divider */}
                      <div className="w-px h-4 bg-foreground/20" />

                      {/* Reply - only show on hover */}
                      {depth < maxDepth && (
                        <button
                          onClick={() => setIsReplying(!isReplying)}
                          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Reply className="w-3 h-3" />
                          Reply
                        </button>
                      )}

                      {/* Menu */}
                      {isAuthor && (
                        <div className="relative">
                          <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors p-1 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                          {showMenu && (
                            <div className="absolute right-0 mt-1 bg-card border-2 border-foreground rounded-lg shadow-brutal z-10 min-w-max">
                              <button
                                onClick={() => {
                                  setIsEditing(true);
                                  setShowMenu(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 w-full text-left transition-colors border-b-2 border-foreground"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  onDelete?.(comment.id);
                                  setShowMenu(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full text-left transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply Input */}
        {isReplying && (
          <div className="p-3 border-t-[3px] border-foreground bg-muted/20">
            <div className="flex items-start gap-2">
              <CornerDownRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              <div className="flex-1 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${comment.author}...`}
                  className="w-full px-3 py-2 bg-background border-2 border-foreground rounded-lg font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <BrutalButton
                    size="sm"
                    variant="primary"
                    onClick={handleSubmitReply}
                  >
                    Reply
                  </BrutalButton>
                  <BrutalButton
                    size="sm"
                    variant="outline"
                    onClick={() => setIsReplying(false)}
                  >
                    Cancel
                  </BrutalButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="relative space-y-2 overflow-visible">
          {comment.replies.map((reply, index) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              onVote={onVote}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              isLast={index === comment.replies!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
