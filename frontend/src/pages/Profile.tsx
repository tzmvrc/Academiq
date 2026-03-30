import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Star,
  MessageCircle,
  ShieldCheck,
  Bookmark,
  Award,
  UserPlus,
  Check,
} from "lucide-react";
import AIBadge from "@/components/AIBadge";
import axiosInstance from "@/integration/axiosInstance";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  profile_url: string | null;
  school: string | null;
  role: string;
  points: number;
  followers_count: number;
  following_count: number;
  bio: string | null;
}

interface Forum {
  id: string;
  title: string;
  subject: { name: string };
  upvotes_count: number;
  comments_count: number;
  created_at: string;
}

interface SavedForum extends Forum {
  saved_at?: string;
}

interface Comment {
  id: string;
  forum: { title: string };
  content: string;
  upvotes_count: number;
  created_at: string;
}

type Tab = "posts" | "saved" | "comments";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [posts, setPosts] = useState<Forum[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedForum[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosInstance.get("/auth/me");
        setUser(response.data);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        toast({ title: "Failed to load profile", variant: "destructive" });
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch posts when user is loaded
  useEffect(() => {
    if (!user) return;
    const fetchPosts = async () => {
      setLoadingContent(true);
      try {
        const res = await axiosInstance.get(
          `/forums?userId=${user.id}&limit=10&sort=created_at`,
        );
        setPosts(res.data.forums || []);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setLoadingContent(false);
      }
    };
    fetchPosts();
  }, [user]);

  // Fetch saved posts (only if active tab is "saved")
  useEffect(() => {
    if (!user || activeTab !== "saved") return;
    const fetchSaved = async () => {
      try {
        const res = await axiosInstance.get("/forums/saved");
        setSavedPosts(res.data.saved || []);
      } catch (err) {
        console.error("Failed to fetch saved posts:", err);
      }
    };
    fetchSaved();
  }, [user, activeTab]);

  // Fetch comments
  useEffect(() => {
    if (!user || activeTab !== "comments") return;
    const fetchComments = async () => {
      try {
        const res = await axiosInstance.get(
          `/comments?userId=${user.id}&limit=10`,
        );
        setComments(res.data.comments || []);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      }
    };
    fetchComments();
  }, [user, activeTab]);

  if (loadingUser) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-secondary rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-secondary rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 text-center">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Stats from user data (points, followers, etc.) and computed from posts
  const totalPosts = posts.length;
  const totalComments = comments.length;
  const totalSaved = savedPosts.length;
  // For now, we don't have verified posts count; we'll use a placeholder
  const verifiedPosts = 0; // TODO: fetch from API if available

  const stats = [
    { label: "Reputation", value: user.points.toLocaleString(), icon: Star },
    { label: "Discussions", value: totalPosts.toString(), icon: MessageCircle },
    { label: "Comments", value: totalComments.toString(), icon: MessageCircle },
    { label: "Saved", value: totalSaved.toString(), icon: Bookmark },
  ];

  // Achievements (static for now; can be dynamic later)
  const achievements = [
    {
      title: "First Verified Post",
      description: "Your first AI-verified academic contribution",
      icon: "🎓",
    },
    {
      title: "Top Contributor",
      description: "Ranked in top 10% for Computer Science",
      icon: "🏆",
    },
    {
      title: "Peer Mentor",
      description: "Helped 50+ students with verified answers",
      icon: "🤝",
    },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "saved", label: "Saved" },
    { key: "comments", label: "Comments" },
  ];

  const handleForumClick = (id: string) => {
    navigate(`/post/${id}`);
  };

  const renderContent = () => {
    if (loadingContent) {
      return (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      );
    }

    switch (activeTab) {
      case "posts":
        if (posts.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              No posts yet.
            </div>
          );
        }
        return (
          <div className="space-y-3">
            {posts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleForumClick(p.id)}
                className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 hover:shadow-md hover:border-primary/10 transition-all cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-foreground text-sm truncate sm:whitespace-normal">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {p.subject.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.comments_count} comments
                    </span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-muted-foreground shrink-0">
                  {p.upvotes_count} ↑
                </div>
              </div>
            ))}
          </div>
        );

      case "saved":
        if (savedPosts.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              No saved posts.
            </div>
          );
        }
        return (
          <div className="space-y-3">
            {savedPosts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleForumClick(p.id)}
                className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 hover:shadow-md hover:border-primary/10 transition-all cursor-pointer">
                <Bookmark className="h-4 w-4 text-primary fill-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-foreground text-sm truncate sm:whitespace-normal">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {p.subject.name}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-muted-foreground shrink-0">
                  {p.upvotes_count} ↑
                </div>
              </div>
            ))}
          </div>
        );

      case "comments":
        if (comments.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet.
            </div>
          );
        }
        return (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                onClick={() => handleForumClick(c.forum.id)}
                className="rounded-xl border border-border bg-card p-3 sm:p-4 hover:shadow-md hover:border-primary/10 transition-all cursor-pointer">
                <p className="text-xs text-muted-foreground mb-1">
                  Commented on
                </p>
                <p className="font-heading font-semibold text-foreground text-sm mb-2">
                  {c.forum.title}
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  "{c.content}"
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {c.upvotes_count} upvotes
                </p>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {user.profile_url ? (
            <img
              src={user.profile_url}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl sm:text-2xl font-bold text-primary">
              {initials}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
            {user.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user.bio || "No bio yet."}
          </p>
          {user.school && (
            <p className="text-sm text-muted-foreground mt-1">{user.school}</p>
          )}
          <div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">
            <AIBadge variant="verified" size="md" />
            <span className="text-xs text-muted-foreground">
              Member since 2024
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 text-accent" />{" "}
              {user.points.toLocaleString()} reputation
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-3 sm:p-4 text-center">
            <s.icon className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-accent mb-1.5 sm:mb-2" />
            <p className="text-lg sm:text-xl font-heading font-bold text-foreground">
              {s.value}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {s.label}
            </p>
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
            className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="text-2xl mb-2">{a.icon}</div>
            <p className="font-heading font-semibold text-foreground text-sm">
              {a.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {a.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="profileTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
};

export default Profile;
