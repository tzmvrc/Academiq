import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MessageCircle, ShieldCheck, BookOpen, Award, Bookmark, UserPlus, Check } from "lucide-react";
import AIBadge from "@/components/AIBadge";

const stats = [
  { label: "Reputation", value: "2,340", icon: Star },
  { label: "Discussions", value: "48", icon: MessageCircle },
  { label: "Verified Posts", value: "31", icon: ShieldCheck },
  { label: "Saved", value: "127", icon: Bookmark },
];

const achievements = [
  { title: "First Verified Post", description: "Your first AI-verified academic contribution", icon: "🎓" },
  { title: "Top Contributor", description: "Ranked in top 10% for Computer Science", icon: "🏆" },
  { title: "Peer Mentor", description: "Helped 50+ students with verified answers", icon: "🤝" },
];

const userPosts = [
  { title: "Attention Is All You Need — Revisited in 2026", tag: "Deep Learning", upvotes: 284, comments: 47 },
  { title: "Formal Verification of Smart Contracts Using Coq", tag: "Computer Science", upvotes: 128, comments: 21 },
  { title: "Graph Neural Networks for Molecular Property Prediction", tag: "AI + Chemistry", upvotes: 96, comments: 15 },
];

const savedPosts = [
  { title: "Bayesian Methods for Small-Sample Clinical Trials", tag: "Medicine", upvotes: 156, author: "Prof. Michael Torres" },
  { title: "The Political Economy of Carbon Pricing Mechanisms", tag: "Economics", upvotes: 97, author: "Dr. Ricardo Almeida" },
];

const userComments = [
  { post: "Quantum Error Correction: Bridging Theory and Practice", comment: "The topological code approach is particularly promising for near-term devices.", upvotes: 24 },
  { post: "Ethics of CRISPR Gene Editing in Human Embryos", comment: "The regulatory framework comparison across jurisdictions is very informative.", upvotes: 18 },
];

type Tab = "posts" | "saved" | "comments";

const Profile = () => {
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [isOwnProfile] = useState(true);

  const tabs: { key: Tab; label: string; ownerOnly?: boolean }[] = [
    { key: "posts", label: "Posts" },
    { key: "saved", label: "Saved", ownerOnly: true },
    { key: "comments", label: "Comments" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8"
      >
        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl sm:text-2xl font-bold text-primary">AK</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Alex Kim</h1>
          <p className="text-sm text-muted-foreground mt-0.5">PhD Candidate · Computer Science · Stanford University</p>
          <div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">
            <AIBadge variant="verified" size="md" />
            <span className="text-xs text-muted-foreground">Member since 2024</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 text-accent" /> 2,340 reputation
            </span>
          </div>
        </div>
        {!isOwnProfile && (
          <button className="flex items-center gap-1.5 rounded-lg px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <UserPlus className="h-4 w-4" /> Follow
          </button>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-3 sm:p-4 text-center"
          >
            <s.icon className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-accent mb-1.5 sm:mb-2" />
            <p className="text-lg sm:text-xl font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Achievements */}
      <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-accent" /> Achievements
      </h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-6 sm:mb-8">
        {achievements.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="rounded-xl border border-border bg-card p-3 sm:p-4"
          >
            <div className="text-2xl mb-2">{a.icon}</div>
            <p className="font-heading font-semibold text-foreground text-sm">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          if (tab.ownerOnly && !isOwnProfile) return null;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="profileTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "posts" && (
        <div className="space-y-3">
          {userPosts.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 hover:shadow-md hover:border-primary/10 transition-all cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-foreground text-sm truncate sm:whitespace-normal">{p.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{p.tag}</span>
                  <span className="text-xs text-muted-foreground">{p.comments} comments</span>
                </div>
              </div>
              <div className="text-sm font-semibold text-muted-foreground shrink-0">{p.upvotes} ↑</div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === "saved" && (
        <div className="space-y-3">
          {savedPosts.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 hover:shadow-md hover:border-primary/10 transition-all cursor-pointer"
            >
              <Bookmark className="h-4 w-4 text-primary fill-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-foreground text-sm truncate sm:whitespace-normal">{p.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{p.tag}</span>
                  <span className="text-xs text-muted-foreground">by {p.author}</span>
                </div>
              </div>
              <div className="text-sm font-semibold text-muted-foreground shrink-0">{p.upvotes} ↑</div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === "comments" && (
        <div className="space-y-3">
          {userComments.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-3 sm:p-4 hover:shadow-md hover:border-primary/10 transition-all cursor-pointer"
            >
              <p className="text-xs text-muted-foreground mb-1">Commented on</p>
              <p className="font-heading font-semibold text-foreground text-sm mb-2">{c.post}</p>
              <p className="text-sm text-foreground/80 leading-relaxed">"{c.comment}"</p>
              <p className="text-xs text-muted-foreground mt-2">{c.upvotes} upvotes</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Profile;
