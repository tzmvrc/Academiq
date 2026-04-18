import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { UserPlus, Star, Check, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { PeerCardSkeleton } from "@/components/SkeletonLoaders";
import axiosInstance from "@/integration/axiosInstance";

interface User {
  id: string;
  name: string;
  profile_url: string | null;
  school: string | null;
  bio: string | null;
  points: number;
  followers_count: number;
  following_count: number;
  mutual_count?: number; // new
  is_followed?: boolean;
}

const Peers = () => {
  const [followedUsers, setFollowedUsers] = useState<User[]>([]);
  const [allSuggestedUsers, setAllSuggestedUsers] = useState<User[]>([]); // Full dataset for search
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]); // Currently displayed users
  const [isLoadingFollowed, setIsLoadingFollowed] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const [showAllDiscover, setShowAllDiscover] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch followed users (Your Network)
  useEffect(() => {
    const fetchFollowedUsers = async () => {
      try {
        setIsLoadingFollowed(true);
        const followingRes = await axiosInstance.get(
          "/peers/users/me/following",
        );
        const following = followingRes.data.following || [];
        const followedUsersList = following.map((f: any) => ({
          ...f.following,
          is_followed: true,
        }));
        setFollowedUsers(followedUsersList);
      } catch (err) {
        console.error("Error fetching followed users:", err);
        toast({ title: "Failed to load your network", variant: "destructive" });
      } finally {
        setIsLoadingFollowed(false);
      }
    };
    fetchFollowedUsers();
  }, []);

  // Fetch suggested users (People You May Know) with mutual counts
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoadingSuggestions(true);
        // Fetch MORE users (100) so search works across full dataset
        const response = await axiosInstance.get(
          "/forums/suggestions/people?limit=100",
        );
        const users = response.data.users || [];

        // Sort by mutual_count (descending) for consistency
        const sorted = users.sort(
          (a: User, b: User) => (b.mutual_count || 0) - (a.mutual_count || 0),
        );

        // Add is_followed = false for suggestions
        const usersWithFollow = sorted.map((user: any) => ({
          ...user,
          is_followed: false,
        }));

        // Store full dataset
        setAllSuggestedUsers(usersWithFollow);

        // Initially show first 6
        setSuggestedUsers(usersWithFollow.slice(0, 6));
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        toast({ title: "Failed to load suggestions", variant: "destructive" });
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, []);

  const toggleFollow = async (
    userId: string,
    name: string,
    isFollowed: boolean,
  ) => {
    if (loadingUserId === userId) return;
    setLoadingUserId(userId);
    try {
      if (isFollowed) {
        await axiosInstance.delete(`/peers/${userId}/unfollow`);
        // Remove from followed list
        setFollowedUsers((prev) => prev.filter((u) => u.id !== userId));
        // Update in suggested users (mark as not followed)
        setAllSuggestedUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_followed: false } : u)),
        );
        setSuggestedUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_followed: false } : u)),
        );
        toast({ title: `Unfollowed ${name}` });
      } else {
        await axiosInstance.post(`/peers/${userId}/follow`);
        // Move user from suggestions to followed
        const followedUser = allSuggestedUsers.find((u) => u.id === userId);
        if (followedUser) {
          setFollowedUsers((prev) => [
            { ...followedUser, is_followed: true },
            ...prev,
          ]);
          // Update in suggested users
          setAllSuggestedUsers((prev) =>
            prev.map((u) =>
              u.id === userId ? { ...u, is_followed: true } : u,
            ),
          );
          setSuggestedUsers((prev) =>
            prev.map((u) =>
              u.id === userId ? { ...u, is_followed: true } : u,
            ),
          );
        }
        toast({ title: `Following ${name}` });
      }
    } catch (err: any) {
      console.error("Follow/unfollow error:", err);
      toast({
        title: err?.response?.data?.error || "Action failed",
        variant: "destructive",
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  // Search across ALL users, not just visible ones
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) {
      // No search: use displayed users for visibility, but reference all users
      return showAllDiscover
        ? allSuggestedUsers
        : allSuggestedUsers.slice(0, 6);
    }
    // Search across full dataset
    const results = allSuggestedUsers.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    // If searching, show all results that match (or first 6 + View More)
    return showAllDiscover ? results : results.slice(0, 6);
  }, [allSuggestedUsers, searchTerm, showAllDiscover]);

  const hasMoreDiscover = () => {
    if (!searchTerm.trim()) {
      return allSuggestedUsers.length > 6;
    }
    const results = allSuggestedUsers.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    return results.length > 6;
  };

  const visibleFollowed = showAllFollowed
    ? followedUsers
    : followedUsers.slice(0, 6);
  const visibleDiscover = filteredSuggestions;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Don't reset showAllDiscover - let user see all results for their search
  };

  if (isLoadingFollowed && isLoadingSuggestions) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">
          Academic Peers
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
          Connect with researchers and scholars across disciplines.
        </p>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <PeerCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">
        Academic Peers
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
        Connect with researchers and scholars across disciplines.
      </p>

      {/* Your Network */}
      {followedUsers.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              Your Network
            </h2>
            {followedUsers.length > 6 && (
              <button
                onClick={() => setShowAllFollowed(!showAllFollowed)}
                className="text-sm text-primary hover:underline">
                {showAllFollowed ? "Show less" : "View more"}
              </button>
            )}
          </div>
          <div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleFollowed.map((user) => {
              const initials = user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-lg border border-border bg-card p-2 md:p-4 text-center transition-all hover:shadow-md hover:border-primary/10">
                  <Link
                    to={`/${encodeURIComponent(user.name)}`}
                    className="block"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="mx-auto mb-2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {user.profile_url ? (
                        <img
                          src={user.profile_url}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm md:text-base font-semibold text-primary">
                          {initials}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading font-semibold text-foreground text-xs md:text-sm line-clamp-1">
                      {user.name}
                    </h3>
                  </Link>
                  {user.school && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">
                      {user.school}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-accent" />
                    <span className="text-[10px] md:text-xs">
                      {user.points?.toLocaleString() || 0} pts
                    </span>
                  </div>
                  <button
                    onClick={() => toggleFollow(user.id, user.name, true)}
                    disabled={loadingUserId === user.id}
                    className="mt-2 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 md:py-2 text-[10px] md:text-xs font-medium transition-colors disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    {loadingUserId === user.id ? (
                      "Unfollowing..."
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Following
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discover Other Peers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
            People You May Know
          </h2>
          {hasMoreDiscover() && (
            <button
              onClick={() => setShowAllDiscover(!showAllDiscover)}
              className="text-sm text-primary hover:underline">
              {showAllDiscover ? "Show less" : "View more"}
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {isLoadingSuggestions ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <PeerCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleDiscover.map((user) => {
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
                    transition={{ duration: 0.3 }}
                    className="rounded-lg border border-border bg-card p-2 md:p-4 text-center transition-all hover:shadow-md hover:border-primary/10">
                    <Link
                      to={`/${encodeURIComponent(user.name)}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}>
                      <div className="mx-auto mb-2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {user.profile_url ? (
                          <img
                            src={user.profile_url}
                            alt={user.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm md:text-base font-semibold text-primary">
                            {initials}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading font-semibold text-foreground text-xs md:text-sm line-clamp-1">
                        {user.name}
                      </h3>
                    </Link>
                    {user.school && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">
                        {user.school}
                      </p>
                    )}

                    <div className="flex flex-col gap-0.5 mt-1">
                      {(user.mutual_count ?? 0) > 0 ? (
                        <p className="text-[8px] md:text-[10px] text-accent font-medium truncate">
                          {user.mutual_count} mutual
                        </p>
                      ) : (
                        <div className="flex items-center justify-center gap-0.5 text-[8px] md:text-[10px] text-muted-foreground">
                          <Star className="h-2 w-2 text-accent" />
                          <span>
                            {user.followers_count?.toLocaleString() || 0}{" "}
                            followers
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        toggleFollow(user.id, user.name, isFollowed)
                      }
                      disabled={loadingUserId === user.id}
                      className="mt-2 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 md:py-2 text-[10px] md:text-xs font-medium transition-colors disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90">
                      {loadingUserId === user.id ? (
                        "Following..."
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

            {filteredSuggestions.length === 0 && searchTerm && (
              <div className="text-center py-8 text-muted-foreground">
                No peers found matching "{searchTerm}"
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Peers;
