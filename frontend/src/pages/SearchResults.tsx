import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search as SearchIcon,
  UserPlus,
  Check,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Plus,
  X,
} from "lucide-react";
import DiscussionCard from "@/components/DiscussionCard";
import { DiscussionCardSkeleton } from "@/components/SkeletonLoaders";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";
import { forumService } from "@/integration/forum_service";
import CreatePostModal from "@/components/CreatePostModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

// --- Interfaces (same as before) ---
interface SearchResultUser {
  id: string;
  name: string;
  profile_url: string | null;
  school: string | null;
  bio: string | null;
  points: number;
  is_followed?: boolean;
}

interface SearchResultForum {
  id: string;
  title: string;
  content: string;
  author: string;
  authorInitials: string;
  authorProfileUrl?: string | null;
  authorSchool?: string;
  field: string;
  tag: string; // legacy, subject name
  tags: { id: string; name: string }[];
  upvotes: number;
  downvotes: number;
  comments: number;
  userVoteState: 1 | -1 | null;
  isSaved: boolean;
  isVerified: boolean;
  isAiVerified: boolean;
  preview: string;
  fullContent: string;
  created_at: string;
  user_id: string;
  aiSummary?: string;
  documentUrl?: string | null;
}

interface SearchResultSubject {
  id: string;
  name: string;
}

interface SearchResultTag {
  id: string;
  name: string;
}

// --- Helper to get current user (same as feed) ---
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

// --- Helper to transform raw search forum into the shape expected by DiscussionCard ---
const transformSearchForum = (raw: any): SearchResultForum => {
  // Accept both camelCase and snake_case fields
  const aiSummary = raw.aiSummary ?? raw.ai_summary ?? "";
  const documentUrl = raw.documentUrl ?? raw.document_url ?? null;

  return {
    id: raw.id,
    title: raw.title,
    content: raw.content,
    author: raw.author,
    authorInitials: raw.authorInitials,
    authorProfileUrl: raw.authorProfileUrl,
    authorSchool: raw.authorSchool,
    field: raw.field,
    tag: raw.field, // legacy field, uses field value
    tags: raw.tags || [],
    upvotes: raw.upvotes,
    downvotes: raw.downvotes,
    comments: raw.comments,
    userVoteState: raw.userVoteState ?? null,
    isSaved: raw.isSaved ?? false,
    isVerified: raw.isVerified ?? true,
    isAiVerified: raw.isAiVerified ?? false,
    preview: raw.preview,
    fullContent: raw.fullContent,
    created_at: raw.created_at,
    user_id: raw.user_id,
    aiSummary,
    documentUrl,
  };
};

