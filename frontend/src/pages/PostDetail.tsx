import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { BrutalTag } from "@/components/ui/BrutalTag";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { CommentCard, Comment } from "@/components/forum/CommentCard";
import { Sidebar } from "@/components/layout/Sidebar";

// Mock data - in real app, fetch based on postId
const mockPost = {
  id: "1",
  title: "How does quantum computing affect traditional cryptography?",
  subject: "Computer Science",
  content: `I've been researching the implications of quantum computing on RSA and other public-key cryptography systems. 

The fundamental issue is that quantum computers can efficiently solve problems that classical computers cannot, specifically the integer factorization problem that RSA relies on for security.

Shor's algorithm, when run on a sufficiently powerful quantum computer, can factor large integers in polynomial time, making RSA essentially obsolete.

I'd love to discuss:
1. What are the most promising post-quantum cryptography alternatives?
2. How close are we to quantum computers that can actually break RSA?
3. What should organizations do now to prepare?

Would love to hear from researchers working in this field!`,
  author: "Alex Chen",
  authorId: "user1",
  voteCount: 156,
  isAIVerified: true,
  aiSummary: `This post discusses the threat quantum computing poses to traditional cryptography, specifically RSA. The author explains how Shor's algorithm could break RSA encryption and asks for discussion on post-quantum alternatives, timeline predictions, and preparation strategies for organizations.`,
  createdAt: "2 hours ago",
};

