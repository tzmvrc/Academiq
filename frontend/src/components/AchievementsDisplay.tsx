import { useState, useEffect } from "react";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon: string;
  achievement_points: number;
  unlocked_at: string;
  is_featured: boolean;
}

interface AchievementsDisplayProps {
  userId: string;
  isOwn?: boolean;
}

const AchievementsDisplay = ({
  userId,
  isOwn = false,
}: AchievementsDisplayProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [featuredAchievements, setFeaturedAchievements] = useState<
    Achievement[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(`/achievements/user/${userId}`);
      const allAchievements = res.data.achievements || [];
      setAchievements(allAchievements);

      // Filter featured achievements (max 3)
      const featured = allAchievements.filter(
        (a: Achievement) => a.is_featured,
      );
      setFeaturedAchievements(featured.slice(0, 3));
    } catch (err) {
      console.error("Failed to fetch achievements", err);
      toast({
        title: "Failed to load achievements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded-lg bg-secondary" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-secondary"
            />
          ))}
        </div>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No achievements unlocked yet. Keep contributing to earn them!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured Achievements Section */}
      {featuredAchievements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Featured Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredAchievements.map((achievement) => (
              <div
                key={achievement.achievement_id}
                className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">
                  {achievement.achievement_icon || "🏆"}
                </div>
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {achievement.achievement_name}
                </h4>
                <p className="text-xs text-foreground/70 line-clamp-2 mt-1">
                  {achievement.achievement_description}
                </p>
                {achievement.achievement_points > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1">
                    <span className="text-xs font-medium text-yellow-600">
                      +{achievement.achievement_points} pts
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Unlocked{" "}
                  {new Date(achievement.unlocked_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Achievements Section */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            All Achievements ({achievements.length})
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.achievement_id}
                className="group relative rounded-lg border border-border bg-card p-3 hover:shadow-md transition-all">
                <div className="text-2xl mb-2 text-center">
                  {achievement.achievement_icon || "🏆"}
                </div>
                <h4 className="text-xs font-medium text-foreground text-center truncate">
                  {achievement.achievement_name}
                </h4>

                {/* Hover Tooltip */}
                <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="rounded-lg bg-foreground text-background p-3 text-xs border border-foreground shadow-lg">
                    <p className="font-semibold mb-1">
                      {achievement.achievement_name}
                    </p>
                    <p className="opacity-90 mb-2">
                      {achievement.achievement_description}
                    </p>
                    {achievement.achievement_points > 0 && (
                      <p className="text-yellow-300 font-medium">
                        +{achievement.achievement_points} points
                      </p>
                    )}
                    <p className="opacity-70 mt-1">
                      {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {achievement.is_featured && (
                  <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-yellow-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Featured Note */}
      {isOwn && (
        <div className="text-xs text-muted-foreground italic">
          Tip: Edit your profile to select your 3 featured achievements to
          showcase!
        </div>
      )}
    </div>
  );
};

export default AchievementsDisplay;
