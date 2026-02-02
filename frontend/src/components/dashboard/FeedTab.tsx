import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ForumCard } from "@/components/forum/ForumCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { SearchBar } from "@/components/forum/SearchBar";
import { CreatePostModal } from "@/components/forum/CreatePostModal";
import { Plus, Filter } from "lucide-react";

const mockPosts = [
  {
    id: 1,
    title: "How does quantum computing affect traditional cryptography?",
    subject: "Computer Science",
    content:
      "I've been researching the implications of quantum computing on RSA and other public-key cryptography systems. Would love to discuss Shor's algorithm and post-quantum alternatives with fellow researchers.",
    author: "Alex Chen",
    commentsCount: 24,
    voteCount: 156,
    isAIVerified: true,
    voteColor: "yellow" as const,
  },
  {
    id: 2,
    title:
      "Best practices for conducting literature reviews in social sciences",
    subject: "Research Methods",
    content:
      "Working on my thesis and struggling with organizing my literature review. Looking for tips on systematic approaches, citation management tools, and how to synthesize findings effectively.",
    author: "Maria Santos",
    commentsCount: 18,
    voteCount: 89,
    isAIVerified: true,
    voteColor: "teal" as const,
  },
  {
    id: 3,
    title: "Understanding CRISPR-Cas9: A beginner's guide to gene editing",
    subject: "Biology",
    content:
      "Just started learning about CRISPR technology. Can someone explain the mechanism in simple terms? Also interested in ethical implications and current applications in medicine.",
    author: "James Wilson",
    commentsCount: 42,
    voteCount: 234,
    isAIVerified: false,
    voteColor: "pink" as const,
  },
  {
    id: 4,
    title: "Machine Learning in Climate Modeling: Current State and Challenges",
    subject: "Environmental Science",
    content:
      "Exploring how ML models are being used to improve climate predictions. Looking for collaborators interested in applying neural networks to atmospheric data analysis.",
    author: "Sarah Kim",
    commentsCount: 31,
    voteCount: 178,
    isAIVerified: true,
    voteColor: "coral" as const,
  },
  {
    id: 5,
    title: "The Philosophy of Consciousness: Hard Problem revisited",
    subject: "Philosophy",
    content:
      "Let's discuss Chalmers' hard problem of consciousness in light of recent neuroscience findings. Are we any closer to understanding subjective experience?",
    author: "David Park",
    commentsCount: 56,
    voteCount: 145,
    isAIVerified: false,
    voteColor: "mint" as const,
  },
];

export const FeedTab: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredPosts = mockPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  const handleCreatePost = (post: {
    title: string;
    subject: string;
    content: string;
    tags: string[];
  }) => {
    console.log("New post:", post);
    // In real app, would submit to backend
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forum Feed</h1>
          <p className="text-muted-foreground mt-1">
            Discover and engage with academic discussions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <BrutalButton
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </BrutalButton>

          <BrutalButton
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </BrutalButton>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search discussions..."
      />

      {/* Posts */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => handlePostClick(post.id)}
            className="cursor-pointer"
          >
            <ForumCard
              title={post.title}
              subject={post.subject}
              content={post.content}
              author={post.author}
              commentsCount={post.commentsCount}
              voteCount={post.voteCount}
              isAIVerified={post.isAIVerified}
              voteColor={post.voteColor}
            />
          </div>
        ))}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl font-bold text-muted-foreground">
              No posts found
            </p>
            <p className="text-muted-foreground mt-2">
              Try adjusting your search query
            </p>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
};
