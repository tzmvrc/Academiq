import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Unlock, Lock, X, Info, AlertCircle } from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_target: number;
  points?: number;
  user_achievements?: {
    unlocked_at: string | null;
    is_featured?: boolean;
    progress_current?: number;
  } | null;
}

const AchievementsPanel = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setCurrentUserId(user.id);
      }
    } catch (err) {
      console.error("Failed to get current user:", err);
    }
  }, []);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        // Fetch all achievements for the browse modal and reference
        const allRes = await axiosInstance.get("/achievements");
        const allAchievements = allRes.data.achievements;

        // If user is logged in, fetch their specific achievements with progress
        if (currentUserId) {
          const userRes = await axiosInstance.get(
            `/achievements/user/${currentUserId}`,
          );
          const userAchievements = userRes.data.achievements;

          // Merge user achievements with full achievement data
          const merged = allAchievements.map((ach: Achievement) => {
            const userAch = userAchievements.find(
              (ua: any) => ua.achievement_id === ach.id,
            );
            return {
              ...ach,
              user_achievements: userAch || null,
            };
          });

          setAchievements(merged);
        } else {
          setAchievements(allAchievements);
        }
      } catch (err) {
        console.error("Failed to load achievements", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchAchievements();
    } else {
      setLoading(false);
    }
  }, [currentUserId]);

  if (loading)
    return <div className="animate-pulse p-4">Loading achievements…</div>;

  const completed = achievements.filter(
    (a) => a.user_achievements?.unlocked_at,
  );
  const notStarted = achievements.filter(
    (a) => !a.user_achievements?.unlocked_at,
  );

  // Preview: show completed achievements first (user's done achievements), then upcoming
  const previewAchievements = [...completed, ...notStarted].slice(0, 3);

  const getProgressText = (ach: Achievement) => {
    let criteriaText = "";
    switch (ach.criteria_type) {
      case "total_posts":
        criteriaText = "posts created";
        break;
      case "total_comments_made":
        criteriaText = "comments written";
        break;
      case "total_upvotes_received":
        criteriaText = "upvotes received";
        break;
      case "upvotes_given":
        criteriaText = "upvotes given";
        break;
      case "total_documents":
        criteriaText = "documents uploaded";
        break;
      case "school_rank":
        criteriaText = "top rank in school";
        break;
      case "verified_answers_given":
        criteriaText = "verified answers";
        break;
      default:
        criteriaText = ach.criteria_type.replace(/_/g, " ");
    }
    return criteriaText;
  };

  // Tile component for browse modal
  const AchievementTile = ({
    ach,
    onClick,
  }: {
    ach: Achievement;
    onClick: () => void;
  }) => {
    const unlocked = !!ach.user_achievements?.unlocked_at;
    const progressCurrent = ach.user_achievements?.progress_current ?? 0;
    const progressTarget = ach.criteria_target || 1;
    const progressPercent = unlocked
      ? 100
      : Math.round((progressCurrent / progressTarget) * 100);

    return (
      <div
        onClick={onClick}
        className="cursor-pointer rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all hover:border-primary/30">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{ach.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {ach.name}
              </p>
              {unlocked ? (
                <Unlock className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {ach.description}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              {unlocked ? (
                <span>Unlocked</span>
              ) : (
                <span>
                  {progressCurrent}/{progressTarget} {getProgressText(ach)}
                </span>
              )}
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Sidebar preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-border bg-card p-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Achievements
            </h3>
            <div className="group relative">
              <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="rounded-lg bg-foreground text-background px-3 py-2 text-xs font-medium whitespace-nowrap shadow-lg">
                  Featured achievements coming soon
                </div>
                <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground" />
              </div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {completed.length}/{achievements.length}
          </span>
        </div>

        <div className="space-y-3">
          {completed.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                <Unlock className="h-3 w-3" /> Achievements Earned (
                {completed.length})
              </p>
              {previewAchievements.map((ach) => {
                const unlocked = !!ach.user_achievements?.unlocked_at;
                if (!unlocked) return null;
                return (
                  <div
                    key={ach.id}
                    onClick={() => setShowBrowseModal(true)}
                    className="cursor-pointer rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-3 mb-2 hover:shadow-sm hover:border-green-400 transition-all">
                    <div className="flex items-start gap-2">
                      <div className="text-2xl">{ach.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {ach.name}
                          </p>
                          <Unlock className="h-3 w-3 text-green-500 shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {ach.description}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Earned on{" "}
                          {new Date(
                            ach.user_achievements?.unlocked_at || "",
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {notStarted.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Achievements to Unlock (
                {notStarted.length})
              </p>
              {previewAchievements.map((ach) => {
                const unlocked = !!ach.user_achievements?.unlocked_at;
                if (unlocked) return null;

                // Use backend progress data if available
                const progressCurrent =
                  ach.user_achievements?.progress_current ?? 0;
                const progressTarget = ach.criteria_target || 1;
                const progressPercent = Math.round(
                  (progressCurrent / progressTarget) * 100,
                );
                const remaining = Math.max(0, progressTarget - progressCurrent);

                return (
                  <div
                    key={ach.id}
                    onClick={() => setShowBrowseModal(true)}
                    className="cursor-pointer rounded-lg border border-border mb-2 bg-background p-3 hover:shadow-sm hover:border-primary/20 transition-all">
                    <div className="flex items-start gap-2">
                      <div className="text-2xl">{ach.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {ach.name}
                          </p>
                          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {ach.description}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {progressCurrent}/{progressTarget}{" "}
                            {getProgressText(ach)}
                          </span>
                          <span className="font-semibold text-primary">
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{
                              width: `${Math.min(progressPercent, 100)}%`,
                            }}
                          />
                        </div>
                        {remaining > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Need {remaining} more {getProgressText(ach)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Browse Modal – all achievements in grid (portal) */}
      {showBrowseModal &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setShowBrowseModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-card rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl border border-border"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border p-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    All Achievements
                  </h2>
                  <button
                    onClick={() => setShowBrowseModal(false)}
                    className="p-1 rounded-full hover:bg-secondary transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 max-h-[calc(85vh-70px)]">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-3 mb-4">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Real-time achievement tracking is in development. Progress
                      will sync automatically as you contribute!
                    </p>
                  </div>
                  <div className="space-y-6">
                    {notStarted.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          Not Started ({notStarted.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {notStarted.map((ach) => (
                            <AchievementTile
                              key={ach.id}
                              ach={ach}
                              onClick={() => {
                                setShowBrowseModal(false);
                                setSelectedAchievement(ach);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {completed.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Unlock className="h-4 w-4 text-green-500" />
                          Completed ({completed.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {completed.map((ach) => (
                            <AchievementTile
                              key={ach.id}
                              ach={ach}
                              onClick={() => {
                                setShowBrowseModal(false);
                                setSelectedAchievement(ach);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      {/* Detail Modal (portal) */}
      {selectedAchievement &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setSelectedAchievement(null)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-card rounded-xl max-w-md w-full p-6 shadow-xl border border-border"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-5xl">{selectedAchievement.icon}</div>
                  <button
                    onClick={() => setSelectedAchievement(null)}
                    className="p-1 rounded-full hover:bg-secondary transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {selectedAchievement.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedAchievement.description}
                </p>

                <div className="bg-secondary/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      How to complete
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {selectedAchievement.user_achievements?.unlocked_at
                      ? getProgressText(selectedAchievement)
                      : `${selectedAchievement.user_achievements?.progress_current ?? 0}/${selectedAchievement.criteria_target} ${getProgressText(selectedAchievement)}`}
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${
                          selectedAchievement.user_achievements?.unlocked_at
                            ? 100
                            : Math.round(
                                ((selectedAchievement.user_achievements
                                  ?.progress_current ?? 0) /
                                  (selectedAchievement.criteria_target || 1)) *
                                  100,
                              )
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {selectedAchievement.user_achievements?.unlocked_at && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Unlock className="h-3 w-3" />
                    Unlocked on{" "}
                    {new Date(
                      selectedAchievement.user_achievements.unlocked_at,
                    ).toLocaleDateString()}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default AchievementsPanel;
