import { supabase } from "../database/supabase.js";

const TABLE = "otp";

export const OtpModel = {
  // Create or replace OTP record (send otp step)
  async upsert({ email, otp_hash, expires_at }) {
    // delete old first (simpler than update logic)
    await supabase.from(TABLE).delete().eq("email", email);

    const { data, error } = await supabase
      .from(TABLE)
      .insert([
        {
          email,
          otp_hash,
          expires_at,
          verified: false,
          attempts: 0,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Find verification by email
  async findByEmail(email) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email", email)
      .single();

    if (error) return null;
    return data;
  },

  // Increase failed attempts (anti brute force)
  async incrementAttempts(email) {
    // First, get the current attempts
    const record = await this.findByEmail(email);
    if (!record) throw new Error("OTP record not found");

    const { data, error } = await supabase
      .from(TABLE)
      .update({ attempts: record.attempts + 1 })
      .eq("email", email)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Mark verified after correct OTP
  async markVerified(email) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ verified: true })
      .eq("email", email)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Delete after successful signup
  async delete(email) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("email", email);

    if (error) throw error;
  },

  // Remove expired records (optional cleanup)
  async deleteExpired() {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;
  },
};
