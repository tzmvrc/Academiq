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
  is_followed?: boolean;
}

const Peers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const [showAllDiscover, setShowAllDiscover] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const usersRes = await axiosInstance.get("/peers/users");
        const allUsers = usersRes.data.users || [];

        const followingRes = await axiosInstance.get(
          "/peers/users/me/following",
        );
        const following = followingRes.data.following || [];
        const followingIdsSet: Set<string> = new Set(
          following.map((f: any) => f.following.id),
        );

        const usersWithFollow = allUsers.map((user: User) => ({
          ...user,
          is_followed: followingIdsSet.has(user.id),
        }));

        setUsers(usersWithFollow);
        setFollowingIds(followingIdsSet);
      } catch (err) {
        console.error("Error fetching peers data:", err);
        toast({ title: "Failed to load peers", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, is_followed: false } : user,
          ),
        );
        setFollowingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast({ title: `Unfollowed ${name}` });
      } else {
        await axiosInstance.post(`/peers/${userId}/follow`);
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, is_followed: true } : user,
          ),
        );
        setFollowingIds((prev) => new Set(prev).add(userId));
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

  const followedUsers = useMemo(
    () => users.filter((u) => u.is_followed),
    [users],
  );
  const discoverUsers = useMemo(
    () => users.filter((u) => !u.is_followed),
    [users],
  );

  const filteredDiscover = useMemo(() => {
    if (!searchTerm.trim()) return discoverUsers;
    return discoverUsers.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [discoverUsers, searchTerm]);

  const visibleFollowed = showAllFollowed
    ? followedUsers
    : followedUsers.slice(0, 6);
  const visibleDiscover = showAllDiscover
    ? filteredDiscover
    : filteredDiscover.slice(0, 6);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowAllDiscover(false);
  };

  if (isLoading) {
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
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 text-center transition-all hover:shadow-md hover:border-primary/10">
                  <Link
                    to={`/${encodeURIComponent(user.name)}`}
                    className="block"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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
                    onClick={() => toggleFollow(user.id, user.name, true)}
                    disabled={loadingUserId === user.id}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80">
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
            Discover Other Peers
          </h2>
          {filteredDiscover.length > 6 && !searchTerm && (
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

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleDiscover.map((user) => {
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
                className="rounded-xl border border-border bg-card p-4 sm:p-5 text-center transition-all hover:shadow-md hover:border-primary/10">
                <Link
                  to={`/${encodeURIComponent(user.name)}`}
                  className="block"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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
                  onClick={() => toggleFollow(user.id, user.name, false)}
                  disabled={loadingUserId === user.id}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90">
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

        {filteredDiscover.length === 0 && searchTerm && (
          <div className="text-center py-8 text-muted-foreground">
            No peers found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
};

export default Peers;