// --- Helper to transform forum from API response into SearchResultForum ---
const transformForumFromApi = (forum: any): SearchResultForum => {
  const author = forum.user?.name || "Unknown User";
  const authorInitials = author
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  const preview =
    (forum.content || "").substring(0, 150) +
    ((forum.content || "").length > 150 ? "..." : "");

  return {
    id: forum.id,
    title: forum.title,
    content: forum.content,
    author,
    authorInitials,
    authorProfileUrl: forum.user?.profile_url,
    authorSchool: forum.user?.school,
    field: forum.subject?.name || "General",
    tag: forum.subject?.name || "General",
    tags: forum.tags || [],
    upvotes: forum.upvotes_count || 0,
    downvotes: forum.downvotes_count || 0,
    comments: forum.comments_count || 0,
    userVoteState: null,
    isSaved: false,
    isVerified: true,
    isAiVerified: forum.is_ai_verified ?? false,
    preview,
    fullContent: forum.content || "",
    created_at: forum.created_at,
    user_id: forum.user_id,
    aiSummary: forum.ai_summary || "",
    documentUrl: forum.document_url || null,
  };
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SearchResultUser[]>([]);
  const [forums, setForums] = useState<SearchResultForum[]>([]);
  const [subjects, setSubjects] = useState<SearchResultSubject[]>([]);
  const [tags, setTags] = useState<SearchResultTag[]>([]);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);

  // Edit/Delete modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostData, setSelectedPostData] =
    useState<SearchResultForum | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentUser = getCurrentUser();

  // --- Follow/Unfollow (same as feed) ---
  const toggleFollow = async (
    userId: string,
    name: string,
    isFollowed: boolean,
  ) => {
    if (followingUserId === userId) return;
    setFollowingUserId(userId);
    try {
      if (isFollowed) {
        await axiosInstance.delete(`/peers/${userId}/unfollow`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_followed: false } : u)),
        );
        toast({ title: `Unfollowed ${name}` });
      } else {
        await axiosInstance.post(`/peers/${userId}/follow`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_followed: true } : u)),
        );
        toast({ title: `Following ${name}` });
      }
    } catch (err) {
      console.error("Follow error:", err);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setFollowingUserId(null);
    }
  };

  // --- Edit/Delete Handlers ---
  const handleEditPost = (post: SearchResultForum) => {
    setSelectedPostId(post.id);
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
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleteModalOpen(false);
      setSelectedPostId(null);
    }
  };

  const handlePostUpdated = async () => {
    if (!selectedPostId) return;
    try {
      const freshForum = await forumService.getForumById(selectedPostId);
      setForums((prev) =>
        prev.map((f) =>
          f.id === freshForum.id
            ? {
                ...f,
                title: freshForum.title,
                fullContent: freshForum.fullContent,
                preview:
                  (freshForum.fullContent || "").substring(0, 150) +
                  ((freshForum.fullContent || "").length > 150 ? "..." : ""),
                field: freshForum.field,
                tags: freshForum.tags || [],
                documentUrl: freshForum.documentUrl,
                aiSummary: freshForum.aiSummary,
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

  // --- Vote & Save handlers (same as feed) ---
  const handleVote = async (forumId: string, voteType: 1 | -1) => {
    try {
      const result = await forumService.voteForum(forumId, voteType);
      setForums((prev) =>
        prev.map((f) =>
          f.id === forumId
            ? {
                ...f,
                userVoteState: voteType,
                upvotes: result.voteCount.upvotes,
                downvotes: result.voteCount.downvotes,
              }
            : f,
        ),
      );
    } catch (err) {
      toast({ title: "Vote failed", variant: "destructive" });
    }
  };

  const handleUnvote = async (forumId: string) => {
    try {
      const result = await forumService.unvoteForum(forumId);
      setForums((prev) =>
        prev.map((f) =>
          f.id === forumId
            ? {
                ...f,
                userVoteState: null,
                upvotes: result.voteCount.upvotes,
                downvotes: result.voteCount.downvotes,
              }
            : f,
        ),
      );
    } catch (err) {
      toast({ title: "Unvote failed", variant: "destructive" });
    }
  };

  const handleSave = async (forumId: string) => {
    try {
      const result = await forumService.toggleSaveForum(forumId);
      setForums((prev) =>
        prev.map((f) =>
          f.id === forumId ? { ...f, isSaved: result.saved } : f,
        ),
      );
      toast({ title: result.saved ? "Saved" : "Unsaved" });
      return result.saved;
    } catch (err) {
      toast({ title: "Save failed", variant: "destructive" });
      return false;
    }
  };

  // --- Fetch search results and augment with vote & save status ---
  useEffect(() => {
    if (!query.trim()) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(
          `/auth/search?q=${encodeURIComponent(query)}`,
        );
        const data = res.data;
        setUsers(data.users || []);
        setSubjects(data.subjects || []);
        setTags(data.tags || []);

        // Transform forums to ensure camelCase fields
        let forumsData = (data.forums || []).map(transformSearchForum);

        // Fetch forums by subject
        const subjectForums: SearchResultForum[] = [];
        if (data.subjects && data.subjects.length > 0) {
          for (const subject of data.subjects) {
            try {
              const subjectForumsRes = await axiosInstance.get(
                `/forums?subjectId=${subject.id}`,
              );
              const transformed = (subjectForumsRes.data.forums || []).map(
                transformForumFromApi,
              );
              subjectForums.push(...transformed);
            } catch (err) {
              console.error(
                `Failed to fetch forums for subject ${subject.id}:`,
                err,
              );
            }
          }
        }

        // Fetch forums by user
        const userForums: SearchResultForum[] = [];
        if (data.users && data.users.length > 0) {
          for (const user of data.users) {
            try {
              const userForumsRes = await axiosInstance.get(
                `/forums/user?userId=${user.id}`,
              );
              const transformed = (userForumsRes.data.forums || []).map(
                transformForumFromApi,
              );
              userForums.push(...transformed);
            } catch (err) {
              console.error(`Failed to fetch forums for user ${user.id}:`, err);
            }
          }
        }

        // Combine all forums and remove duplicates
        const combinedForums = [...forumsData, ...subjectForums, ...userForums];
        const uniqueForumMap = new Map<string, SearchResultForum>();
        combinedForums.forEach((forum) => {
          if (!uniqueForumMap.has(forum.id)) {
            uniqueForumMap.set(forum.id, forum);
          }
        });
        const uniqueForums = Array.from(uniqueForumMap.values());

        // Only fetch full details if AI summary or document URL is missing
        const forumsWithDetails = await Promise.all(
          uniqueForums.map(async (forum) => {
            if (!forum.id) return forum;
            // If we already have both fields and they are not empty/null, skip fetching full details
            if (forum.aiSummary && forum.documentUrl) {
              return forum;
            }
            try {
              const fullForum = await forumService.getForumById(forum.id);
              return {
                ...forum,
                aiSummary: fullForum.aiSummary,
                documentUrl: fullForum.documentUrl,
              };
            } catch (err) {
              console.error(
                `Failed to fetch details for forum ${forum.id}`,
                err,
              );
              return forum;
            }
          }),
        );

        // Now fetch save and vote status (as before)
        const forumsWithStatus = await Promise.all(
          forumsWithDetails.map(async (forum) => {
            if (!forum.id)
              return { ...forum, isSaved: false, userVoteState: null };
            try {
              const [saveRes, voteState] = await Promise.all([
                forumService.getSaveStatus(forum.id),
                forumService.getUserVoteState(forum.id),
              ]);
              return {
                ...forum,
                isSaved: !!saveRes.saved,
                userVoteState: voteState,
              };
            } catch (err) {
              console.error(`Error fetching status for forum ${forum.id}`, err);
              return { ...forum, isSaved: false, userVoteState: null };
            }
          }),
        );

        setForums(forumsWithStatus);
      } catch (err) {
        console.error("Search error:", err);
        toast({ title: "Search failed", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  // --- Horizontal scroll helpers (same as Index) ---
  const peopleScrollRef = useRef<HTMLDivElement>(null);
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

  // --- People Section (same as Index's PeopleSection) ---
  const PeopleSection = () => {
    const visibleUsers = users.slice(0, 10); // show first 10

    if (users.length === 0) return null;

    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 my-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading font-semibold text-foreground">
            People matching "{query}"
          </h3>
          <ScrollButtons scrollRef={peopleScrollRef} />
        </div>

        <div
          ref={peopleScrollRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "thin" }}>
          {visibleUsers.map((user) => {
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
                <Link
                  to={`/${encodeURIComponent(user.name)}`}
                  className="block"
                  onClick={(e) => e.stopPropagation()}>
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
                </Link>
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
                  onClick={() => toggleFollow(user.id, user.name, isFollowed)}
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
          {users.length > 10 && (
            <button
              onClick={() => navigate("/peers")}
              className="shrink-0 w-40 sm:w-44 rounded-xl border border-dashed border-border bg-background p-3 sm:p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-secondary/30 transition-all snap-start">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-secondary flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium">See More</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- Clear search (go back to feed) ---
  const clearSearch = () => {
    // Dispatch custom event to clear navbar search
    window.dispatchEvent(new CustomEvent("clearNavbarSearch"));
    navigate("/feed");
  };

  // --- Early return if no query ---
  if (!query.trim()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 text-center">
        <p className="text-muted-foreground">
          Enter a search term to find content.
        </p>
      </div>
    );
  }

  const hasResults =
    users.length > 0 ||
    forums.length > 0 ||
    subjects.length > 0 ||
    tags.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        {/* <button
          onClick={clearSearch}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </button> */}
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
          Search results for "{query}"
        </h1>
        <button
          onClick={clearSearch}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
          <X className="h-3 w-3" /> Clear
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-32 bg-secondary/50 rounded-xl animate-pulse" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <DiscussionCardSkeleton key={i} index={i} />
            ))}
          </div>
        </div>
      ) : !hasResults ? (
        <div className="text-center py-12 max-w-3xl mx-auto">
          <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No results found for "{query}".
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try different keywords or check spelling.
          </p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* People section (horizontal scroll, same as feed) */}
          <PeopleSection />

          {/* Discussion section – only rendered if there are forums */}
          {forums.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
                  Discussions
                </h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="h-4 w-4" /> New Post
                </button>
              </div>

              {forums.map((forum) => {
                const isAuthor = currentUser.id === forum.user_id;
                return (
                  <div
                    key={forum.id}
                    onClick={() => navigate(`/post/${forum.id}`)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && navigate(`/post/${forum.id}`)
                    }
                    role="link"
                    tabIndex={0}
                    className="block cursor-pointer">
                    <DiscussionCard
                      {...forum}
                      onVote={(voteType) => handleVote(forum.id, voteType)}
                      onUnvote={() => handleUnvote(forum.id)}
                      onSave={() => handleSave(forum.id)}
                      isAuthor={isAuthor}
                      onEdit={isAuthor ? handleEditPost : undefined}
                      onDelete={isAuthor ? handleDeletePost : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Subjects section (if any) */}
          {subjects.length > 0 && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
                Subjects
              </h2>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subj) => (
                  <button
                    key={subj.id}
                    onClick={() => navigate(`/feed?subjectId=${subj.id}`)}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors">
                    {subj.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Tags section (if any) */}
          {tags.length > 0 && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => navigate(`/feed?tagId=${tag.id}`)}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors">
                    #{tag.name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modals */}
      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (data) => {
          const newForum = await forumService.createForum({
            title: data.title,
            content: data.content,
            subject: data.category,
            tagIds: data.tagIds,
            file: data.file,
          });
          navigate(`/post/${newForum.id}`);
        }}
      />

      <CreatePostModal
        key={selectedPostId || "edit"}
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

export default SearchResults;
