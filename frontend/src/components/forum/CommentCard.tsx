import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ArrowUp, ArrowDown, Reply, Edit2, Trash2, CornerDownRight, X, Check } from 'lucide-react';
import { BrutalTag } from '@/components/ui/BrutalTag';
import { BrutalButton } from '@/components/ui/BrutalButton';

export interface Comment {
  id: string;
  author: string;
  authorId: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isAIVerified?: boolean;
  voteCount: number;
  replies?: Comment[];
}

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string;
  depth?: number;
  onVote?: (commentId: string, direction: 'up' | 'down') => void;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
  className?: string;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  currentUserId = 'user1', // Mock current user
  depth = 0,
  onVote,
  onEdit,
  onDelete,
  onReply,
  className,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [localVoteCount, setLocalVoteCount] = useState(comment.voteCount);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);

  const isAuthor = comment.authorId === currentUserId;
  const maxDepth = 3;

  const handleVote = (direction: 'up' | 'down') => {
    if (userVote === direction) {
      // Remove vote
      setUserVote(null);
      setLocalVoteCount(comment.voteCount);
    } else {
      // Add or change vote
      const delta = direction === 'up' ? 1 : -1;
      const prevDelta = userVote === 'up' ? -1 : userVote === 'down' ? 1 : 0;
      setUserVote(direction);
      setLocalVoteCount(comment.voteCount + delta + prevDelta);
    }
    onVote?.(comment.id, direction);
  };

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply?.(comment.id, replyContent);
      setReplyContent('');
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
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'border-[3px] border-foreground rounded-lg bg-card shadow-brutal-sm',
          comment.isAIVerified && 'border-teal bg-teal/10',
          depth > 0 && 'ml-6 md:ml-10'
        )}
      >
        <div className="flex">
          {/* Vote Panel */}
          <div className="flex flex-col items-center gap-1 p-3 border-r-[3px] border-foreground bg-muted/30">
            <button
              onClick={() => handleVote('up')}
              className={cn(
                'w-8 h-8 rounded-md border-[2px] border-foreground flex items-center justify-center transition-all hover:bg-teal/20',
                userVote === 'up' && 'bg-teal text-foreground'
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm">{localVoteCount}</span>
            <button
              onClick={() => handleVote('down')}
              className={cn(
                'w-8 h-8 rounded-md border-[2px] border-foreground flex items-center justify-center transition-all hover:bg-destructive/20',
                userVote === 'down' && 'bg-destructive text-destructive-foreground'
              )}
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 bg-muted rounded-full border-[2px] border-foreground overflow-hidden flex-shrink-0">
                {comment.avatar ? (
                  <img src={comment.avatar} alt={comment.author} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{comment.author}</span>
                  <span className="text-muted-foreground text-sm">• {comment.timestamp}</span>
                  {comment.isAIVerified && (
                    <BrutalTag color="teal" className="text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Verified
                    </BrutalTag>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 bg-background border-[2px] border-foreground rounded-lg font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <BrutalButton size="sm" variant="primary" onClick={handleSubmitEdit}>
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </BrutalButton>
                      <BrutalButton size="sm" variant="outline" onClick={handleCancelEdit}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </BrutalButton>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-foreground">{comment.content}</p>
                )}

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-3 mt-3">
                    {depth < maxDepth && (
                      <button
                        onClick={() => setIsReplying(!isReplying)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                        Reply
                      </button>
                    )}
                    {isAuthor && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete?.(comment.id)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply Input */}
        {isReplying && (
          <div className="p-4 border-t-[3px] border-foreground bg-muted/20">
            <div className="flex items-start gap-2">
              <CornerDownRight className="w-5 h-5 text-muted-foreground mt-2" />
              <div className="flex-1 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${comment.author}...`}
                  className="w-full px-3 py-2 bg-background border-[2px] border-foreground rounded-lg font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                />
                <div className="flex gap-2">
                  <BrutalButton size="sm" variant="primary" onClick={handleSubmitReply}>
                    Reply
                  </BrutalButton>
                  <BrutalButton size="sm" variant="outline" onClick={() => setIsReplying(false)}>
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
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              onVote={onVote}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};
