import React from "react";
import { Link } from "react-router-dom";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import {
  GraduationCap,
  Sparkles,
  MessageCircle,
  Trophy,
  CheckCircle,
  ArrowRight,
  Zap,
  Users,
  Brain,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Validation",
    description:
      "Every post and comment is analyzed by AI for accuracy and quality. Get instant feedback on your academic content.",
    color: "yellow" as const,
  },
  {
    icon: MessageCircle,
    title: "Smart Discussions",
    description:
      "Engage in meaningful academic debates. AI summarizes long threads and highlights key insights.",
    color: "teal" as const,
  },
  {
    icon: Trophy,
    title: "Earn Recognition",
    description:
      "Build your reputation through quality contributions. Climb the leaderboards and earn academic badges.",
    color: "pink" as const,
  },
  {
    icon: CheckCircle,
    title: "Verified Content",
    description:
      "Trust the knowledge. AI verification badges show which content has been fact-checked and validated.",
    color: "coral" as const,
  },
];

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-[4px] border-foreground bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Academiq</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <BrutalButton variant="outline">Login</BrutalButton>
            </Link>
            <Link to="/signup">
              <BrutalButton variant="primary">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </BrutalButton>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow rounded-full border-[3px] border-foreground opacity-50 animate-float" />
        <div
          className="absolute bottom-20 right-20 w-24 h-24 bg-teal rounded-full border-[3px] border-foreground opacity-50 animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-40 right-40 w-16 h-16 bg-pink rounded-full border-[3px] border-foreground opacity-50 animate-float"
          style={{ animationDelay: "2s" }}
        />

        <div className="container mx-auto px-4 text-center relative z-10">
          <BrutalCard
            color="violet"
            className="inline-flex items-center gap-2 px-4 py-2 mb-8"
          >
            <Zap className="w-4 h-4" />
            <span className="font-bold">AI-Powered Academic Forum</span>
          </BrutalCard>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Where Knowledge
            <br />
            <span className="inline-block bg-yellow px-4 py-2 border-[4px] border-foreground shadow-brutal rotate-slight-right mt-2">
              Gets Smarter
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Join the academic community where AI validates content, summarizes
            discussions, and helps you earn recognition for quality
            contributions.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/signup">
              <BrutalButton variant="primary" size="lg">
                <GraduationCap className="w-5 h-5 mr-2" />
                Start Learning
              </BrutalButton>
            </Link>
            <BrutalButton variant="outline" size="lg">
              Watch Demo
            </BrutalButton>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-16 flex-wrap">
            <BrutalCard className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <div className="text-2xl font-bold">50K+</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
              </div>
            </BrutalCard>
            <BrutalCard className="px-6 py-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-teal" />
                <div className="text-left">
                  <div className="text-2xl font-bold">1M+</div>
                  <div className="text-sm text-muted-foreground">
                    Discussions
                  </div>
                </div>
              </div>
            </BrutalCard>
            <BrutalCard className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-pink" />
                <div className="text-left">
                  <div className="text-2xl font-bold">99%</div>
                  <div className="text-sm text-muted-foreground">
                    AI Accuracy
                  </div>
                </div>
              </div>
            </BrutalCard>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted border-y-[4px] border-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Academiq?</h2>
            <p className="text-xl text-muted-foreground">
              Built for students and educators who demand quality
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <BrutalCard
                  key={feature.title}
                  color={feature.color}
                  className="p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-background rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center flex-shrink-0">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-foreground/80">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </BrutalCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <BrutalCard
            color="violet"
            className="p-12 text-center max-w-3xl mx-auto"
          >
            <Sparkles className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-4">Ready to Level Up?</h2>
            <p className="text-xl opacity-90 mb-8">
              Join thousands of students and educators already using Academiq to
              enhance their academic journey.
            </p>
            <Link to="/signup">
              <BrutalButton variant="secondary" size="lg">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </BrutalButton>
            </Link>
          </BrutalCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-[4px] border-foreground bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg border-[2px] border-foreground shadow-brutal-sm flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold">Academiq</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Academiq. Built for learners, by learners.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
