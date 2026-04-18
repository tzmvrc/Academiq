import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { useSocket } from "@/components/SocketContext";
import {
  UserPlus,
  Check,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import FeaturedSection from "@/components/FeaturedSection";
import DiscussionCard from "@/components/DiscussionCard";
import CreatePostModal from "@/components/CreatePostModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import FloatingActionButton from "@/components/FloatingActionButton";
import { SkeletonCard } from "@/components/SkeletonCard";
import PendingPostsPanel from "@/components/PendingPostsPanel";
import { toast } from "@/hooks/use-toast";
import { DiscussionCardSkeleton } from "@/components/SkeletonLoaders";
import {
  forumService,
  type DiscussionCardProps,
} from "@/integration/forum_service";
import axiosInstance from "@/integration/axiosInstance";

type TopicItem = {
  id: string;
  name: string;
  type: "subject" | "tag";
  discussionCount?: number;
};

interface PeerUser {
  id: string;
  name: string;
  profile_url: string | null;
  school: string | null;
  bio?: string | null;
  points?: number;
  followers_count: number;
  following_count?: number;
  mutual_count?: number;
  is_followed?: boolean;
}

// Helper to get current user from localStorage
const getCurrentUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return {
        id: parsed?.id || parsed?.user_id || null,
        name: parsed?.name || "You",
        initials: (parsed?.name || "You")
          .trim()
          .split(/\s+/)
          .map((part: string) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        profileUrl: parsed?.profile_url || null,
      };
    }

    const id =
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("id");

    return {
      id: id || null,
      name: "You",
      initials: "YO",
      profileUrl: null,
    };
  } catch {
    return {
      id: null,
      name: "You",
      initials: "YO",
      profileUrl: null,
    };
  }
};

const CURRENT_USER = getCurrentUser();

// COMMENTED OUT FOR NOW - Dummy forum that always appears at the end
/*
const DUMMY_FORUM: DiscussionCardProps = {
  id: "open-forum-dummy",
  title: "🌟 Open Forum",
  author: "ACADEMIQ COMMUNITY",
  authorSchool: "Open to all",
  authorInitials: "OF",
  authorProfileUrl: Icon,
  field: "General",
  tags: [
    { id: "open-forum", name: "Open" },
    { id: "announcements", name: "Academiq" },
    { id: "community", name: "Community" },
  ],
  preview:
    "Join the open forum for community discussions, announcements, and more.",
  fullContent: "",
  upvotes: 12,
  downvotes: 0,
  comments: 20,
  userVoteState: null,
  isSaved: false,
  isAiVerified: true,
  tag: "General",
  isOwn: false,
  aiSummary:
    "A public space for all Academiq members to share ideas, ask questions, and connect outside of specific subjects.",
};
*/

// Extracted PeopleVerticalSection component - prevents remounting on parent re-render
interface PeopleVerticalSectionProps {
  peersLoading: boolean;
  peers: PeerUser[];
  showAllPeers: boolean;
  followingUserId: string | null;
  onToggleShowAllPeers: (show: boolean) => void;
  onToggleFollowPeer: (
    userId: string,
    name: string,
    isFollowed: boolean,
  ) => void;
}

