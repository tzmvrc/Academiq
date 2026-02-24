import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, MessageCircle, ThumbsUp, BookOpen } from 'lucide-react';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalTag } from '@/components/ui/BrutalTag';
import { ForumCard } from '@/components/forum/ForumCard';
import { Sidebar } from '@/components/layout/Sidebar';

// Mock user data
const mockUsers: Record<string, {
  name: string;
  email: string;
  bio: string;
  points: number;
  rank: number;
  posts: number;
  comments: number;
  upvotes: number;
  interests: string[];
}> = {
  'user1': {
    name: 'Alex Chen',
    email: 'alex.chen@university.edu',
    bio: 'PhD Candidate in Computer Science. Passionate about quantum computing, cryptography, and machine learning.',
    points: 2847,
    rank: 12,
    posts: 45,
    comments: 234,
    upvotes: 1567,
    interests: ['Quantum Computing', 'Cryptography', 'ML/AI'],
  },
  'user2': {
    name: 'Dr. Sarah Miller',
    email: 'sarah.miller@university.edu',
    bio: 'Professor of Computer Science specializing in post-quantum cryptography and security.',
    points: 4521,
    rank: 3,
    posts: 89,
    comments: 456,
    upvotes: 3245,
    interests: ['Cryptography', 'Security', 'Quantum Computing'],
  },
  'user3': {
    name: 'James Wilson',
    email: 'james.wilson@university.edu',
    bio: 'Graduate student researching CRISPR technology and gene editing applications in medicine.',
    points: 1234,
    rank: 45,
    posts: 23,
    comments: 156,
    upvotes: 678,
    interests: ['Biology', 'CRISPR', 'Medicine'],
  },
};

const mockUserPosts = [
  {
    id: 1,
    title: 'How does quantum computing affect traditional cryptography?',
    subject: 'Computer Science',
    content: 'I\'ve been researching the implications of quantum computing on RSA and other public-key cryptography systems.',
    author: 'Alex Chen',
    commentsCount: 24,
    voteCount: 156,
    isAIVerified: true,
    voteColor: 'yellow' as const,
  },
  {
    id: 2,
    title: 'Implementing lattice-based signatures in practice',
    subject: 'Computer Science',
    content: 'Looking for feedback on my implementation of NTRU signatures. Has anyone encountered performance issues?',
    author: 'Alex Chen',
    commentsCount: 12,
    voteCount: 89,
    isAIVerified: false,
    voteColor: 'teal' as const,
  },
];

export const UserProfile: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('peers');

  const user = mockUsers[userId || 'user1'];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate('/dashboard');
  };

  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl font-bold">User not found</p>
      </div>
    );
  }

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
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {/* Profile Header */}
          <BrutalCard className="p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center text-4xl font-bold text-primary-foreground">
                {user.name.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="mt-4 text-foreground">{user.bio}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {user.interests.map((interest) => (
                    <BrutalTag key={interest} color="violet">{interest}</BrutalTag>
                  ))}
                </div>
              </div>
            </div>
          </BrutalCard>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BrutalCard color="yellow" className="p-5 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <div className="text-3xl font-bold">{user.points}</div>
              <div className="text-sm font-medium">Points</div>
            </BrutalCard>
            <BrutalCard color="teal" className="p-5 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2" />
              <div className="text-3xl font-bold">{user.posts}</div>
              <div className="text-sm font-medium">Posts</div>
            </BrutalCard>
            <BrutalCard color="pink" className="p-5 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2" />
              <div className="text-3xl font-bold">{user.comments}</div>
              <div className="text-sm font-medium">Comments</div>
            </BrutalCard>
            <BrutalCard color="coral" className="p-5 text-center">
              <ThumbsUp className="w-8 h-8 mx-auto mb-2" />
              <div className="text-3xl font-bold">{user.upvotes}</div>
              <div className="text-sm font-medium">Upvotes</div>
            </BrutalCard>
          </div>

          {/* User's Posts */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Posts by {user.name}</h2>
            {mockUserPosts.map((post) => (
              <div key={post.id} onClick={() => handlePostClick(post.id)} className="cursor-pointer">
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
          </div>
        </div>
      </main>
    </div>
  );
};
