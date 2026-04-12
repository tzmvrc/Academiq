import { supabase } from "../../database/supabase.js";

export const getAllAchievements = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Fetch all achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from("achievements")
      .select("*");

    if (achievementsError) throw achievementsError;

    // If user is authenticated, fetch their progress
    if (userId && achievements) {
      const { data: userProgress, error: progressError } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", userId);

      if (!progressError && userProgress) {
        // Merge user progress into achievements
        const achievementsWithProgress = achievements.map((ach) => {
          const userAch = userProgress.find(
            (up) => up.achievement_id === ach.id,
          );
          return {
            ...ach,
            user_achievements: userAch || null,
          };
        });
        return res.json({ achievements: achievementsWithProgress });
      }
    }

    res.json({ achievements });
  } catch (err) {
    console.error("Get All Achievements Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getUserAchievements = async (req, res) => {
  try {
    let { userId } = req.params;

    // If userId looks like a username (not a UUID), fetch the user by name to get their ID
    if (
      userId &&
      !userId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      // It's a username, decode it and fetch the user by name
      const decodedName = decodeURIComponent(userId);
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("name", decodedName)
        .single();

      if (userError || !userData) {
        console.error("User not found:", userError);
        return res.status(404).json({ error: "User not found" });
      }
      userId = userData.id;
    }

    // Fetch user achievements
    const { data: userAchievementsData, error: userAchError } = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false });

    if (userAchError) {
      console.error("Error fetching user achievements:", userAchError);
      throw userAchError;
    }

    // If no achievements, return empty array
    if (!userAchievementsData || userAchievementsData.length === 0) {
      return res.json({ achievements: [] });
    }

    // Get achievement IDs
    const achievementIds = userAchievementsData.map((ua) => ua.achievement_id);

    // Fetch achievement details
    const { data: achievementsData, error: achError } = await supabase
      .from("achievements")
      .select("id, name, description, icon")
      .in("id", achievementIds);

    if (achError) {
      console.error("Error fetching achievement details:", achError);
      throw achError;
    }

    // Create a map of achievements for quick lookup
    const achievementMap = {};
    if (achievementsData) {
      achievementsData.forEach((ach) => {
        achievementMap[ach.id] = ach;
      });
    }

    // Format response for frontend by merging data
    const achievements = userAchievementsData.map((ua) => {
      const ach = achievementMap[ua.achievement_id];
      return {
        id: ua.achievement_id,
        achievement_id: ua.achievement_id,
        achievement_name: ach?.name || "Unknown",
        achievement_description: ach?.description || "",
        achievement_icon: ach?.icon || "🏆",
        achievement_points: 0,
        unlocked_at: ua.unlocked_at,
        is_featured: false,
      };
    });

    res.json({ achievements });
  } catch (err) {
    console.error("Get User Achievements Error:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to fetch user achievements" });
  }
};

export const updateFeaturedAchievements = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { featuredIds = [] } = req.body;

    // Validate max 3 featured achievements
    if (featuredIds.length > 3) {
      return res.status(400).json({
        error: "Maximum 3 featured achievements allowed",
      });
    }

    // TODO: Add 'featured_achievements' JSONB column to user_settings table
    // For now, featured achievements are stored on the frontend in localStorage
    // When you add the column, uncomment the code below:
    /*
    const { error: upsertError } = await supabase.from("user_settings").upsert({
      user_id: userId,
      featured_achievements: featuredIds,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.error("Error updating featured achievements:", upsertError);
      throw upsertError;
    }
    */

    // For now, just return success - frontend handles persistence
    res.json({
      message: "Featured achievements updated successfully",
      featured_achievements: featuredIds,
    });
  } catch (err) {
    console.error("Update Featured Achievements Error:", err);
    res.status(500).json({ error: "Failed to update featured achievements" });
  }
};

export const getFeaturedAchievements = async (req, res) => {
  try {
    let { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // If userId looks like a username (not a UUID), fetch the user by name to get their ID
    if (
      userId &&
      !userId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      const decodedName = decodeURIComponent(userId);
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("name", decodedName)
        .single();

      if (userError || !userData) {
        console.error("User not found:", userError);
        return res.status(404).json({ error: "User not found" });
      }
      userId = userData.id;
    }

    // TODO: Fetch from featured_achievements column when added
    // For now, return empty array - featured achievements are stored on frontend
    // This endpoint will be fully functional once the database column is added

    res.json({ achievements: [] });
  } catch (err) {
    console.error("Get Featured Achievements Error:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to fetch featured achievements" });
  }
};
