import { useState, useEffect } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import AIBadge from "../components/AIBadge";
import axiosInstance from "@/integration/axiosInstance";

interface TrendingForum {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  comments: number;
  subject: { id: string; name: string };
  user: { id: string; name: string; profile_url: string | null };
  created_at: string;
  score?: number;
}

const FeaturedSection = () => {
  const [forums, setForums] = useState<TrendingForum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(
          "/forums/trending-academic?limit=3",
        );
        setForums(res.data.forums || []);
      } catch (err) {
        console.error("Failed to fetch trending forums:", err);
        setError("Could not load trending discussions.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (loading) {
    return (
      <section className="mb-8 sm:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground">
            Trending Academic Discussions
          </h2>
        </div>
        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 sm:p-6 animate-pulse">
              <div className="h-4 bg-secondary rounded w-20 mb-3" />
              <div className="h-5 bg-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-secondary rounded w-1/2 mb-3" />
              <div className="h-16 bg-secondary rounded mb-3" />
              <div className="h-3 bg-secondary rounded w-1/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || forums.length === 0) {
    return null; // or show a fallback message
  }

  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <TrendingUp className="h-5 w-5 text-accent" />
        <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground">
          Trending Academic Discussions
        </h2>
      </div>

      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {forums.map((forum, i) => {
          // Prepare display data
          const tag = forum.subject?.name || "General";
          const authorName = forum.user?.name || "Anonymous";
          const field = forum.subject?.name || "Academic";
          const summary =
            forum.content?.substring(0, 120) +
              (forum.content?.length > 120 ? "..." : "") ||
            "No preview available.";
          const engagement = `${forum.upvotes || 0} upvotes · ${forum.comments || 0} comments`;

          return (
            <motion.div
              key={forum.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              onClick={() => (window.location.href = `/post/${forum.id}`)}
              className="group relative rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/15 cursor-pointer">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                  {tag}
                </span>
                <AIBadge variant="verified" />
              </div>

              <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {forum.title}
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                {authorName} · {field}
              </p>

              <div className="rounded-lg bg-ai-subtle/50 border border-ai/10 p-2.5 sm:p-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3 text-ai" />
                  <span className="text-xs font-medium text-ai">
                    AI Summary
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {summary}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">{engagement}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedSection;
