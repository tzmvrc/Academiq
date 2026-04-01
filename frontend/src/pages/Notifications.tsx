import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, MessageCircle, ArrowBigUp, UserPlus, Sparkles } from "lucide-react";
import { NotificationSkeleton } from "@/components/SkeletonLoaders";

const notifications = [
  { id: 1, type: "reply", icon: MessageCircle, text: "Prof. Michael Torres replied to your discussion on transformers vs SSMs.", timestamp: "2 hours ago", unread: true },
  { id: 2, type: "upvote", icon: ArrowBigUp, text: 'Your post "Attention Is All You Need — Revisited" received 50 new upvotes.', timestamp: "4 hours ago", unread: true },
  { id: 3, type: "follow", icon: UserPlus, text: "Dr. Anika Patel started following you.", timestamp: "6 hours ago", unread: true },
  { id: 4, type: "ai", icon: Sparkles, text: 'AI summary generated for your discussion "Bayesian Methods for Small-Sample Trials".', timestamp: "1 day ago", unread: false },
  { id: 5, type: "reply", icon: MessageCircle, text: "Lina Kovacs commented on your post about formal verification.", timestamp: "1 day ago", unread: false },
  { id: 6, type: "upvote", icon: ArrowBigUp, text: 'Your comment on "Quantum Error Correction" was upvoted 12 times.', timestamp: "2 days ago", unread: false },
  { id: 7, type: "follow", icon: UserPlus, text: "Dr. Ricardo Almeida started following you.", timestamp: "3 days ago", unread: false },
];

const iconColors: Record<string, string> = {
  reply: "text-accent bg-accent/10",
  upvote: "text-primary bg-primary/10",
  follow: "text-success bg-success/10",
  ai: "text-ai bg-ai-subtle",
};

const Notifications = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-5 w-5 text-accent" />
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Notifications</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Stay updated with your academic community.</p>

      <div className="space-y-2">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <NotificationSkeleton key={i} index={i} />
            ))}
          </>
        ) : (
          notifications.map((n, i) => {
            const Icon = n.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 transition-all hover:shadow-sm cursor-pointer ${
                  n.unread
                    ? "border-primary/15 bg-primary/[0.02]"
                    : "border-border bg-card"
                }`}
              >
                <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${iconColors[n.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${n.unread ? "text-foreground font-medium" : "text-foreground/80"}`}>
                    {n.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{n.timestamp}</p>
                </div>
                {n.unread && (
                  <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
