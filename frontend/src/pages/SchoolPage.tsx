import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building,
  Users,
  MessageSquare,
  Search,
  ArrowLeft,
  Trophy,
  Medal,
  Award,
  Sparkles,
} from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import DiscussionCard from "@/components/DiscussionCard";
import { DiscussionCardSkeleton } from "@/components/SkeletonLoaders";
import { forumService } from "@/integration/forum_service";
import { toast } from "@/hooks/use-toast";
import CreatePostModal from "@/components/CreatePostModal";
import Icon from "@/components/ui/Icon.png";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

interface User {
  id: string;
  name: string;
  profile_url: string | null;
  points: number;
  bio: string | null;
  rank?: number;
}

interface Forum {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  users: { name: string; profile_url: string | null; school: string };
  upvotes_count: number;
  downvotes_count: number;
  comments_count: number;
  tags?: { id: string; name: string }[];
  subject?: { id: string; name: string };
  is_ai_verified?: boolean;
  document_url?: string | null;
  ai_summary?: string;
}

interface ExtendedForum {
  id: string;
  title: string;
  content: string;
  author: string;
  authorInitials: string;
  authorProfileUrl?: string | null;
  authorSchool?: string;
  field: string;
  tag: string;
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

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1)
    return <Trophy className="h-5 w-5 text-yellow-500 drop-shadow-lg" />;
  if (rank === 2)
    return <Medal className="h-5 w-5 text-slate-400 drop-shadow-md" />;
  if (rank === 3)
    return <Award className="h-5 w-5 text-amber-700 drop-shadow-md" />;
  return (
    <span className="text-sm font-semibold text-muted-foreground w-6 text-center">
      {rank}
    </span>
  );
};

const getCurrentUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return { id: parsed?.id || parsed?.user_id || null };
    }
    const id =
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("id");
    return { id: id || null };
  } catch {
    return { id: null };
  }
};

