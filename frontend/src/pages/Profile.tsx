import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import EditProfileModal from "@/components/EdittProfileModal";
import {
  Star,
  MessageCircle,
  Bookmark,
  ArrowBigUp,
  UserPlus,
  Check,
  Edit3,
  X,
  Search,
  Trophy,
} from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/hooks/use-toast";
import { useSocket } from "@/components/SocketContext";

// Types
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
  privacy?: "public" | "private";
}

interface FollowerUser {
  id: string;
  name: string;
  profile_url: string | null;
  school: string | null;
  is_followed?: boolean;
}

interface Forum {
  id: string;
  title: string;
  content: string;
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
  forum: {
    id: string;
    title: string;
    subject: { name: string };
  };
  content: string;
  upvotes_count: number;
  created_at: string;
}

type Tab = "posts" | "saved" | "comments" | "achievements";

const ITEMS_LIMIT = 5;

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const Profile = () => {
  const navigate = useNavigate();
  const { userName } = useParams<{ userName: string }>();
  const { socket } = useSocket();
  const [user, setUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingFollowStatus, setLoadingFollowStatus] = useState(true);
  const [posts, setPosts] = useState<Forum[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedForum[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [loadingContent, setLoadingContent] = useState(false);
  const [featuredAchievements, setFeaturedAchievements] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Followers/Following modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<FollowerUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowerUser[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followModalLoading, setFollowModalLoading] = useState<string | null>(
    null,
  );
  const [followersSearchTerm, setFollowersSearchTerm] = useState("");
  const [followingSearchTerm, setFollowingSearchTerm] = useState("");

  // Determine if current user can view the profile's followers/following lists
  // Can view if: own profile OR profile is public OR is following the user
  const canViewFollowLists =
    isOwnProfile || user?.privacy !== "private" || isFollowing;

  const handleFollowersClick = () => {
    if (canViewFollowLists) {
      setShowFollowersModal(true);
    } else {
      toast({
        title: "This profile is private",
        description: "Follow to see their followers.",
        variant: "default",
      });
    }
  };

  const handleFollowingClick = () => {
    if (canViewFollowLists) {
      setShowFollowingModal(true);
    } else {
      toast({
        title: "This profile is private",
        description: "Follow to see who they follow.",
        variant: "default",
      });
    }
  };

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        setCurrentUserId(res.data.id);
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch profile user by name
  useEffect(() => {
    if (!userName) {
      navigate("/feed");
      return;
    }

    const fetchProfileUser = async () => {
      setLoadingUser(true);
      setLoadingFollowStatus(true);
      try {
        const res = await axiosInstance.get(
          `/auth/users/name/${encodeURIComponent(userName)}`,
        );
        const userData = res.data;

        // Fetch privacy settings from profile endpoint
        const profileRes = await axiosInstance.get(`/profile/${userData.id}`);
        const profileData = profileRes.data.data || {};

        // Merge user data with privacy
        const userWithPrivacy = {
          ...userData,
          privacy: profileData.privacy || "public",
        };

        setUser(userWithPrivacy);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        toast({ title: "User not found", variant: "destructive" });
        navigate("/feed");
      } finally {
        setLoadingUser(false);
      }
    };
    fetchProfileUser();
  }, [userName, navigate]);

  // Determine if own profile and fetch follow status
  useEffect(() => {
    if (user && currentUserId) {
      const own = user.id === currentUserId;
      setIsOwnProfile(own);
      if (!own && currentUserId) {
        const checkFollowStatus = async () => {
          try {
            const followingRes = await axiosInstance.get(
              "/peers/users/me/following",
            );
            const following = followingRes.data.following || [];
            const followingIds = new Set(
              following.map((f: any) => f.following.id),
            );
            setIsFollowing(followingIds.has(user.id));
          } catch (err) {
            console.error("Failed to fetch follow status:", err);
          } finally {
            setLoadingFollowStatus(false);
          }
        };
        checkFollowStatus();
      } else {
        setLoadingFollowStatus(false);
      }
    }
  }, [user, currentUserId]);

  // Fetch content (posts, comments, saved)
  useEffect(() => {
    if (!user) return;

    const fetchContent = async () => {
      setLoadingContent(true);
      try {
        const promises: Promise<any>[] = [
          axiosInstance.get(`/forums/user?userId=${user.id}&limit=10`),
          axiosInstance.get(`/forums/comments?userId=${user.id}&limit=10`),
          axiosInstance.get(`/achievements/user/${user.id}`),
        ];
        if (isOwnProfile) {
          promises.push(axiosInstance.get("/forums/saved"));
        }

        const results = await Promise.allSettled(promises);
        const [postsRes, commentsRes, achievementsRes, ...otherResults] =
          results;

        if (postsRes.status === "fulfilled") {
          setPosts(postsRes.value.data.forums || []);
        } else {
          console.error("Failed to fetch posts:", postsRes.reason);
        }

        if (commentsRes.status === "fulfilled") {
          setComments(commentsRes.value.data.comments || []);
        } else {
          console.error("Failed to fetch comments:", commentsRes.reason);
        }

        if (achievementsRes.status === "fulfilled") {
          const allAchievements = achievementsRes.value.data.achievements || [];

          // Get featured achievement IDs from localStorage
          const featuredKey = `featured_achievements_${user.id}`;
          const storedFeatured = localStorage.getItem(featuredKey);
          const featuredIds = storedFeatured ? JSON.parse(storedFeatured) : [];

          // Filter to show only featured achievements if any are selected
          let displayAchievements = allAchievements;
          if (featuredIds.length > 0) {
            displayAchievements = allAchievements.filter((ach: any) =>
              featuredIds.includes(ach.id),
            );
          }

          setFeaturedAchievements(displayAchievements);
        } else {
          console.error(
            "Failed to fetch achievements:",
            achievementsRes.reason,
          );
        }

        if (
          isOwnProfile &&
          otherResults[0] &&
          otherResults[0].status === "fulfilled"
        ) {
          setSavedPosts(otherResults[0].value.data.saved || []);
        }
      } catch (err) {
        console.error("Error fetching content:", err);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [user, isOwnProfile]);

  // Reset expanded state when switching tabs
  useEffect(() => {
    setShowAll(false);
  }, [activeTab]);

  // Listen to real-time follow stats updates
  useEffect(() => {
    if (!socket || !user) return;

    const handleStatsUpdate = (data: {
      userId: string;
      followers_count?: number;
      following_count?: number;
    }) => {
      if (data.userId === user.id) {
        setUser((prevUser) => {
          if (!prevUser) return prevUser;
          return {
            ...prevUser,
            followers_count:
              data.followers_count !== undefined
                ? data.followers_count
                : prevUser.followers_count,
            following_count:
              data.following_count !== undefined
                ? data.following_count
                : prevUser.following_count,
          };
        });
      }
    };

    socket.on("follow_stats_updated", handleStatsUpdate);
    return () => {
      socket.off("follow_stats_updated", handleStatsUpdate);
    };
  }, [socket, user?.id]);

  // Fetch followers when modal opens
  useEffect(() => {
    if (showFollowersModal && user) {
      const fetchFollowers = async () => {
        setLoadingFollowers(true);
        try {
          const res = await axiosInstance.get(
            `/peers/users/${user.id}/followers`,
          );
          let followers = res.data.followers || [];
          if (currentUserId) {
            const followingRes = await axiosInstance.get(
              "/peers/users/me/following",
            );
            const followingList = followingRes.data.following || [];
            const followingIds = new Set(
              followingList.map((f: any) => f.following?.id || f.id),
            );
            followers = followers.map((f: any) => ({
              ...f,
              is_followed: followingIds.has(f.id),
            }));
          }
          setFollowersList(followers);
          setFollowersSearchTerm(""); // reset search when modal opens
        } catch (err) {
          console.error("Failed to fetch followers:", err);
          toast({ title: "Failed to load followers", variant: "destructive" });
        } finally {
          setLoadingFollowers(false);
        }
      };
      fetchFollowers();
    }
  }, [showFollowersModal, user, currentUserId]);

  // Fetch following when modal opens
  useEffect(() => {
    if (showFollowingModal && user) {
      const fetchFollowing = async () => {
        setLoadingFollowing(true);
        try {
          const res = await axiosInstance.get(
            `/peers/users/${user.id}/following`,
          );
          let following = res.data.following || [];
          if (currentUserId) {
            const followingRes = await axiosInstance.get(
              "/peers/users/me/following",
            );
            const followingList = followingRes.data.following || [];
            const followingIds = new Set(
              followingList.map((f: any) => f.following?.id || f.id),
            );
            following = following.map((f: any) => ({
              ...f,
              is_followed: followingIds.has(f.id),
            }));
          }
          setFollowingList(following);
          setFollowingSearchTerm(""); // reset search when modal opens
        } catch (err) {
          console.error("Failed to fetch following:", err);
          toast({ title: "Failed to load following", variant: "destructive" });
        } finally {
          setLoadingFollowing(false);
        }
      };
      fetchFollowing();
    }
  }, [showFollowingModal, user, currentUserId]);

  // const refetchFollowStatus = async () => {
  //   if (!user || !currentUserId) return;
  //   try {
  //     const followingRes = await axiosInstance.get("/peers/users/me/following");
  //     const following = followingRes.data.following || [];
  //     const followingIds = new Set(
  //       following.map((f: any) => f.following?.id || f.id),
  //     );
  //     setIsFollowing(followingIds.has(user.id));
  //   } catch (err) {
  //     console.error("Failed to refetch follow status:", err);
  //   }
  // };

  // Refresh user data including privacy from backend
  const refreshUserData = async () => {
    if (!user) return;
    try {
      // Fetch privacy from profile endpoint
      const profileRes = await axiosInstance.get(`/profile/${user.id}`);
      const profileData = profileRes.data.data || {};

      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          privacy: profileData.privacy || "public",
          bio: profileData.bio || prevUser.bio,
          profile_url: profileData.profile_url || prevUser.profile_url,
        };
      });
    } catch (err) {
      console.error("Failed to refresh user data:", err);
    }
  };

  // Refresh featured achievements from localStorage
  const refreshFeaturedAchievements = async () => {
    if (!user) return;
    try {
      // Fetch all user achievements
      const res = await axiosInstance.get(`/achievements/user/${user.id}`);
      const allAchievements = res.data.achievements || [];

      // Get featured achievement IDs from localStorage
      const featuredKey = `featured_achievements_${user.id}`;
      const storedFeatured = localStorage.getItem(featuredKey);
      const featuredIds = storedFeatured ? JSON.parse(storedFeatured) : [];

      // Filter to show only featured achievements if any are selected
      let displayAchievements = allAchievements;
      if (featuredIds.length > 0) {
        displayAchievements = allAchievements.filter((ach: any) =>
          featuredIds.includes(ach.id),
        );
      }

      setFeaturedAchievements(displayAchievements);
    } catch (err) {
      console.error("Failed to refresh featured achievements:", err);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !currentUserId) return;
    setLoadingFollow(true);
    try {
      if (isFollowing) {
        await axiosInstance.delete(`/peers/${user.id}/unfollow`);
        setIsFollowing(false);
      } else {
        await axiosInstance.post(`/peers/${user.id}/follow`);
        setIsFollowing(true);
      }
      toast({
        title: isFollowing
          ? `Unfollowed ${user.name}`
          : `Following ${user.name}`,
      });
    } catch (err: any) {
      console.error("Follow/unfollow error:", err);
      // Revert the state change on error
      setIsFollowing(!isFollowing);
      toast({
        title: err?.response?.data?.error || "Action failed",
        variant: "destructive",
      });
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleFollowInModal = async (
    targetUserId: string,
    targetName: string,
    isCurrentlyFollowed: boolean,
    setList: React.Dispatch<React.SetStateAction<FollowerUser[]>>,
  ) => {
    if (followModalLoading === targetUserId) return;
    setFollowModalLoading(targetUserId);
    try {
      if (isCurrentlyFollowed) {
        await axiosInstance.delete(`/peers/${targetUserId}/unfollow`);
        setList((prev) =>
          prev.map((u) =>
            u.id === targetUserId ? { ...u, is_followed: false } : u,
          ),
        );
        toast({ title: `Unfollowed ${targetName}` });
      } else {
        await axiosInstance.post(`/peers/${targetUserId}/follow`);
        setList((prev) =>
          prev.map((u) =>
            u.id === targetUserId ? { ...u, is_followed: true } : u,
          ),
        );
        toast({ title: `Following ${targetName}` });
      }
    } catch (err: any) {
      console.error("Follow error:", err);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setFollowModalLoading(null);
    }
  };

  const handleSchoolClick = () => {
    if (user?.school) {
      navigate(`/school/${encodeURIComponent(user.school)}`);
    }
  };

  // Loading skeleton while user or follow status is still being fetched
  const isLoadingHeader = loadingUser || (!isOwnProfile && loadingFollowStatus);

  if (isLoadingHeader) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4 sm:gap-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 bg-secondary rounded" />
              <div className="h-4 w-64 bg-secondary rounded" />
              <div className="h-4 w-32 bg-secondary rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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

  const totalPosts = posts.length;
  const totalComments = comments.length;
  const totalSaved = savedPosts.length;

  const stats = [
    { label: "Points", value: user.points.toLocaleString(), icon: Star },
    { label: "Posts", value: totalPosts.toString(), icon: MessageCircle },
    { label: "Comments", value: totalComments.toString(), icon: MessageCircle },
    ...(isOwnProfile
      ? [{ label: "Saved", value: totalSaved.toString(), icon: Bookmark }]
      : []),
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts" as const, label: "Posts" },
    ...(isOwnProfile ? [{ key: "saved" as const, label: "Saved" }] : []),
    ...(isOwnProfile ? [{ key: "comments" as const, label: "Comments" }] : []),
    { key: "achievements" as const, label: "Achievements" },
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
      case "posts": {
        const displayPosts = showAll ? posts : posts.slice(0, ITEMS_LIMIT);
        if (posts.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              No posts yet.
            </div>
          );
        }
        return (
          <>
            <div className="space-y-3">
              {displayPosts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleForumClick(p.id)}
                  className="group rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-primary text-base line-clamp-2">
                        {p.title}
                      </h3>
                      {p.content && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {truncateText(p.content, 120)}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span className="text-xs">{p.comments_count}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 md:flex-col md:items-end shrink-0">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {p.subject?.name || "General"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.created_at)}
                        </span>
                        <div className="flex items-center gap-1 text-green-600">
                          <ArrowBigUp className="h-3.5 w-3.5" />
                          <span className="text-sm font-semibold">
                            {p.upvotes_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {posts.length > ITEMS_LIMIT && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-primary hover:underline">
                  {showAll ? "Show less" : "View more"}
                </button>
              </div>
            )}
          </>
        );
      }

      case "saved": {
        const displaySaved = showAll
          ? savedPosts
          : savedPosts.slice(0, ITEMS_LIMIT);
        if (savedPosts.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              No saved posts.
            </div>
          );
        }
        return (
          <>
            <div className="space-y-3">
              {displaySaved.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleForumClick(p.id)}
                  className="group rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-primary fill-primary shrink-0" />
                        <h3 className="font-heading font-semibold text-primary text-base line-clamp-2">
                          {p.title}
                        </h3>
                      </div>
                      {p.content && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {truncateText(p.content, 120)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 md:flex-col md:items-end shrink-0">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {p.subject?.name || "General"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.saved_at || p.created_at)}
                        </span>
                        <div className="flex items-center gap-1 text-green-600">
                          <ArrowBigUp className="h-3.5 w-3.5" />
                          <span className="text-sm font-semibold">
                            {p.upvotes_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {savedPosts.length > ITEMS_LIMIT && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-primary hover:underline">
                  {showAll ? "Show less" : "View more"}
                </button>
              </div>
            )}
          </>
        );
      }

      case "comments": {
        const displayComments = showAll
          ? comments
          : comments.slice(0, ITEMS_LIMIT);
        if (comments.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet.
            </div>
          );
        }
        return (
          <>
            <div className="space-y-3">
              {displayComments.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleForumClick(c.forum.id)}
                  className="group rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">Comment</span>
                      </div>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-primary">
                          {c.forum.title}
                        </span>
                        {" — "}
                        <span className="italic">"{c.content}"</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 md:flex-col md:items-end shrink-0">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {c.forum.subject?.name || "General"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(c.created_at)}
                        </span>
                        <div className="flex items-center gap-1 text-green-600">
                          <ArrowBigUp className="h-3.5 w-3.5" />
                          <span className="text-sm font-semibold">
                            {c.upvotes_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {comments.length > ITEMS_LIMIT && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-primary hover:underline">
                  {showAll ? "Show less" : "View more"}
                </button>
              </div>
            )}
          </>
        );
      }

      case "achievements":
        return (
          <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-8 text-center">
            <Trophy className="h-12 w-12 mx-auto text-amber-600 dark:text-amber-400 mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Achievements Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              We're working hard to bring you detailed achievement tracking and
              profiles. This feature will be available very soon!
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-600/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-600 dark:bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 dark:bg-amber-400"></span>
              </span>
              Upcoming Feature
            </div>
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
        {/* Profile picture with click preview */}
        <div
          onClick={() => user.profile_url && setShowImageModal(true)}
          className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ${user.profile_url ? "cursor-pointer" : ""}`}>
          {user.profile_url ? (
            <img
              src={user.profile_url}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl sm:text-2xl font-bold text-primary">
              {getInitials(user.name)}
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
            <button
              onClick={handleSchoolClick}
              className="text-sm text-primary hover:underline mt-1 cursor-pointer">
              {user.school}
            </button>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <span
              onClick={handleFollowersClick}
              className={`text-sm text-foreground ${canViewFollowLists ? "cursor-pointer hover:text-primary transition-colors" : "cursor-default"}`}>
              <span className="font-semibold">{user.followers_count}</span>{" "}
              <span className="text-muted-foreground">followers</span>
            </span>
            <span
              onClick={handleFollowingClick}
              className={`text-sm text-foreground ${canViewFollowLists ? "cursor-pointer hover:text-primary transition-colors" : "cursor-default"}`}>
              <span className="font-semibold">{user.following_count}</span>{" "}
              <span className="text-muted-foreground">following</span>
            </span>
            {!isOwnProfile ? (
              <button
                onClick={handleFollowToggle}
                disabled={loadingFollow}
                className={`flex items-center gap-2 px-5 py-1 rounded-md text-sm font-medium transition-colors ml-7 ${
                  isFollowing
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}>
                {loadingFollow ? (
                  "Loading..."
                ) : isFollowing ? (
                  <>
                    <Check className="h-4 w-4" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Follow
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg cursor-pointer text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  <Edit3 className="h-4 w-4" /> Edit Profile
                </button>
                {/* <span className="text-xs text-muted-foreground ml-2">
                  {user?.privacy === "private" ? "🔒 Private" : "🌐 Public"}
                </span> */}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4 mb-6 sm:mb-8">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: stats.findIndex((item) => item.label === s.label) * 0.05,
            }}
            className="rounded-xl border border-border bg-card p-2 md:p-4 text-center">
            <s.icon className="h-3 w-3 md:h-5 md:w-5 mx-auto text-accent mb-1" />
            <p className="text-sm md:text-xl font-heading font-bold text-foreground">
              {s.value}
            </p>
            <p className="text-[8px] md:text-xs text-muted-foreground truncate">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Featured Achievements */}
      {featuredAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-3">
            Featured Achievements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {featuredAchievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-border bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 p-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                    {achievement.achievement_icon || achievement.icon || "🏆"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2">
                      {achievement.achievement_name || achievement.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {achievement.achievement_description ||
                        achievement.description}
                    </p>
                    {achievement.unlocked_at && (
                      <p className="text-xs text-green-600/80 mt-2">
                        Unlocked{" "}
                        {new Date(achievement.unlocked_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

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

      {/* Followers Modal */}
      <AnimatePresence>
        {showFollowersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFollowersModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md max-h-[80vh] bg-card rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-heading font-semibold text-foreground">
                  Followers
                </h3>
                <button
                  onClick={() => setShowFollowersModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search followers..."
                    value={followersSearchTerm}
                    onChange={(e) => setFollowersSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="overflow-y-auto p-2 max-h-[calc(80vh-110px)]">
                {loadingFollowers ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : followersList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No followers yet.
                  </div>
                ) : (
                  followersList
                    .filter((f) =>
                      f.name
                        .toLowerCase()
                        .includes(followersSearchTerm.toLowerCase()),
                    )
                    .map((f, idx) => (
                      <div
                        key={f.id || `follower-${idx}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            navigate(`/${encodeURIComponent(f.name)}`);
                            setShowFollowersModal(false);
                          }}>
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {f.profile_url ? (
                              <img
                                src={f.profile_url}
                                alt={f.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-primary">
                                {getInitials(f.name)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {f.name}
                            </p>
                            {f.school && (
                              <p className="text-xs text-muted-foreground">
                                {f.school}
                              </p>
                            )}
                          </div>
                        </div>
                        {currentUserId && f.id !== currentUserId && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleFollowInModal(
                                f.id,
                                f.name,
                                !!f.is_followed,
                                setFollowersList,
                              );
                            }}
                            disabled={followModalLoading === f.id}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              f.is_followed
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}>
                            {followModalLoading === f.id
                              ? "..."
                              : f.is_followed
                                ? "Following"
                                : "Follow"}
                          </button>
                        )}
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Following Modal */}
      <AnimatePresence>
        {showFollowingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFollowingModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md max-h-[80vh] bg-card rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-heading font-semibold text-foreground">
                  Following
                </h3>
                <button
                  onClick={() => setShowFollowingModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search following..."
                    value={followingSearchTerm}
                    onChange={(e) => setFollowingSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="overflow-y-auto p-2 max-h-[calc(80vh-110px)]">
                {loadingFollowing ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : followingList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Not following anyone yet.
                  </div>
                ) : (
                  followingList
                    .filter((f) =>
                      f.name
                        .toLowerCase()
                        .includes(followingSearchTerm.toLowerCase()),
                    )
                    .map((f, idx) => (
                      <div
                        key={f.id || `following-${idx}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            navigate(`/${encodeURIComponent(f.name)}`);
                            setShowFollowingModal(false);
                          }}>
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {f.profile_url ? (
                              <img
                                src={f.profile_url}
                                alt={f.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-primary">
                                {getInitials(f.name)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {f.name}
                            </p>
                            {f.school && (
                              <p className="text-xs text-muted-foreground">
                                {f.school}
                              </p>
                            )}
                          </div>
                        </div>
                        {currentUserId && f.id !== currentUserId && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleFollowInModal(
                                f.id,
                                f.name,
                                !!f.is_followed,
                                setFollowingList,
                              );
                            }}
                            disabled={followModalLoading === f.id}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              f.is_followed
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}>
                            {followModalLoading === f.id
                              ? "..."
                              : f.is_followed
                                ? "Following"
                                : "Follow"}
                          </button>
                        )}
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={{
          id: user.id,
          name: user.name,
          bio: user.bio,
          profile_url: user.profile_url,
          privacy: user.privacy || "public",
        }}
        onUpdate={(updatedUser) => {
          setUser(updatedUser);
          // Refresh privacy and other data from backend to ensure they're in sync
          refreshUserData();
          // Refresh featured achievements from localStorage
          refreshFeaturedAchievements();
        }}
      />

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showImageModal && user.profile_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowImageModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}>
              <img
                src={user.profile_url}
                alt={user.name}
                className="w-auto h-auto max-w-full max-h-[90vh] rounded-xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
