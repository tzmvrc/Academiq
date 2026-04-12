import { supabase } from "../../database/supabase.js";

/**
 * Update achievement progress for a user based on criteria type.
 * @param {string} userId - UUID of the user
 * @param {string} criteriaType - e.g., 'total_posts', 'upvotes_given', etc.
 * @param {number} incrementBy - how much to add (default 1)
 */
export const updateAchievementProgress = async (userId, criteriaType, incrementBy = 1) => {
  try {
    // Get all achievements that use this criteria type
    const { data: achievements, error: fetchError } = await supabase
      .from("achievements")
      .select("id, criteria_target, name")
      .eq("criteria_type", criteriaType);

    if (fetchError) {
      console.error("Error fetching achievements:", fetchError);
      return;
    }
    if (!achievements || achievements.length === 0) return;

    for (const ach of achievements) {
      // Get current progress for this user & achievement
      const { data: userAch, error: getError } = await supabase
        .from("user_achievements")
        .select("progress_current, unlocked_at")
        .eq("user_id", userId)
        .eq("achievement_id", ach.id)
        .maybeSingle();

      if (getError) {
        console.error("Error fetching user achievement:", getError);
        continue;
      }

      // If already unlocked, skip
      if (userAch?.unlocked_at) continue;

      const oldProgress = userAch?.progress_current || 0;
      const newProgress = Math.min(oldProgress + incrementBy, ach.criteria_target);
      const unlocked = newProgress >= ach.criteria_target;
      const unlockedAt = unlocked ? new Date().toISOString() : null;

      // Upsert progress
      const { error: upsertError } = await supabase
        .from("user_achievements")
        .upsert({
          user_id: userId,
          achievement_id: ach.id,
          progress_current: newProgress,
          progress_target: ach.criteria_target,
          unlocked_at: unlockedAt,
        }, { onConflict: "user_id, achievement_id" });

      if (upsertError) {
        console.error("Error upserting user achievement:", upsertError);
      } else if (unlocked && !userAch?.unlocked_at) {
        console.log(`🎉 User ${userId} unlocked achievement: ${ach.name}`);
        // Optionally create a notification here
      }
    }
  } catch (err) {
    console.error("updateAchievementProgress error:", err);
  }
};