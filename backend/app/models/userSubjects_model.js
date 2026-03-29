import { supabase } from "../database/supabase.js";

const TABLE = "user_subjects";

export const UserSubjectsModel = {
  // Get all subjects for a user (returns subject objects)
  async getByUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("subject:subject_id(id, name, created_at)")
      .eq("user_id", userId);

    if (error) throw error;
    // Extract the nested subject objects
    return data.map(item => item.subject);
  },

  // Replace user's subjects with a new set
  async replaceForUser(userId, subjectIds) {
    // Start a transaction by using a single Supabase query (RPC not available, so do delete then insert)
    // First delete existing
    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId);
    if (deleteError) throw deleteError;

    if (subjectIds.length === 0) return [];

    // Insert new rows
    const rows = subjectIds.map(subjectId => ({ user_id: userId, subject_id: subjectId }));
    const { data, error } = await supabase
      .from(TABLE)
      .insert(rows)
      .select(); // optional
    if (error) throw error;
    return data;
  },
};