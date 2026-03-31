import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search as SearchIcon,
  UserPlus,
  Check,
  Star,
} from "lucide-react";
import DiscussionCard from "@/components/DiscussionCard";
import { DiscussionCardSkeleton } from "@/components/SkeletonLoaders";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";
import { forumService } from "@/integration/forum_service";

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
}

interface SearchResultSubject {
  id: string;
  name: string;
}

interface SearchResultTag {
  id: string;
  name: string;
}

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

  // For follow/unfollow (similar to Peers)
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
        setForums(data.forums || []);
        setSubjects(data.subjects || []);
        setTags(data.tags || []);
      } catch (err) {
        console.error("Search error:", err);
        toast({ title: "Search failed", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/feed")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
          Search results for "{query}"
        </h1>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="h-32 bg-secondary/50 rounded-xl animate-pulse" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <DiscussionCardSkeleton key={i} index={i} />
            ))}
          </div>
        </div>
      ) : !hasResults ? (
        <div className="text-center py-12">
          <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No results found for "{query}".
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try different keywords or check spelling.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Users section - priority */}
          {users.length > 0 && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" /> People
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {users.map((user) => {
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
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-md hover:border-primary/10">
                      <Link
                        to={`/${encodeURIComponent(user.name)}`}
                        className="block"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {user.profile_url ? (
                            <img
                              src={user.profile_url}
                              alt={user.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-base sm:text-lg font-semibold text-primary">
                              {initials}
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading font-semibold text-foreground text-sm">
                          {user.name}
                        </h3>
                      </Link>
                      {user.school && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {user.school}
                        </p>
                      )}
                      {user.bio && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {user.bio}
                        </p>
                      )}
                      <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-accent" />
                        <span>{user.points.toLocaleString()} points</span>
                      </div>
                      <button
                        onClick={() =>
                          toggleFollow(user.id, user.name, isFollowed)
                        }
                        disabled={followingUserId === user.id}
                        className={`mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                          isFollowed
                            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}>
                        {followingUserId === user.id ? (
                          "Following..."
                        ) : isFollowed ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" /> Follow
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Forums section */}
          {forums.length > 0 && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
                Discussions
              </h2>
              <div className="space-y-4">
                {forums.map((forum) => (
                  <DiscussionCard
                    key={forum.id}
                    {...forum}
                    onVote={async (voteType) => {
                      try {
                        const result = await forumService.voteForum(
                          forum.id,
                          voteType,
                        );
                        setForums((prev) =>
                          prev.map((f) =>
                            f.id === forum.id
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
                    }}
                    onUnvote={async () => {
                      try {
                        const result = await forumService.unvoteForum(forum.id);
                        setForums((prev) =>
                          prev.map((f) =>
                            f.id === forum.id
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
                        toast({
                          title: "Unvote failed",
                          variant: "destructive",
                        });
                      }
                    }}
                    onSave={async () => {
                      try {
                        const result = await forumService.toggleSaveForum(
                          forum.id,
                        );
                        setForums((prev) =>
                          prev.map((f) =>
                            f.id === forum.id
                              ? { ...f, isSaved: result.saved }
                              : f,
                          ),
                        );
                        toast({ title: result.saved ? "Saved" : "Unsaved" });
                        return result.saved;
                      } catch (err) {
                        toast({ title: "Save failed", variant: "destructive" });
                        return false;
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Subjects section */}
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

          {/* Tags section */}
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
    </div>
  );
};

export default SearchResults;
