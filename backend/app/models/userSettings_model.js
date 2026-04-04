import { supabase } from "../database/supabase.js";

const TABLE = "user_settings";

export const UserSettingsModel = {
  async getOrCreate(userId) {
    // Use maybeSingle() to avoid error when no rows
    let { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // Create new record
      const { data: newData, error: insertError } = await supabase
        .from(TABLE)
        .insert({ user_id: userId, profile_privacy: "public" })
        .select()
        .single();
      if (insertError) throw insertError;
      return newData;
    }
    return data;
  },

  async updatePrivacy(userId, privacy) {
    // Ensure record exists before update
    await this.getOrCreate(userId);
    const { data, error } = await supabase
      .from(TABLE)
      .update({ profile_privacy: privacy, updated_at: new Date() })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};