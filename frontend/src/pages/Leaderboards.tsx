import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Building,
  Users,
} from "lucide-react";
import { LeaderboardRowSkeleton } from "@/components/SkeletonLoaders";
import axiosInstance from "@/integration/axiosInstance";
import Icon from "@/components/ui/Icon.png";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  school: string | null;
  points: number;
  profile_url: string | null;
}

interface MyInfo {
  rank: number;
  points: number;
  name: string;
  profile_url: string | null;
  school: string | null;
  schoolLogo?: string | null;
}

interface TopSchool {
  rank: number;
  school: string;
  totalPoints: number;
  logo?: string | null;
  users: Array<{
    id: string;
    name: string;
    profile_url: string | null;
    points: number;
  }>;
}

type Category = "global" | "school" | "schools" | "country";

const categories: { key: Category; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "school", label: "Your School" },
  { key: "schools", label: "Top Schools" },
  // { key: "country", label: "By Country" },
];

const countryLeaders = [
  {
    rank: 1,
    name: "United States",
    field: "1,245 contributors",
    score: 156800,
  },
  { rank: 2, name: "United Kingdom", field: "432 contributors", score: 67500 },
  { rank: 3, name: "Germany", field: "389 contributors", score: 54200 },
  { rank: 4, name: "Japan", field: "312 contributors", score: 48100 },
  { rank: 5, name: "Switzerland", field: "198 contributors", score: 42300 },
];

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1)
    return <Trophy className="h-6 w-6 text-yellow-500 drop-shadow-lg" />;
  if (rank === 2)
    return <Medal className="h-6 w-6 text-slate-400 drop-shadow-md" />;
  if (rank === 3)
    return <Award className="h-6 w-6 text-amber-700 drop-shadow-md" />;
  return (
    <span className="text-sm font-semibold text-muted-foreground w-6 text-center">
      {rank}
    </span>
  );
};

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const Leaderboards = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("global");
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    [],
  );
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [myInfo, setMyInfo] = useState<MyInfo | null>(null);
  const [topSchools, setTopSchools] = useState<TopSchool[]>([]);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [isLoadingTopSchools, setIsLoadingTopSchools] = useState(false);

  const LIMIT = 10;
  const fetchLeaderboardRef =
    useRef<(reset: boolean, school?: string | null) => Promise<void>>();
  const prevCategoryRef = useRef<Category>("global");
  const hasFetchedMyInfoRef = useRef(false);

  const fetchLeaderboard = useCallback(
    async (reset: boolean = false, school?: string | null) => {
      const currentOffset = reset ? 0 : offset;
      if (!reset && (!hasMore || isLoadingMore)) return;

      setIsLoadingMore(!reset);
      if (reset) setIsLoading(true);

      try {
        const params: any = { limit: LIMIT, offset: currentOffset };
        if (school) params.school = school;

        const res = await axiosInstance.get("/leaderboard", { params });
        const newEntries: LeaderboardEntry[] = res.data.users;
        const hasMoreData = newEntries.length === LIMIT;

        if (reset) {
          setLeaderboardData(newEntries);
          setOffset(LIMIT);
          setHasMore(hasMoreData);
        } else {
          setLeaderboardData((prev) => [...prev, ...newEntries]);
          setOffset((prev) => prev + LIMIT);
          setHasMore(hasMoreData);
        }
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [offset, hasMore, isLoadingMore],
  );

  useEffect(() => {
    fetchLeaderboardRef.current = fetchLeaderboard;
  }, [fetchLeaderboard]);

  const fetchMyInfo = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/leaderboard/me");
      setMyInfo(res.data);
    } catch (err) {
      console.error("Failed to fetch my leaderboard info", err);
    }
  }, []);

  const fetchTopSchools = async () => {
    setIsLoadingTopSchools(true);
    try {
      const res = await axiosInstance.get("/leaderboard/top");
      setTopSchools(res.data.schools);
    } catch (err) {
      console.error("Failed to fetch top schools", err);
    } finally {
      setIsLoadingTopSchools(false);
    }
  };

  useEffect(() => {
    const categoryChanged = prevCategoryRef.current !== activeCategory;
    prevCategoryRef.current = activeCategory;

    if (activeCategory === "global") {
      if (categoryChanged || !hasFetchedMyInfoRef.current) {
        fetchLeaderboardRef.current?.(true);
      }
      if (!hasFetchedMyInfoRef.current) {
        fetchMyInfo();
        hasFetchedMyInfoRef.current = true;
      }
    } else if (activeCategory === "school") {
      if (myInfo?.school) {
        fetchLeaderboardRef.current?.(true, myInfo.school);
      } else if (!hasFetchedMyInfoRef.current) {
        fetchMyInfo().then(() => {
          if (myInfo?.school) {
            fetchLeaderboardRef.current?.(true, myInfo.school);
          } else {
            setLeaderboardData([]);
            setHasMore(false);
            setIsLoading(false);
          }
        });
      } else {
        setLeaderboardData([]);
        setHasMore(false);
        setIsLoading(false);
      }
    } else if (activeCategory === "schools") {
      if (topSchools.length === 0 && !isLoadingTopSchools) {
        fetchTopSchools();
      }
      setLeaderboardData([]);
      setHasMore(false);
      setIsLoading(false);
    } else {
      setLeaderboardData([]);
      setHasMore(false);
      setIsLoading(false);
    }
  }, [activeCategory, myInfo?.school, fetchMyInfo]);

  const handleViewMore = () => {
    if (!isLoadingMore && hasMore) {
      if (activeCategory === "school" && myInfo?.school) {
        fetchLeaderboard(false, myInfo.school);
      } else if (activeCategory === "global") {
        fetchLeaderboard(false);
      }
    }
  };

  const handleUserClick = (userName: string) => {
    navigate(`/${encodeURIComponent(userName)}`);
  };

  const handleSchoolClick = (schoolName: string, logo?: string | null) => {
    navigate(`/school/${encodeURIComponent(schoolName)}`, { state: { logo } });
  };

  const toggleExpand = (schoolName: string) => {
    setExpandedSchool(expandedSchool === schoolName ? null : schoolName);
  };

  const displayData = (() => {
    if (activeCategory === "global") return leaderboardData;
    if (activeCategory === "school") return leaderboardData;
    if (activeCategory === "schools") return topSchools;
    return countryLeaders;
  })();

  const isDynamic = activeCategory === "global" || activeCategory === "school";
  const showViewMore = isDynamic && !isLoading && hasMore;
  const showSkeletons = isLoading && isDynamic;

  const pointsToTop10 = (() => {
    if (activeCategory !== "global" || !myInfo || myInfo.rank <= 10)
      return null;
    const tenthPlace = leaderboardData[9];
    if (tenthPlace && tenthPlace.points > myInfo.points) {
      return tenthPlace.points - myInfo.points;
    }
    return null;
  })();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-accent" />
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
          Leaderboards
        </h1>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
        Top contributors ranked by academic reputation and verified
        contributions.
      </p>

      <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Your School Banner with Logo */}
      {activeCategory === "school" && myInfo?.school && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-3">
            {myInfo.schoolLogo ? (
              <img
                src={myInfo.schoolLogo}
                alt={myInfo.school}
                className="h-11 w-auto max-w-11 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = Icon;
                }}
              />
            ) : (
              <Building className="h-8 w-8 text-primary" />
            )}
            <div>
              <h2 className="font-heading font-bold text-lg text-foreground">
                {myInfo.school}
              </h2>
              <p className="text-sm text-muted-foreground">
                Your school's leaderboard
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 sm:space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {showSkeletons
          ? [...Array(10)].map((_, i) => (
              <LeaderboardRowSkeleton key={i} index={i} />
            ))
          : displayData.map((item: any, idx: number) => {
              if (activeCategory === "schools") {
                const school = item as TopSchool;
                const isExpanded = expandedSchool === school.school;
                const rank = school.rank;
                const isTopThree = rank <= 3;

                let rankBorderClass = "border-border";
                let rankBgClass = "bg-card";
                let rankShadow = "";
                let rankBadgeColor = "";

                if (isTopThree) {
                  if (rank === 1) {
                    rankBorderClass = "border-2 border-yellow-500/80";
                    rankBgClass =
                      "bg-gradient-to-r from-yellow-500/5 via-amber-400/5 to-yellow-500/5";
                    rankShadow = "shadow-lg shadow-yellow-500/20";
                    rankBadgeColor = "from-yellow-400 to-amber-500";
                  } else if (rank === 2) {
                    rankBorderClass = "border-2 border-slate-400/70";
                    rankBgClass =
                      "bg-gradient-to-r from-slate-400/5 via-gray-300/5 to-slate-400/5";
                    rankShadow = "shadow-md shadow-slate-400/20";
                    rankBadgeColor = "from-gray-400 to-slate-500";
                  } else {
                    rankBorderClass = "border-2 border-amber-700/70";
                    rankBgClass =
                      "bg-gradient-to-r from-amber-700/5 via-orange-600/5 to-amber-700/5";
                    rankShadow = "shadow-md shadow-amber-700/20";
                    rankBadgeColor = "from-orange-500 to-amber-700";
                  }
                }

                return (
                  <motion.div
                    key={school.school}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative overflow-hidden rounded-xl ${rankBorderClass} ${rankBgClass} ${rankShadow}`}>
                    {isTopThree && (
                      <div
                        className="absolute -top-3 -left-3 w-16 h-16 pointer-events-none opacity-70"
                        style={{
                          transform: "rotate(-15deg)",
                          background: `linear-gradient(135deg, ${rankBadgeColor.replace("from-", "")} 0%, ${rankBadgeColor.split(" ")[1]} 100%)`,
                          borderRadius: "50%",
                          filter: "blur(3px)",
                        }}
                      />
                    )}
                    <div
                      onClick={() =>
                        handleSchoolClick(school.school, school.logo)
                      }
                      className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-center">
                            <RankIcon rank={rank} />
                          </div>
                          {school.logo ? (
                            <img
                              src={school.logo}
                              alt={school.school}
                              className="h-10 w-auto max-w-10 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = Icon;
                              }}
                            />
                          ) : (
                            <Building className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <h3 className="font-heading font-semibold text-foreground">
                              {school.school}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Users className="h-3 w-3" />
                              <span>
                                {school.users.length} top contributors
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {school.totalPoints.toLocaleString()} pts
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(school.school);
                            }}
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1">
                            {isExpanded ? "Show less" : "Top contributors"}{" "}
                            <ChevronRight
                              className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border">
                          <div className="p-3 space-y-2">
                            {school.users.map((user, i) => (
                              <div
                                key={user.id}
                                onClick={() => handleUserClick(user.name)}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-medium w-5 text-muted-foreground">
                                    {i + 1}
                                  </span>
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                    {user.profile_url ? (
                                      <img
                                        src={user.profile_url}
                                        alt={user.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs font-semibold text-primary">
                                        {getInitials(user.name)}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-foreground">
                                    {user.name}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-primary">
                                  {user.points.toLocaleString()} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              } else {
                // Global, school, or country rows (unchanged)
                const leader = item;
                const rank = leader.rank;
                const isTopThree = rank <= 3;
                const userName = leader.name || "Anonymous";
                const userInitials = getInitials(userName);
                const pointsValue = isDynamic ? leader.points : leader.score;

                let rankBorderClass = "border-border";
                let rankBgClass = "bg-card";
                let rankShadow = "";
                let rankBadgeColor = "";

                if (isTopThree) {
                  if (rank === 1) {
                    rankBorderClass = "border-2 border-yellow-500/80";
                    rankBgClass =
                      "bg-gradient-to-r from-yellow-500/5 via-amber-400/5 to-yellow-500/5";
                    rankShadow = "shadow-lg shadow-yellow-500/20";
                    rankBadgeColor = "from-yellow-400 to-amber-500";
                  } else if (rank === 2) {
                    rankBorderClass = "border-2 border-slate-400/70";
                    rankBgClass =
                      "bg-gradient-to-r from-slate-400/5 via-gray-300/5 to-slate-400/5";
                    rankShadow = "shadow-md shadow-slate-400/20";
                    rankBadgeColor = "from-gray-400 to-slate-500";
                  } else {
                    rankBorderClass = "border-2 border-amber-700/70";
                    rankBgClass =
                      "bg-gradient-to-r from-amber-700/5 via-orange-600/5 to-amber-700/5";
                    rankShadow = "shadow-md shadow-amber-700/20";
                    rankBadgeColor = "from-orange-500 to-amber-700";
                  }
                }

                return (
                  <motion.div
                    key={isDynamic ? leader.id : `${activeCategory}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                    onClick={() => {
                      if (isDynamic && userName !== "Anonymous") {
                        handleUserClick(userName);
                      }
                    }}
                    className={`relative overflow-hidden rounded-xl ${rankBorderClass} ${rankBgClass} ${rankShadow} p-3 sm:p-4 transition-all hover:scale-[1.01] ${
                      isDynamic ? "cursor-pointer" : ""
                    }`}>
                    {rank === 1 && (
                      <>
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
                        <Sparkles className="absolute top-2 right-2 h-4 w-4 text-yellow-500 animate-pulse" />
                      </>
                    )}
                    {isTopThree && (
                      <div
                        className="absolute -top-3 -left-3 w-16 h-16 pointer-events-none opacity-70"
                        style={{
                          transform: "rotate(-15deg)",
                          background: `linear-gradient(135deg, ${rankBadgeColor.replace("from-", "")} 0%, ${rankBadgeColor.split(" ")[1]} 100%)`,
                          borderRadius: "50%",
                          filter: "blur(3px)",
                        }}
                      />
                    )}
                    <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                      <div className="flex items-center justify-center w-8 sm:w-10 shrink-0">
                        <RankIcon rank={rank} />
                      </div>
                      <div
                        className={`h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ${
                          isTopThree ? "ring-2 ring-primary/20 scale-105" : ""
                        }`}
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
                        {leader.profile_url ? (
                          <img
                            src={leader.profile_url}
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
                        <p className="text-xs text-muted-foreground truncate">
                          {isDynamic
                            ? leader.school || "Independent"
                            : leader.field}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-foreground text-sm">
                          {(pointsValue ?? 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Points
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              }
            })}

        {showViewMore && (
          <div className="flex justify-center pt-4 pb-2">
            <button
              onClick={handleViewMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium disabled:opacity-50">
              {isLoadingMore ? "Loading..." : "View more"}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {activeCategory === "global" && myInfo && (
        <div className="mt-8 p-4 sm:p-6 rounded-xl border border-border bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-3xl sm:text-4xl font-bold text-foreground">
                #{myInfo.rank}
              </div>
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20 overflow-hidden">
                {myInfo.profile_url ? (
                  <img
                    src={myInfo.profile_url}
                    alt={myInfo.name}
                    className="rounded-full w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm sm:text-base font-semibold text-primary">
                    {getInitials(myInfo.name)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-heading font-bold text-foreground text-base sm:text-lg">
                  {myInfo.name}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {myInfo.school || "Independent"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 sm:gap-12">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide mb-1">
                  Your Points
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">
                  {myInfo.points.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                {myInfo.rank > 10 && pointsToTop10 !== null ? (
                  <>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                      Points to top 10
                    </p>
                    <p className="text-lg sm:text-xl font-semibold text-accent">
                      +{pointsToTop10.toLocaleString()}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                      Status
                    </p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                      ✨ Top 10!
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboards;
