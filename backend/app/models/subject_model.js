import { supabase } from "../database/supabase.js";

const TABLE = "subjects";

export const SubjectModel = {
  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("name", { ascending: true });
    return { data, error };
  },

  async findByName(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("name", name)
      .maybeSingle();
    return { data, error };
  },

  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return { data, error };
  },

  async findByIds(ids) {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in("id", ids);
    if (error) throw error;
    return data;
  },

  async create(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ name }) // no slug
      .select()
      .single();
    return { data, error };
  },

  async getTrendingTopics(limit = 18) {
    // 1. Get subjects with forum count
    const { data: subjects, error: subjErr } = await supabase.from("subjects")
      .select(`
        id,
        name,
        forums:forums(count)
      `);

    if (subjErr) throw subjErr;

    // 2. Get tags with forum count via forum_tags
    const { data: tags, error: tagErr } = await supabase.from("tags").select(`
        id,
        name,
        forum_tags(count)
      `);

    if (tagErr) throw tagErr;

    // 3. Format subjects
    const subjectsFormatted = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      type: "subject",
      discussionCount: s.forums?.[0]?.count || 0,
    }));

    // 4. Format tags
    const tagsFormatted = tags.map((t) => ({
      id: t.id,
      name: t.name,
      type: "tag",
      discussionCount: t.forum_tags?.[0]?.count || 0,
    }));

    // 5. Combine, sort descending, limit
    const all = [...subjectsFormatted, ...tagsFormatted]
      .sort((a, b) => b.discussionCount - a.discussionCount)
      .slice(0, limit);

    return all;
  },

  async findAllWithCount() {
    const { data, error } = await supabase.from("subjects").select(`
      id,
      name,
      forums:forums(count)
    `);
    if (error) throw error;
    return data.map((s) => ({
      id: s.id,
      name: s.name,
      discussion_count: s.forums?.[0]?.count || 0,
    }));
  },
};
