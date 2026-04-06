// models/schools_model.js
import { supabase } from "../database/supabase.js";
import { getSchoolLogo } from "../services/leaderboard/schoolUtils.js";

const TABLE = "schools";

export const SchoolModel = {
  async create({ school_name, email_domain }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ school_name, email_domain }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  },

  async findByEmailDomain(email_domain) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email_domain", email_domain)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("school_name", { ascending: true });
    return { data, error };
  },

  async updatePoints(id, points) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ points })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  },

  async getTopSchoolsWithContributors(limit = 10) {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("school, points, id, name, profile_url")
      .not("school", "is", null);

    if (usersError) throw usersError;

    const schoolMap = new Map();
    for (const user of usersData) {
      const school = user.school;
      if (!schoolMap.has(school)) {
        schoolMap.set(school, { totalPoints: 0, users: [] });
      }
      const entry = schoolMap.get(school);
      entry.totalPoints += user.points || 0;
      entry.users.push({
        id: user.id,
        name: user.name,
        profile_url: user.profile_url,
        points: user.points,
      });
    }

    const schoolsWithInfo = Array.from(schoolMap.entries()).map(([school, data]) => {
      const logo = getSchoolLogo(school);
      return {
        school,
        totalPoints: data.totalPoints,
        users: data.users.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3),
        logo: logo || null,
      };
    });

    const sorted = schoolsWithInfo.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit);
    return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }));
  },

  async getUsersBySchool(schoolName, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, profile_url, points, bio")
      .eq("school", schoolName)
      .order("points", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },

  async getForumsBySchool(schoolName, limit = 20, offset = 0) {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("school", schoolName);
    if (userError) throw userError;
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return [];

    const { data: forums, error: forumsError } = await supabase
      .from("forums")
      .select(`
        id, title, content, created_at, user_id, subject_id, is_ai_verified,
        upvotes_count, downvotes_count, comments_count,
        users:user_id (id, name, profile_url, school),
        subject:subject_id (id, name)
      `)
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (forumsError) throw forumsError;
    return forums;
  },
};