import React from "react";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalTag } from "@/components/ui/BrutalTag";
import { Sparkles, BookOpen, TrendingUp, Zap, ArrowRight } from "lucide-react";

const mockRecommendations = [
  {
    id: 1,
    title: "Post-Quantum Cryptography Standards: NIST's Latest Selections",
    subject: "Cryptography",
    reason: "Based on your interest in quantum computing",
    engagement: "High activity",
    color: "yellow" as const,
  },
  {
    id: 2,
    title: "Neural Networks for Time Series Prediction in Climate Data",
    subject: "Machine Learning",
    reason: "Related to your recent posts on ML",
    engagement: "Trending",
    color: "teal" as const,
  },
  {
    id: 3,
    title: "Ethical Implications of AI in Academic Research",
    subject: "AI Ethics",
    reason: "Popular in your research community",
    engagement: "50+ new comments",
    color: "pink" as const,
  },
];

const mockTopics = [
  { name: "Quantum Computing", posts: 234, isFollowing: true },
  { name: "Machine Learning", posts: 567, isFollowing: true },
  { name: "Cryptography", posts: 189, isFollowing: true },
  { name: "Distributed Systems", posts: 145, isFollowing: false },
  { name: "Blockchain", posts: 312, isFollowing: false },
  { name: "Computer Vision", posts: 278, isFollowing: false },
];

export const InterestTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">For You</h1>
          <p className="text-muted-foreground">
            AI-powered recommendations based on your interests
          </p>
        </div>
      </div>

      {/* AI Badge */}
      <BrutalCard color="violet" className="p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5" />
          <span className="font-semibold">
            Personalized by Academiq AI • Based on your activity and interests
          </span>
        </div>
      </BrutalCard>

      {/* Recommended Posts */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Recommended Discussions</h2>
        {mockRecommendations.map((rec) => (
          <BrutalCard key={rec.id} className="p-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 bg-${rec.color} rounded-lg border-[2px] border-foreground shadow-brutal-sm flex items-center justify-center flex-shrink-0`}>
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <BrutalTag color={rec.color} className="mb-2">
                      {rec.subject}
                    </BrutalTag>
                    <h3 className="font-bold text-lg">{rec.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      {rec.reason}
                    </p>
                  </div>
                  <BrutalButton variant="outline" size="sm">
                    <ArrowRight className="w-4 h-4" />
                  </BrutalButton>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <TrendingUp className="w-4 h-4 text-mint" />
                  <span className="text-sm font-medium">{rec.engagement}</span>
                </div>
              </div>
            </div>
          </BrutalCard>
        ))}
      </div>

      {/* Topics */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Topics for You</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTopics.map((topic) => (
            <BrutalCard key={topic.name} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{topic.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {topic.posts} posts
                  </p>
                </div>
                <BrutalButton
                  variant={topic.isFollowing ? "secondary" : "outline"}
                  size="sm">
                  {topic.isFollowing ? "Following" : "Follow"}
                </BrutalButton>
              </div>
            </BrutalCard>
          ))}
        </div>
      </div>
    </div>
  );
};