const PeopleVerticalSectionComponent = ({
  peersLoading,
  peers,
  showAllPeers,
  followingUserId,
  onToggleShowAllPeers,
  onToggleFollowPeer,
}: PeopleVerticalSectionProps) => {
  if (peersLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">
          People You May Know
        </h3>
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-secondary/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (peers.length === 0) return null;

  const visiblePeers = showAllPeers ? peers : peers.slice(0, 6);
  const hasMore = peers.length > 6;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-heading font-semibold text-foreground mb-4">
        People You May Know
      </h3>

      <div className="max-h-[600px] overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
        {visiblePeers.map((user) => {
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          const isFollowed = user.is_followed || false;
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-border bg-background p-3 hover:shadow-sm hover:border-primary/10 transition-all">
              <div className="flex items-start gap-3 mb-2">
                <Link
                  to={`/${encodeURIComponent(user.name)}`}
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {user.profile_url ? (
                      <img
                        src={user.profile_url}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-primary">
                        {initials}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/${encodeURIComponent(user.name)}`}
                    className="block"
                    onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm font-medium text-foreground truncate hover:text-primary">
                      {user.name}
                    </p>
                  </Link>
                  {user.school && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.school}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {(user.mutual_count ?? 0) > 0 ? (
                      <p className="text-[11px] text-accent font-medium">
                        {user.mutual_count} mutual
                      </p>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Star className="h-2.5 w-2.5 text-accent" />
                        <span>
                          {user.followers_count?.toLocaleString() || 0}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  onToggleFollowPeer(user.id, user.name, isFollowed)
                }
                disabled={followingUserId === user.id}
                className={`w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  isFollowed
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}>
                {followingUserId === user.id ? (
                  "Following..."
                ) : isFollowed ? (
                  <>
                    <Check className="h-3 w-3" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3" /> Follow
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => onToggleShowAllPeers(!showAllPeers)}
          className="mt-4 w-full rounded-lg border border-dashed border-border bg-background p-2 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-secondary/30 transition-all">
          <ArrowRight className="h-4 w-4" />
          <span className="text-xs font-medium">
            {showAllPeers ? "Show Less" : "See More"}
          </span>
        </button>
      )}
    </div>
  );
};

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const subjectId = searchParams.get("subjectId");
  const tagId = searchParams.get("tagId");

  const [followedTopics, _setFollowedTopics] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [forums, setForums] = useState<DiscussionCardProps[]>([]);
  const [boostedForums, setBoostedForums] = useState<DiscussionCardProps[]>([]); // 🚀 Feed boost state
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterName, setFilterName] = useState<string>("");

  // Pagination state
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Use refs to avoid stale closures and prevent duplicate requests
  const pageRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  // 🔥 DEBUG MODE: No caching - always fetch fresh data

  // Peers state
  const [peers, setPeers] = useState<PeerUser[]>([]);
  const [peersLoading, setPeersLoading] = useState(true);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [showAllPeers, setShowAllPeers] = useState(false);

  // Edit/Delete state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostData, setSelectedPostData] =
    useState<DiscussionCardProps | null>(null);

  // Intersection Observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

  // Display forums + skeleton loading placeholder when loading more
  const displayForums = useMemo(() => {
    if (isLoadingMore && hasMoreRef.current) {
      return forums.concat([
        {
          id: "skeleton-placeholder",
          title: "",
          author: "",
          authorInitials: "",
          field: "",
          preview: "",
          fullContent: "",
          upvotes: 0,
          downvotes: 0,
          comments: 0,
          tag: "",
          isOwn: false,
          isSaved: false,
          userVoteState: null,
          isAiVerified: false,
        } as DiscussionCardProps,
      ]);
    }
    return forums;
  }, [forums, isLoadingMore]);

  // Combine with the dummy forum (always last) - COMMENTED OUT FOR NOW
  const allDiscussions = useMemo(() => {
    // 🚀 Merge boosted forums at the top, preventing duplicates
    const boostedIds = new Set(boostedForums.map((f) => f.id));
    const filteredRegularForums = displayForums.filter(
      (f) => !boostedIds.has(f.id),
    );
    return [...boostedForums, ...filteredRegularForums];
  }, [displayForums, boostedForums]);

  // Alternate between subjects and tags sorted by discussion count
  const alternatingTopics = useMemo(() => {
    // Separate and sort subjects and tags by discussionCount
    const subjects = topics
      .filter((t) => t.type === "subject")
      .sort((a, b) => (b.discussionCount || 0) - (a.discussionCount || 0));
    const tags = topics
      .filter((t) => t.type === "tag")
      .sort((a, b) => (b.discussionCount || 0) - (a.discussionCount || 0));

    // Interleave subjects and tags alternately
    const alternating: TopicItem[] = [];
    for (let i = 0; i < Math.max(subjects.length, tags.length); i++) {
      if (i < subjects.length) alternating.push(subjects[i]);
      if (i < tags.length) alternating.push(tags[i]);
    }

    return alternating.slice(0, 18);
  }, [topics]);

  // Reset pagination when filters change
  useEffect(() => {
    setForums([]);
    pageRef.current = 0;
    hasMoreRef.current = true;
    setInitialLoading(true);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
    setError(null);
  }, [subjectId, tagId]);

  // Load forums function
  const loadForums = useCallback(
    async (reset = false, _skipCache = false) => {
      // Prevent duplicate requests
      if (isLoadingMoreRef.current && !reset) {
        return;
      }

      // 🔥 DEBUG MODE: Always fetch fresh data - no caching

      try {
        if (reset) {
          setInitialLoading(true);
          pageRef.current = 0;
        } else {
          setIsLoadingMore(true);
          isLoadingMoreRef.current = true;
        }

        // Calculate offset based on current page
        const offset = pageRef.current * 10;

        const filters: {
          limit?: number;
          offset?: number;
        } = {
          limit: 10,
          offset,
        };

        // Use personalized feed when no filters, otherwise use filtered forums
        let newForums;
        let more;

        try {
          if (!subjectId && !tagId) {
            // Personalized feed

            const result = await forumService.getPersonalizedFeed(filters);

            newForums = result?.forums;
            more = result?.hasMore;

            if (!newForums) {
              throw new Error(
                "Feed API returned invalid structure: missing forums array",
              );
            }
          } else {
            // Filtered by subject or tag

            const filterParams = {
              ...(subjectId ? { subjectId } : {}),
              ...(tagId ? { tagId } : {}),
              ...filters,
            };
            const result = await forumService.getAllForums(filterParams);

            newForums = result?.forums;
            more = result?.hasMore;

            if (!newForums) {
              throw new Error(
                "Forums API returned invalid structure: missing forums array",
              );
            }
          }
        } catch (fetchErr) {
          setError("Failed to load forums.");
          throw fetchErr;
        }

        // Filter out rejected and unverified forums (defensive frontend filter)
        newForums = newForums.filter(
          (forum: any) =>
            forum.validation_status !== "rejected" &&
            forum.is_ai_verified !== false,
        );

        // Add saved state

        const forumsWithSaved = await Promise.all(
          newForums.map(async (forum) => {
            if (!forum.id) return { ...forum, isSaved: false };
            try {
              const saveRes = await forumService.getSaveStatus(forum.id);
              return { ...forum, isSaved: !!saveRes.saved };
            } catch (err) {
              return { ...forum, isSaved: false };
            }
          }),
        );

        // Update forums - APPEND if loading more, REPLACE if resetting
        setForums((prev) => {
          let updated: DiscussionCardProps[];
          if (reset) {
            console.log(`Reset: Loading ${forumsWithSaved.length} new forums`);
            updated = forumsWithSaved;
          } else {
            const existingIds = new Set(prev.map((f) => f.id));
            const uniqueNewForums = forumsWithSaved.filter(
              (f) => !existingIds.has(f.id),
            );
            console.log(
              `Appending ${uniqueNewForums.length} new forums (filtered from ${forumsWithSaved.length})`,
            );
            updated = [...prev, ...uniqueNewForums];
          }

          // 🔥 DEBUG MODE: No caching in debug mode

          return updated;
        });

        // Update refs and state
        hasMoreRef.current = more;

        // Increment page for next load
        if (!reset) {
          pageRef.current += 1;
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to load forums: ${err.message}`);
        } else {
          setError("Failed to load forums.");
        }
      } finally {
        if (reset) {
          setInitialLoading(false);
        } else {
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;
        }
      }
    },
    [subjectId, tagId],
  );

  useEffect(() => {
    if (!socket) return;

    const handleValidationCompleted = (_data: {
      forumId: string;
      verdict: string;
    }) => {
      // Only refresh if the post belongs to the current user (optional, but safe)
      // We can simply refresh the feed to show the updated content.

      // Reset and reload feed, skip cache to get fresh data
      setForums([]);
      pageRef.current = 0;
      hasMoreRef.current = true;
      setInitialLoading(true);
      loadForums(true, true);
    };

    // 🚀 Listen for newly approved forums to boost them at the top
    const handleNewForumApproved = (newForum: {
      forumId: string;
      title: string;
      content: string;
      user: {
        id: string;
        name: string;
        profile_url?: string;
        school?: string;
      };
      subject?: {
        id: string;
        name: string;
      };
      created_at: string;
      timestamp: string;
    }) => {
      // Map the incoming data to DiscussionCardProps format
      const boostedForum: DiscussionCardProps = {
        id: newForum.forumId,
        user_id: newForum.user.id,
        title: newForum.title,
        author: newForum.user.name,
        authorInitials: newForum.user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        authorProfileUrl: newForum.user.profile_url || undefined,
        authorSchool: newForum.user.school || undefined,
        preview: newForum.content.substring(0, 100),
        fullContent: newForum.content,
        field: newForum.subject?.name || "General",
        upvotes: 0,
        downvotes: 0,
        comments: 0,
        tag: "New",
        isOwn: false,
        isSaved: false,
        userVoteState: null,
        isAiVerified: true,
        created_at: newForum.created_at,
      };

      // Add to boosted forums (prevent duplicates)
      setBoostedForums((prev) => {
        const isDuplicate = prev.some((f) => f.id === boostedForum.id);
        if (isDuplicate) {
          return prev;
        }

        return [boostedForum, ...prev];
      });
    };

    socket.on("forum_validation_completed", handleValidationCompleted);
    socket.on("forum:new", handleNewForumApproved);

    return () => {
      socket.off("forum_validation_completed", handleValidationCompleted);
      socket.off("forum:new", handleNewForumApproved);
    };
  }, [socket, loadForums]);

  // Initial load
  useEffect(() => {
    loadForums(true);
  }, [subjectId, tagId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more when sentinel becomes visible
  useEffect(() => {
    if (
      inView &&
      hasMoreRef.current &&
      !isLoadingMoreRef.current &&
      !initialLoading
    ) {
      loadForums(false);
    }
  }, [inView, initialLoading, loadForums]);

  // Load peers data (using new personalized suggestions)
  useEffect(() => {
    const fetchPeers = async () => {
      try {
        setPeersLoading(true);
        // Get 20 users sorted by mutual connections
        const suggestedUsers = await forumService.getPeopleYouMayKnow(20);
        const usersWithFollow = suggestedUsers.map((user: any) => ({
          ...user,
          is_followed: false, // These are suggestions, not follows
          mutual_count: user.mutual_count || 0,
        }));
        // Sort by mutual_count (descending) for stable ordering
        const sortedUsers = usersWithFollow.sort(
          (a, b) => (b.mutual_count || 0) - (a.mutual_count || 0),
        );
        setPeers(sortedUsers);
      } catch (err) {
        // Fallback: fetch general users
        try {
          const usersRes = await axiosInstance.get("/peers/users");
          const allUsers = usersRes.data.users || [];
          const followingRes = await axiosInstance.get(
            "/peers/users/me/following",
          );
          const following = followingRes.data.following || [];
          const followingIdsSet: Set<string> = new Set(
            following.map((f: any) => f.following.id),
          );
          const usersWithFollow = allUsers.map((user: PeerUser) => ({
            ...user,
            is_followed: followingIdsSet.has(user.id),
            mutual_count: user.mutual_count || 0,
          }));
          // Sort by mutual_count for stable ordering
          const sortedUsers = usersWithFollow.sort(
            (
              a: PeerUser & { is_followed: boolean },
              b: PeerUser & { is_followed: boolean },
            ) => (b.mutual_count || 0) - (a.mutual_count || 0),
          );
          setPeers(sortedUsers);
        } catch (fallbackErr) {
          console.error("Fallback peers fetch failed:", fallbackErr);
        }
      } finally {
        setPeersLoading(false);
      }
    };

    fetchPeers();
  }, []); // ✅ Empty dependency array - only run once on mount

  // Load subjects and popular tags for "Topics You May Like"
  useEffect(() => {
    const loadTrendingTopics = async () => {
      try {
        const res = await axiosInstance.get("/subjects/trending?limit=18");
        const trendingTopics = res.data.topics;
        setTopics(trendingTopics);
      } catch (err) {
        console.error("Error loading trending topics:", err);
      }
    };
    loadTrendingTopics();
  }, []);

  // Update filter name when subjectId/tagId changes or topics load
  useEffect(() => {
    const updateFilterName = async () => {
      if (subjectId) {
        const subject = topics.find(
          (t) => t.type === "subject" && t.id === subjectId,
        );
        if (subject) {
          setFilterName(subject.name);
        } else {
          try {
            const res = await axiosInstance.get(`/subjects/${subjectId}`);
            setFilterName(res.data.subject?.name || "Subject");
          } catch {
            setFilterName("Subject");
          }
        }
      } else if (tagId) {
        const tag = topics.find((t) => t.type === "tag" && t.id === tagId);
        if (tag) {
          setFilterName(tag.name);
        } else {
          try {
            const res = await axiosInstance.get(`/tags/${tagId}`);
            setFilterName(res.data.tag?.name || "Tag");
          } catch {
            setFilterName("Tag");
          }
        }
      } else {
        setFilterName("");
      }
    };

    updateFilterName();
  }, [subjectId, tagId, topics]);

  const handleTopicClick = (item: TopicItem) => {
    if (item.type === "subject") {
      setSearchParams({ subjectId: item.id });
    } else {
      setSearchParams({ tagId: item.id });
    }
  };

  const clearFilter = () => {
    setSearchParams({});
  };

  const handleCreatePost = async (data: {
    title: string;
    content: string;
    category: string;
    tagIds?: string[];
    file?: File;
  }) => {
    const result = await forumService.createForum({
      title: data.title,
      content: data.content,
      subject: data.category,
      tagIds: data.tagIds,
      file: data.file,
    });
    // Dispatch custom event for PendingPostsPanel to add the new post instantly
    const newPost = {
      id: result.forum.id,
      title: result.forum.title,
      created_at: result.forum.created_at,
      validation_status: "pending",
    };
    window.dispatchEvent(new CustomEvent("post-created", { detail: newPost }));
  };

  // Edit/Delete Handlers
  const handleEditPost = (post: DiscussionCardProps) => {
    setSelectedPostId(post.id!);
    setSelectedPostData(post);
    setEditModalOpen(true);
  };

  const handleDeletePost = (postId: string) => {
    setSelectedPostId(postId);
    setDeleteModalOpen(true);
  };

  const confirmDeletePost = async () => {
    if (!selectedPostId) return;
    try {
      await axiosInstance.delete(`/forums/${selectedPostId}`);
      setForums((prev) => prev.filter((f) => f.id !== selectedPostId));
      toast({ title: "Post deleted." });
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Failed to delete post",
        variant: "destructive",
      });
    } finally {
      setDeleteModalOpen(false);
      setSelectedPostId(null);
    }
  };

  const handlePostUpdated = () => {
    if (!selectedPostId) return;

    // Remove the post from the feed (it's now pending and will be revalidated)
    setForums((prev) => prev.filter((f) => f.id !== selectedPostId));

    toast({
      title: "Post updated",
      description:
        "Your changes are being reviewed. You'll be notified when approved.",
    });

    setEditModalOpen(false);
    setSelectedPostId(null);
    setSelectedPostData(null);
  };

  // In Index.tsx

  const handleVoteForum = async (forumId: string, voteType: 1 | -1) => {
    try {
      const result = await forumService.voteForum(forumId, voteType);
      setForums((prevForums) =>
        prevForums.map((forum) =>
          forum.id === forumId
            ? {
                ...forum,
                userVoteState: voteType,
                upvotes: result.voteCount.upvotes,
                downvotes: result.voteCount.downvotes,
              }
            : forum,
        ),
      );
      toast({ title: voteType === 1 ? "Upvoted!" : "Downvoted!" });
    } catch (err) {
      console.error("Error voting:", err);
      toast({
        title: "Error voting",
        description: "Failed to vote on this forum.",
        variant: "destructive",
      });
    }
  };

  const handleUnvoteForum = async (forumId: string) => {
    try {
      const result = await forumService.unvoteForum(forumId);
      setForums((prevForums) =>
        prevForums.map((forum) =>
          forum.id === forumId
            ? {
                ...forum,
                userVoteState: null,
                upvotes: result.voteCount.upvotes,
                downvotes: result.voteCount.downvotes,
              }
            : forum,
        ),
      );
      toast({ title: "Vote removed" });
    } catch (err) {
      console.error("Error removing vote:", err);
      toast({
        title: "Error removing vote",
        description: "Failed to remove your vote.",
        variant: "destructive",
      });
    }
  };

  const handleSaveForum = async (forumId: string) => {
    try {
      const result = await forumService.toggleSaveForum(forumId);
      setForums((prevForums) =>
        prevForums.map((forum) =>
          forum.id === forumId ? { ...forum, isSaved: result.saved } : forum,
        ),
      );
      toast({ title: result.saved ? "Forum saved" : "Forum unsaved" });
      return result.saved;
    } catch (err) {
      console.error("Error saving forum:", err);
      toast({
        title: "Error saving forum",
        description: "Failed to save this forum.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Peers follow/unfollow handler
  const toggleFollowPeer = async (
    userId: string,
    name: string,
    isFollowed: boolean,
  ) => {
    if (followingUserId === userId) return;
    setFollowingUserId(userId);
    try {
      if (isFollowed) {
        await axiosInstance.delete(`/peers/${userId}/unfollow`);
        setPeers((prev) => {
          const updated = prev.map((user) =>
            user.id === userId ? { ...user, is_followed: false } : user,
          );
          // Keep sorted by mutual_count
          return updated.sort(
            (a, b) => (b.mutual_count || 0) - (a.mutual_count || 0),
          );
        });
        toast({ title: `Unfollowed ${name}` });
      } else {
        await axiosInstance.post(`/peers/${userId}/follow`);
        setPeers((prev) => {
          const updated = prev.map((user) =>
            user.id === userId ? { ...user, is_followed: true } : user,
          );
          // Keep sorted by mutual_count
          return updated.sort(
            (a, b) => (b.mutual_count || 0) - (a.mutual_count || 0),
          );
        });
        toast({ title: `Following ${name}` });
      }
    } catch (err: any) {
      console.error("Follow/unfollow error:", err);
      toast({
        title: err?.response?.data?.error || "Action failed",
        variant: "destructive",
      });
    } finally {
      setFollowingUserId(null);
    }
  };

  // Render forums with people section inserted after 3rd post
  const renderForumsList = () => {
    const items: React.ReactNode[] = [];

    for (let i = 0; i < allDiscussions.length; i++) {
      const d = allDiscussions[i];
      if (!d) continue;

      // Render skeleton loading placeholder
      if (d.id === "skeleton-placeholder") {
        items.push(<SkeletonCard key="skeleton-loading" />);
        continue;
      }

      const isAuthor =
        d.id !== "open-forum-dummy" && CURRENT_USER.id === d.user_id;

      const navigateTo =
        d.id === "open-forum-dummy" ? "/open-forum" : `/post/${d.id}`;

      items.push(
        <div
          key={`${d.id}-${i}`}
          onClick={() => navigate(navigateTo)}
          onKeyDown={(e) => e.key === "Enter" && navigate(navigateTo)}
          role="link"
          tabIndex={0}
          className="block cursor-pointer">
          <DiscussionCard
            {...d}
            documentUrl={
              (d.documentUrl === null ? undefined : d.documentUrl) as
                | string
                | undefined
            }
            isSaved={d.isSaved}
            index={i}
            isAuthor={isAuthor}
            onEdit={d.id !== "open-forum-dummy" ? handleEditPost : undefined}
            onDelete={
              d.id !== "open-forum-dummy" ? handleDeletePost : undefined
            }
            onVote={
              d.id !== "open-forum-dummy"
                ? (voteType) => handleVoteForum(d.id!, voteType)
                : undefined
            }
            onUnvote={
              d.id !== "open-forum-dummy"
                ? () => handleUnvoteForum(d.id!)
                : undefined
            }
            onSave={
              d.id !== "open-forum-dummy"
                ? () => handleSaveForum(d.id!)
                : undefined
            }
          />
        </div>,
      );

      // People section moved to right column as vertical list
      // if (i === 2) {
      //   items.push(<PeopleSection key="people-section" />);
      // }
    }

    return items;
  };

  const topicsScrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = useCallback(
    (
      ref: React.RefObject<HTMLDivElement | null>,
      direction: "left" | "right",
    ) => {
      if (ref.current) {
        ref.current.scrollBy({
          left: direction === "left" ? -200 : 200,
          behavior: "smooth",
        });
      }
    },
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      {!subjectId && !tagId && <FeaturedSection />}

      {(subjectId || tagId) && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground">
            {filterName
              ? `${filterName} Discussions`
              : subjectId
                ? "Subject Discussions"
                : tagId
                  ? "Tag Discussions"
                  : ""}
          </h2>
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <X className="h-3 w-3" /> Clear filter
          </button>
        </div>
      )}

      {!subjectId && !tagId && (
        <section className="mb-8 sm:mb-12">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-4">
            Topics You May Like
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll(topicsScrollRef, "left")}
              className="shrink-0 rounded-full border border-border bg-background p-1 hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div
              ref={topicsScrollRef}
              className="flex gap-2 sm:gap-3 overflow-x-hidden scroll-smooth flex-1"
              style={{ scrollbarWidth: "none" }}>
              {alternatingTopics.map((item, i) => (
                <motion.button
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleTopicClick(item)}
                  className={`shrink-0 flex items-center gap-2 rounded-lg border px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium transition-all ${
                    followedTopics.has(item.name)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/15 hover:shadow-sm"
                  }`}>
                  {item.type === "tag" && "#"}
                  {item.name}
                  <span className="text-xs text-muted-foreground ml-1">
                    {item.discussionCount} posts
                  </span>
                  {followedTopics.has(item.name) && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </motion.button>
              ))}
            </div>
            <button
              onClick={() => scroll(topicsScrollRef, "right")}
              className="shrink-0 rounded-full border border-border bg-background p-1 hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </section>
      )}

      {/* Two‑column layout */}
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr_280px]">
        {/* Left column – discussions */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              {subjectId || tagId ? "" : "Recommended Discussions"}
            </h2>
            {/* <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> New Post
            </button> */}
          </div>

          {error && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {error}
            </div>
          )}

          {initialLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <DiscussionCardSkeleton key={i} index={i} />
              ))}
            </div>
          ) : (
            <>
              {renderForumsList()}

              {/* Sentinel for intersection observer – triggers load more */}
              {hasMoreRef.current && !isLoadingMoreRef.current && (
                <div ref={loadMoreRef} className="h-10 w-full" />
              )}

              {/* End of list message */}
              {!hasMoreRef.current && forums.length > 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">
                  You've reached the end – no more discussions.
                </p>
              )}

              {forums.length === 0 && !initialLoading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {subjectId || tagId
                      ? `No discussions found for this filter.`
                      : "No discussions yet. Create the first post!"}
                  </p>
                  {(subjectId || tagId) && (
                    <button
                      onClick={clearFilter}
                      className="text-primary hover:underline text-sm mt-2">
                      View all discussions
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column – People suggestions (sticky) */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <PendingPostsPanel />
            <PeopleVerticalSectionComponent
              peersLoading={peersLoading}
              peers={peers}
              showAllPeers={showAllPeers}
              followingUserId={followingUserId}
              onToggleShowAllPeers={setShowAllPeers}
              onToggleFollowPeer={toggleFollowPeer}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />

      <CreatePostModal
        key={selectedPostId || "create"}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        initialData={
          selectedPostData
            ? {
                title: selectedPostData.title,
                content: selectedPostData.fullContent,
                category: selectedPostData.field,
                fileName: selectedPostData.documentUrl || undefined,
                tagIds: selectedPostData.tags?.map((t) => t.id) || [],
              }
            : undefined
        }
        mode="edit"
        forumId={selectedPostId || undefined}
        onSuccess={handlePostUpdated}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone. All comments and attached files will be removed."
      />

      <FloatingActionButton onClick={() => setShowCreateModal(true)} />
    </div>
  );
};

export default Index;
