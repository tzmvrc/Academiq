import React from "react";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalTag } from "@/components/ui/BrutalTag";
import { Edit, Trophy, MessageCircle, ThumbsUp, BookOpen } from "lucide-react";

const mockUser = {
  name: "Alex Chen",
  email: "alex.chen@university.edu",
  bio: "PhD Candidate in Computer Science. Passionate about quantum computing, cryptography, and machine learning. Always looking for interesting research collaborations!",
  avatar: null,
  points: 2847,
  rank: 12,
  posts: 45,
  comments: 234,
  upvotes: 1567,
  interests: [
    "Quantum Computing",
    "Cryptography",
    "ML/AI",
    "Distributed Systems",
  ],
};

export const ProfileTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">My Profile</h1>

      {/* Profile Card */}
      <BrutalCard className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center text-4xl font-bold text-primary-foreground">
            {mockUser.name.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{mockUser.name}</h2>
                <p className="text-muted-foreground">{mockUser.email}</p>
              </div>
              <BrutalButton
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </BrutalButton>
            </div>
            <p className="mt-4 text-foreground">{mockUser.bio}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {mockUser.interests.map((interest) => (
                <BrutalTag key={interest} color="violet">
                  {interest}
                </BrutalTag>
              ))}
            </div>
          </div>
        </div>
      </BrutalCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BrutalCard color="yellow" className="p-5 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <div className="text-3xl font-bold">{mockUser.points}</div>
          <div className="text-sm font-medium">Points</div>
        </BrutalCard>
        <BrutalCard color="teal" className="p-5 text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2" />
          <div className="text-3xl font-bold">{mockUser.posts}</div>
          <div className="text-sm font-medium">Posts</div>
        </BrutalCard>
        <BrutalCard color="pink" className="p-5 text-center">
          <MessageCircle className="w-8 h-8 mx-auto mb-2" />
          <div className="text-3xl font-bold">{mockUser.comments}</div>
          <div className="text-sm font-medium">Comments</div>
        </BrutalCard>
        <BrutalCard color="coral" className="p-5 text-center">
          <ThumbsUp className="w-8 h-8 mx-auto mb-2" />
          <div className="text-3xl font-bold">{mockUser.upvotes}</div>
          <div className="text-sm font-medium">Upvotes</div>
        </BrutalCard>
      </div>

      {/* Rank Card */}
      <BrutalCard color="violet" className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Global Ranking</h3>
            <p className="text-primary-foreground/80">
              You're in the top 1% of contributors!
            </p>
          </div>
          <div className="text-5xl font-bold">#{mockUser.rank}</div>
        </div>
      </BrutalCard>
    </div>
  );
};