const initialComments: Comment[] = [
  {
    id: "1",
    author: "Dr. Sarah Miller",
    authorId: "user2",
    content:
      "Great question! Lattice-based cryptography, particularly NTRU and Kyber, are leading candidates for post-quantum encryption. NIST has already begun standardizing these.",
    timestamp: "1 hour ago",
    isAIVerified: true,
    voteCount: 45,
    replies: [
      {
        id: "1-1",
        author: "Alex Chen",
        authorId: "user1",
        content:
          "Thanks Dr. Miller! Do you have any resources for learning more about lattice-based approaches?",
        timestamp: "50 minutes ago",
        isAIVerified: false,
        voteCount: 12,
        replies: [
          {
            id: "1-1-1",
            author: "Dr. Sarah Miller",
            authorId: "user2",
            content:
              'Absolutely! Check out the NIST PQC project documentation and the "Lattice-Based Cryptography" textbook by Peikert.',
            timestamp: "40 minutes ago",
            isAIVerified: true,
            voteCount: 8,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    author: "James Wilson",
    authorId: "user3",
    content: `Current estimates suggest we're still 10-15 years away from cryptographically relevant quantum computers. However, the "harvest now, decrypt later" threat means we should start transitioning now.`,
    timestamp: "45 minutes ago",
    isAIVerified: false,
    voteCount: 32,
  },
  {
    id: "3",
    author: "Maria Santos",
    authorId: "user4",
    content: `I work in a financial institution and we're already auditing our cryptographic dependencies. The key is to start with an inventory of where you use public-key crypto and plan a staged migration.`,
    timestamp: "30 minutes ago",
    isAIVerified: true,
    voteCount: 28,
  },
  {
    id: "4",
    author: "David Park",
    authorId: "user5",
    content:
      "Has anyone looked into hash-based signatures like SPHINCS+? They have a different security basis and might be worth discussing as a complementary approach.",
    timestamp: "15 minutes ago",
    isAIVerified: false,
    voteCount: 15,
  },
];

// Helper to count all comments including nested
const countComments = (comments: Comment[]): number => {
  return comments.reduce((acc, comment) => {
    return acc + 1 + (comment.replies ? countComments(comment.replies) : 0);
  }, 0);
};

export const PostDetail: React.FC = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [newComment, setNewComment] = useState("");
  const [voteCount, setVoteCount] = useState(mockPost.voteCount);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const currentUserId = "user1"; // Mock current user

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate("/dashboard");
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const newCommentObj: Comment = {
        id: `new-${Date.now()}`,
        author: "You",
        authorId: currentUserId,
        content: newComment,
        timestamp: "Just now",
        isAIVerified: false,
        voteCount: 0,
      };
      setComments([newCommentObj, ...comments]);
      setNewComment("");
    }
  };

  const handleVote = (commentId: string, direction: "up" | "down") => {
    console.log("Vote:", commentId, direction);
  };

  const handleEdit = (commentId: string, newContent: string) => {
    const updateComment = (comments: Comment[]): Comment[] => {
      return comments.map((c) => {
        if (c.id === commentId) {
          return { ...c, content: newContent };
        }
        if (c.replies) {
          return { ...c, replies: updateComment(c.replies) };
        }
        return c;
      });
    };
    setComments(updateComment(comments));
  };

  const handleDelete = (commentId: string) => {
    const deleteComment = (comments: Comment[]): Comment[] => {
      return comments
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: c.replies ? deleteComment(c.replies) : undefined,
        }));
    };
    setComments(deleteComment(comments));
  };

  const handleReply = (parentId: string, content: string) => {
    const newReply: Comment = {
      id: `reply-${Date.now()}`,
      author: "You",
      authorId: currentUserId,
      content,
      timestamp: "Just now",
      isAIVerified: false,
      voteCount: 0,
    };

    const addReply = (comments: Comment[]): Comment[] => {
      return comments.map((c) => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), newReply] };
        }
        if (c.replies) {
          return { ...c, replies: addReply(c.replies) };
        }
        return c;
      });
    };
    setComments(addReply(comments));
  };

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Feed
          </button>

          {/* Post Card */}
          <BrutalCard className="overflow-hidden">
            <div className="flex">
              {/* Main Content */}
              <div className="flex-1 p-6">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <BrutalTag color="violet">{mockPost.subject}</BrutalTag>
                  {mockPost.isAIVerified && (
                    <BrutalTag color="teal">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Verified
                    </BrutalTag>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold mb-3">{mockPost.title}</h1>

                {/* Author */}
                <p className="text-muted-foreground mb-6">
                  by{" "}
                  <span className="font-semibold text-foreground">
                    {mockPost.author}
                  </span>{" "}
                  • {mockPost.createdAt}
                </p>

                {/* Content */}
                <div className="prose prose-lg max-w-none">
                  {mockPost.content.split("\n").map((paragraph, i) => (
                    <p key={i} className="mb-4 text-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* AI Summary */}
                {mockPost.aiSummary && (
                  <div className="mt-8 p-5 bg-blue/10 border-[3px] border-blue rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue rounded-lg border-[2px] border-foreground flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-foreground" />
                      </div>
                      <h3 className="font-bold text-lg">AI Summary</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {mockPost.aiSummary}
                    </p>
                  </div>
                )}
              </div>

              {/* Vote Panel */}
              <div className="flex flex-col items-center justify-start gap-3 p-6 min-w-[100px] border-l-[4px] border-foreground bg-yellow">
                <button
                  onClick={() => setVoteCount((v) => v + 1)}
                  className="w-12 h-12 bg-background border-[3px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:translate-y-[-2px] hover:shadow-brutal transition-all active:translate-y-[2px] active:shadow-none"
                >
                  <ArrowUp className="w-6 h-6 text-teal" />
                </button>
                <span className="text-2xl font-bold">{voteCount}</span>
                <button
                  onClick={() => setVoteCount((v) => v - 1)}
                  className="w-12 h-12 bg-background border-[3px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:translate-y-[-2px] hover:shadow-brutal transition-all active:translate-y-[2px] active:shadow-none"
                >
                  <ArrowDown className="w-6 h-6 text-destructive" />
                </button>
              </div>
            </div>
          </BrutalCard>

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <h2 className="text-2xl font-bold">
                {countComments(comments)} Comments
              </h2>
            </div>

            {/* Add Comment */}
            <div className="flex gap-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                className="flex-1 px-4 py-3 bg-background border-[3px] border-foreground rounded-lg font-medium shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <BrutalButton
                variant="primary"
                onClick={handleAddComment}
                className="self-end"
              >
                Post
              </BrutalButton>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onVote={handleVote}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={handleReply}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
