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
    // 1. Get subjects with count of approved & verified forums
    const { data: subjects, error: subjErr } = await supabase
      .from("forums")
      .select("subject_id, subjects(id, name)", { count: "exact" })
      .eq("validation_status", "approved")
      .eq("is_ai_verified", true)
      .not("subject_id", "is", null);

    if (subjErr) throw subjErr;

    // Aggregate counts per subject
    const subjectCountMap = new Map();
    subjects?.forEach((forum) => {
      const subject = forum.subjects;
      if (subject && subject.id) {
        const existing = subjectCountMap.get(subject.id) || {
          id: subject.id,
          name: subject.name,
          count: 0,
        };
        existing.count += 1;
        subjectCountMap.set(subject.id, existing);
      }
    });

    const subjectsFormatted = Array.from(subjectCountMap.values()).map((s) => ({
      id: s.id,
      name: s.name,
      type: "subject",
      discussionCount: s.count,
    }));

    // 2. Get tags with count of approved & verified forums (via forum_tags → forums)
    const { data: tagsWithCount, error: tagErr } = await supabase
      .from("forum_tags")
      .select(
        "tag_id, tags(id, name), forums!inner(validation_status, is_ai_verified)",
      )
      .eq("forums.validation_status", "approved")
      .eq("forums.is_ai_verified", true);

    if (tagErr) throw tagErr;

    const tagCountMap = new Map();
    tagsWithCount?.forEach((ft) => {
      const tag = ft.tags;
      if (tag && tag.id) {
        const existing = tagCountMap.get(tag.id) || {
          id: tag.id,
          name: tag.name,
          count: 0,
        };
        existing.count += 1;
        tagCountMap.set(tag.id, existing);
      }
    });

    const tagsFormatted = Array.from(tagCountMap.values()).map((t) => ({
      id: t.id,
      name: t.name,
      type: "tag",
      discussionCount: t.count,
    }));

    // 3. Combine, sort descending, limit
    const all = [...subjectsFormatted, ...tagsFormatted]
      .sort((a, b) => b.discussionCount - a.discussionCount)
      .slice(0, limit);

    return all;
  },

  async findAllWithCount() {
    const { data, error } = await supabase
      .from("subjects")
      .select(
        `
      id,
      name,
      forums:forums(count)
    `,
      )
      .eq("forums.validation_status", "approved")
      .eq("forums.is_ai_verified", true);
    if (error) throw error;
    return data.map((s) => ({
      id: s.id,
      name: s.name,
      discussion_count: s.forums?.[0]?.count || 0,
    }));
  },
};
