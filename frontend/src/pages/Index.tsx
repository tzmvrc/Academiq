import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon.png";
import { motion } from "framer-motion";
import {
  UserPlus,
  Check,
  X,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import FeaturedSection from "@/components/FeaturedSection";
import DiscussionCard from "@/components/DiscussionCard";
import CreatePostModal from "@/components/CreatePostModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
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
};

interface PeerUser {
  id: string;
  name: string;
  profile_url: string | null;
  school: string | null;
  bio: string | null;
  points: number;
  followers_count: number;
  following_count: number;
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

// Dummy forum that always appears at the end
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
  isVerified: true,
  isAiVerified: true,
  tag: "General",
  aiSummary:
    "A public space for all Academiq members to share ideas, ask questions, and connect outside of specific subjects.",
};

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const subjectId = searchParams.get("subjectId");
  const tagId = searchParams.get("tagId");

  const [followedTopics, setFollowedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [forums, setForums] = useState<DiscussionCardProps[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterName, setFilterName] = useState<string>("");

  // Peers state
  const [peers, setPeers] = useState<PeerUser[]>([]);
  const [peersFollowingIds, setPeersFollowingIds] = useState<Set<string>>(
    new Set(),
  );
  const [peersLoading, setPeersLoading] = useState(true);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);

  // Edit/Delete state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostData, setSelectedPostData] =
    useState<DiscussionCardProps | null>(null);

  // Combine real forums with the dummy forum (always last)
  const allDiscussions = useMemo(() => [...forums, DUMMY_FORUM], [forums]);

  // Load forums – pass subjectId / tagId to backend
  useEffect(() => {
    const loadForums = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const filters: { subjectId?: string; tagId?: string } = {};
        if (subjectId) filters.subjectId = subjectId;
        if (tagId) filters.tagId = tagId;

        const fetchedForums = await forumService.getAllForums(filters);

        const forumsWithSavedState = await Promise.all(
          fetchedForums.map(async (forum) => {
            if (!forum.id) return { ...forum, isSaved: false };
            try {
              const saveRes = await forumService.getSaveStatus(forum.id);
              return { ...forum, isSaved: !!saveRes.saved };
            } catch {
              return { ...forum, isSaved: false };
            }
          }),
        );

        setForums(forumsWithSavedState);
      } catch (err) {
        console.error("Error loading forums:", err);
        setError("Failed to load forums.");
      } finally {
        setIsLoading(false);
      }
    };

    loadForums();
  }, [subjectId, tagId]);

  // Load peers data (similar to Peers component)
  useEffect(() => {
    const fetchPeers = async () => {
      try {
        setPeersLoading(true);
        const usersRes = await axiosInstance.get("/peers/users");
        const allUsers = usersRes.data.users || [];

        const followingRes = await axiosInstance.get(
          "/peers/users/me/following",
        );
        const following = followingRes.data.following || [];
        const followingIdsSet = new Set(
          following.map((f: any) => f.following.id),
        );

        const usersWithFollow = allUsers.map((user: PeerUser) => ({
          ...user,
          is_followed: followingIdsSet.has(user.id),
        }));

        setPeers(usersWithFollow);
        setPeersFollowingIds(followingIdsSet);
      } catch (err) {
        console.error("Error fetching peers:", err);
        toast({
          title: "Failed to load people you may know",
          variant: "destructive",
        });
      } finally {
        setPeersLoading(false);
      }
    };

    fetchPeers();
  }, []);

  // Load subjects and popular tags for "Topics You May Like"
  useEffect(() => {
    const loadTopics = async () => {
      try {
        // Fetch subjects (all)
        const subjectsRes = await axiosInstance.get("/subjects");
        const subjects = subjectsRes.data.subjects || [];

        // Fetch popular tags (limit 10)
        const tagsRes = await axiosInstance.get("/tags?sort=popular&limit=10");
        const tags = tagsRes.data.tags || [];

        // Combine: subjects first, then tags with "#" prefix
        const combined: TopicItem[] = [
          ...subjects.map((s: any) => ({
            id: s.id,
            name: s.name,
            type: "subject" as const,
          })),
          ...tags.map((t: any) => ({
            id: t.id,
            name: t.name,
            type: "tag" as const,
          })),
        ];
        setTopics(combined);
      } catch (err) {
        console.error("Error loading topics:", err);
      }
    };

    loadTopics();
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

  const handleNewPost = (newPost: DiscussionCardProps) => {
    setForums((prev) => [newPost, ...prev]);
  };

  const handleTagClick = (tagId: string) => {
    setSearchParams({ tagId });
  };

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

  const toggleFollowTopic = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setFollowedTopics((prev) => {
      const next = new Set(prev);
      const isFollowing = next.has(name);
      isFollowing ? next.delete(name) : next.add(name);

      toast({
        title: isFollowing ? `Unfollowed ${name}` : `Following ${name}`,
      });

      return next;
    });
  };

  const handleCreatePost = async (data: {
    title: string;
    content: string;
    category: string;
    tagIds?: string[];
    file?: File;
  }) => {
    const newForum = await forumService.createForum({
      title: data.title,
      content: data.content,
      subject: data.category,
      tagIds: data.tagIds,
      file: data.file,
    });
    navigate(`/post/${newForum.id}`);
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

  // Robust handler: after edit, fetch the latest forum data
  const handlePostUpdated = async () => {
    if (!selectedPostId) return;

    try {
      // Fetch the updated forum from the server
      const freshForum = await forumService.getForumById(selectedPostId);

      // Recompute truncated preview
      const truncatedPreview =
        (freshForum.fullContent || "").substring(0, 150) +
        ((freshForum.fullContent || "").length > 150 ? "..." : "");

      setForums((prev) =>
        prev.map((f) =>
          f.id === freshForum.id
            ? {
                ...f,
                title: freshForum.title,
                fullContent: freshForum.fullContent,
                preview: truncatedPreview,
                field: freshForum.field,
                tags: freshForum.tags,
                documentUrl: freshForum.documentUrl,
                // Keep other fields like author, votes, etc.
              }
            : f,
        ),
      );

      toast({ title: "Post updated successfully!" });
    } catch (err) {
      console.error("Failed to refresh forum after edit:", err);
      toast({
        title: "Post updated but could not refresh display",
        variant: "destructive",
      });
    } finally {
      setEditModalOpen(false);
      setSelectedPostId(null);
      setSelectedPostData(null);
    }
  };

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

      toast({
        title: voteType === 1 ? "Upvoted!" : "Downvoted!",
      });
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

      toast({
        title: "Vote removed",
      });
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
          forum.id === forumId
            ? {
                ...forum,
                isSaved: result.saved,
              }
            : forum,
        ),
      );

      toast({
        title: result.saved ? "Forum saved" : "Forum unsaved",
      });

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
        setPeers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, is_followed: false } : user,
          ),
        );
        setPeersFollowingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast({ title: `Unfollowed ${name}` });
      } else {
        await axiosInstance.post(`/peers/${userId}/follow`);
        setPeers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, is_followed: true } : user,
          ),
        );
        setPeersFollowingIds((prev) => new Set(prev).add(userId));
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

  // Build the feed items array (posts interleaved with a people section)
  const feedItems: { type: "post" | "people"; index: number }[] = [];
  allDiscussions.forEach((_, i) => {
    feedItems.push({ type: "post", index: i });
    if (i === 2) feedItems.push({ type: "people", index: 0 });
  });

  const peopleScrollRef = useRef<HTMLDivElement>(null);
  const topicsScrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback(
    (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
      if (ref.current) {
        ref.current.scrollBy({
          left: direction === "left" ? -200 : 200,
          behavior: "smooth",
        });
      }
    },
    [],
  );

  const ScrollButtons = ({
    scrollRef,
  }: {
    scrollRef: React.RefObject<HTMLDivElement>;
  }) => (
    <div className="flex gap-1">
      <button
        onClick={() => scroll(scrollRef, "left")}
        className="rounded-full border border-border bg-background p-1 hover:bg-secondary transition-colors">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <button
        onClick={() => scroll(scrollRef, "right")}
        className="rounded-full border border-border bg-background p-1 hover:bg-secondary transition-colors">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );

  const PeopleSection = () => {
    // Show only first 6 users (or all if fewer)
    const visiblePeers = peers.slice(0, 6);

    if (peersLoading) {
      return (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 my-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold text-foreground">
              People You May Know
            </h3>
            <div className="flex gap-1">
              <div className="h-6 w-6 rounded-full bg-secondary animate-pulse" />
              <div className="h-6 w-6 rounded-full bg-secondary animate-pulse" />
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="shrink-0 w-40 sm:w-44">
                <div className="h-32 rounded-xl bg-secondary/50 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (peers.length === 0) return null;

    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 my-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading font-semibold text-foreground">
            People You May Know
          </h3>
          <ScrollButtons scrollRef={peopleScrollRef} />
        </div>

        <div
          ref={peopleScrollRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "thin" }}>
          {visiblePeers.map((user) => {
            const initials = user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const isFollowed = user.is_followed || false;
            return (
              <div
                key={user.id}
                className="shrink-0 w-40 sm:w-44 rounded-xl border border-border bg-background p-3 sm:p-4 text-center hover:shadow-sm hover:border-primary/10 transition-all snap-start">
                <div className="mx-auto mb-2.5 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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

                <p className="text-xs font-medium text-foreground truncate">
                  {user.name}
                </p>
                {user.school && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {user.school}
                  </p>
                )}
                {user.bio && (
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                    {user.bio}
                  </p>
                )}
                <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground">
                  <Star className="h-2.5 w-2.5 text-accent" />
                  <span>{user.points?.toLocaleString() || 0} pts</span>
                </div>

                <button
                  onClick={() =>
                    toggleFollowPeer(user.id, user.name, isFollowed)
                  }
                  disabled={followingUserId === user.id}
                  className={`mt-3 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
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
              </div>
            );
          })}

          <button
            onClick={() => navigate("/peers")}
            className="shrink-0 w-40 sm:w-44 rounded-xl border border-dashed border-border bg-background p-3 sm:p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-secondary/30 transition-all snap-start">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-secondary flex items-center justify-center">
              <ArrowRight className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">See More</span>
          </button>
        </div>
      </div>
    );
  };

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
        <section className="mb-8 sm:mb-10">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-4">
            Topics You May Like
          </h2>

          <div className="flex items-center justify-between mb-2">
            <div />
            <ScrollButtons scrollRef={topicsScrollRef} />
          </div>

          <div
            ref={topicsScrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scroll-smooth"
            style={{ scrollbarWidth: "thin" }}>
            {topics.slice(0, 18).map((item, i) => (
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

                {followedTopics.has(item.name) && (
                  <Check className="h-3.5 w-3.5" />
                )}

                <span
                  role="button"
                  onClick={(e) => toggleFollowTopic(item.name, e)}
                  className="ml-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  {followedTopics.has(item.name) ? "✓" : "+"}
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              {subjectId || tagId ? "" : "Latest Discussions"}
            </h2>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> New Post
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <DiscussionCardSkeleton key={i} index={i} />
              ))}
            </div>
          ) : (
            <>
              {feedItems.map((item, idx) => {
                if (item.type === "people")
                  return <PeopleSection key="people-section" />;

                const d = allDiscussions[item.index];
                if (!d) return null;

                const isAuthor =
                  d.id !== "open-forum-dummy" && CURRENT_USER.id === d.user_id;

                // Navigate to /open-forum for dummy, otherwise to post details
                const navigateTo =
                  d.id === "open-forum-dummy" ? "/open-forum" : `/post/${d.id}`;

                return (
                  <div
                    onClick={() => navigate(navigateTo)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(navigateTo)}
                    role="link"
                    tabIndex={0}
                    key={d.id ?? idx}
                    className="block cursor-pointer">
                    <DiscussionCard
                      {...d}
                      isSaved={d.isSaved}
                      index={item.index}
                      isAuthor={isAuthor}
                      onEdit={
                        d.id !== "open-forum-dummy" ? handleEditPost : undefined
                      }
                      onDelete={
                        d.id !== "open-forum-dummy"
                          ? handleDeletePost
                          : undefined
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
                  </div>
                );
              })}

              {forums.length === 0 && !isLoading && (
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
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />

      {/* Edit Post Modal */}
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
                fileName: selectedPostData.documentUrl,
                tagIds: selectedPostData.tags?.map((t) => t.id) || [],
              }
            : undefined
        }
        mode="edit"
        forumId={selectedPostId || undefined}
        onSuccess={handlePostUpdated}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone. All comments and attached files will be removed."
      />
    </div>
  );
};

export default Index;