const SchoolPage = () => {
  const { schoolName } = useParams<{ schoolName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const decodedSchool = decodeURIComponent(schoolName || "");
  const schoolLogoFromState = (location.state as any)?.logo || null;

  const [activeTab, setActiveTab] = useState<"users" | "forums">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [forums, setForums] = useState<ExtendedForum[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingForums, setIsLoadingForums] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostData, setSelectedPostData] =
    useState<ExtendedForum | null>(null);

  const LIMIT = 20;
  const currentUser = getCurrentUser();
  // Inside SchoolPage component, after state declarations
  const [fetchedLogo, setFetchedLogo] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);

  useEffect(() => {
    if (schoolLogoFromState) {
      setFetchedLogo(schoolLogoFromState);
      return;
    }
    const fetchSchoolLogo = async () => {
      setLoadingLogo(true);
      try {
        const res = await axiosInstance.get(
          `/leaderboard/school-logo/${encodeURIComponent(decodedSchool)}`,
        );
        setFetchedLogo(res.data.logo);
      } catch (err) {
        console.error("Failed to fetch school logo:", err);
        setFetchedLogo(null);
      } finally {
        setLoadingLogo(false);
      }
    };
    fetchSchoolLogo();
  }, [decodedSchool, schoolLogoFromState]);

  const fetchUsers = async (reset = true) => {
    if (reset) {
      setOffset(0);
      setHasMoreUsers(true);
      setIsLoadingUsers(true);
    } else {
      if (!hasMoreUsers || loadingMore) return;
      setLoadingMore(true);
    }
    const currentOffset = reset ? 0 : offset;
    try {
      const res = await axiosInstance.get(
        `/leaderboard/${encodeURIComponent(decodedSchool)}/users`,
        {
          params: { limit: LIMIT, offset: currentOffset },
        },
      );
      const newUsers: User[] = res.data.users;
      const usersWithRank = newUsers.map((user, idx) => ({
        ...user,
        rank: currentOffset + idx + 1,
      }));
      if (reset) {
        setUsers(usersWithRank);
      } else {
        setUsers((prev) => [...prev, ...usersWithRank]);
      }
      setHasMoreUsers(newUsers.length === LIMIT);
      setOffset((prev) => prev + LIMIT);
    } catch (err) {
      console.error("Failed to fetch school users", err);
    } finally {
      setIsLoadingUsers(false);
      setLoadingMore(false);
    }
  };

  const transformForum = async (forum: Forum): Promise<ExtendedForum> => {
    const author = forum.users?.name || "Unknown";
    const authorInitials = getInitials(author);
    const preview =
      (forum.content || "").substring(0, 150) +
      ((forum.content || "").length > 150 ? "..." : "");
    const baseForum = {
      id: forum.id,
      title: forum.title,
      content: forum.content,
      author,
      authorInitials,
      authorProfileUrl: forum.users?.profile_url,
      authorSchool: forum.users?.school,
      field: forum.subject?.name || "General",
      tag: forum.subject?.name || "General",
      tags: forum.tags || [],
      upvotes: forum.upvotes_count || 0,
      downvotes: forum.downvotes_count || 0,
      comments: forum.comments_count || 0,
      userVoteState: null,
      isSaved: false,
      isVerified: true,
      isAiVerified: forum.is_ai_verified || false,
      preview,
      fullContent: forum.content || "",
      created_at: forum.created_at,
      user_id: forum.user_id,
      aiSummary: forum.ai_summary || "",
      documentUrl: forum.document_url || null,
    };
    if ((!baseForum.aiSummary || !baseForum.documentUrl) && forum.id) {
      try {
        const fullForum = await forumService.getForumById(forum.id);
        baseForum.aiSummary = fullForum.aiSummary || baseForum.aiSummary;
        baseForum.documentUrl = fullForum.documentUrl || baseForum.documentUrl;
      } catch (err) {
        console.error(
          `Failed to fetch full details for forum ${forum.id}`,
          err,
        );
      }
    }
    try {
      const [saveRes, voteState] = await Promise.all([
        forumService.getSaveStatus(forum.id),
        forumService.getUserVoteState(forum.id),
      ]);
      return {
        ...baseForum,
        isSaved: !!saveRes.saved,
        userVoteState: voteState,
      };
    } catch (err) {
      console.error(`Error fetching status for forum ${forum.id}`, err);
      return baseForum;
    }
  };

  const fetchForums = async () => {
    setIsLoadingForums(true);
    try {
      const res = await axiosInstance.get(
        `/leaderboard/${encodeURIComponent(decodedSchool)}/forums`,
        {
          params: { limit: 50 },
        },
      );
      const rawForums = res.data.forums || [];
      const transformed = await Promise.all(rawForums.map(transformForum));
      setForums(transformed);
    } catch (err) {
      console.error("Failed to fetch school forums", err);
      toast({ title: "Failed to load forums", variant: "destructive" });
    } finally {
      setIsLoadingForums(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers(true);
    } else {
      fetchForums();
    }
  }, [activeTab, decodedSchool]);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleUserClick = (userName: string) =>
    navigate(`/${encodeURIComponent(userName)}`);
  const handleForumClick = (forumId: string) => navigate(`/post/${forumId}`);

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

  const handleEditPost = (post: ExtendedForum) => {
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
      toast({ title: "Post updated!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setEditModalOpen(false);
      setSelectedPostId(null);
      setSelectedPostData(null);
    }
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

  const getUserRowClasses = (rank: number) => {
    if (rank === 1)
      return "border-2 border-yellow-500/80 bg-gradient-to-r from-yellow-500/5 via-amber-400/5 to-yellow-500/5 shadow-lg shadow-yellow-500/20";
    if (rank === 2)
      return "border-2 border-slate-400/70 bg-gradient-to-r from-slate-400/5 via-gray-300/5 to-slate-400/5 shadow-md shadow-slate-400/20";
    if (rank === 3)
      return "border-2 border-amber-700/70 bg-gradient-to-r from-amber-700/5 via-orange-600/5 to-amber-700/5 shadow-md shadow-amber-700/20";
    return "border-border bg-card";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex items-center gap-3 mb-6 mt-5">
        {!loadingLogo && (fetchedLogo || schoolLogoFromState) ? (
          <img
            src={fetchedLogo || schoolLogoFromState}
            alt={decodedSchool}
            className="h-15 w-auto max-w-15 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = Icon;
            }}
          />
        ) : (
          <Building className="h-8 w-8 text-primary" />
        )}
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
          {decodedSchool}
        </h1>
      </div>

      <div className="flex gap-4 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}>
          <Users className="h-4 w-4" /> Users
        </button>
        <button
          onClick={() => setActiveTab("forums")}
          className={`pb-2 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${
            activeTab === "forums"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}>
          <MessageSquare className="h-4 w-4" /> Forums
        </button>
      </div>

      {activeTab === "users" && (
        <>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            {isLoadingUsers && users.length === 0
              ? [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl bg-secondary animate-pulse"
                  />
                ))
              : filteredUsers.map((user) => {
                  const rank = user.rank || 999;
                  const isTopThree = rank <= 3;
                  const userName = user.name;
                  const userInitials = getInitials(userName);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 }}
                      onClick={() => handleUserClick(user.name)}
                      className={`relative overflow-hidden rounded-xl ${getUserRowClasses(rank)} p-3 sm:p-4 transition-all hover:scale-[1.01] cursor-pointer`}>
                      {rank === 1 && (
                        <>
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
                          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
                          <Sparkles className="absolute top-2 right-2 h-4 w-4 text-yellow-500 animate-pulse" />
                        </>
                      )}
                      <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                        <div className="flex items-center justify-center w-8 sm:w-10 shrink-0">
                          <RankIcon rank={rank} />
                        </div>
                        <div
                          className={`h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ${isTopThree ? "ring-2 ring-primary/20 scale-105" : ""}`}
                          style={
                            isTopThree
                              ? {
                                  boxShadow:
                                    rank === 1
                                      ? "0 0 0 3px rgba(250,204,21,0.4)"
                                      : rank === 2
                                        ? "0 0 0 3px rgba(156,163,175,0.4)"
                                        : "0 0 0 3px rgba(249,115,22,0.4)",
                                }
                              : {}
                          }>
                          {user.profile_url ? (
                            <img
                              src={user.profile_url}
                              alt={userName}
                              className="rounded-full w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm font-semibold text-primary">
                              {userInitials}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-semibold text-foreground text-sm truncate">
                            {userName}
                          </p>
                          {user.bio && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.bio}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-foreground text-sm">
                            {user.points.toLocaleString()}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Points
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            {hasMoreUsers && !isLoadingUsers && filteredUsers.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => fetchUsers(false)}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm">
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
            {filteredUsers.length === 0 && !isLoadingUsers && (
              <div className="text-center py-12 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "forums" && (
        <>
          {isLoadingForums ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <DiscussionCardSkeleton key={i} index={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {forums.map((forum, idx) => {
                const isAuthor = currentUser.id === forum.user_id;
                return (
                  <div
                    key={forum.id}
                    onClick={() => handleForumClick(forum.id)}
                    className="cursor-pointer">
                    <DiscussionCard
                      {...(forum as any)}
                      index={idx}
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
              {forums.length === 0 && !isLoadingForums && (
                <div className="text-center py-12 text-muted-foreground">
                  No forum posts from this school yet
                </div>
              )}
            </div>
          )}
        </>
      )}

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
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
    </div>
  );
};

export default SchoolPage;
