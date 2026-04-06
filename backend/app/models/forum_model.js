import { supabase } from "../database/supabase.js";

const TABLE = "forums";

export const ForumModel = {
  async create(payload) {
    return supabase.from(TABLE).insert(payload).select().single();
  },

  async findById(id) {
    const { data, error } = await supabase
      .from("forums")
      .select(
        `
      *,
      user:user_id(id, name, profile_url, school),
      subject:subject_id(id, name),
      forum_tags(
        tag:tag_id(id, name, slug, usage_count)
      )
    `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    // Transform tags
    if (data) {
      data.tags = (data.forum_tags || []).map((ft) => ft.tag).filter(Boolean);
      delete data.forum_tags;
    }
    return { data, error: null };
  },

  async findByUserId(userId, limit = 10, offset = 0) {
    const { data, error } = await supabase
      .from("forums")
      .select(
        `
      id,
      title,
      content,
      upvotes_count,
      comments_count,
      created_at,
      subject:subject_id ( id, name )
    `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data, error: null };
  },

  async findAll() {
    return supabase
      .from(TABLE)
      .select(
        `
        id, user_id, subject_id,
        title, content,
        document_url, is_ai_verified, ai_summary,
        comments_count, upvotes_count, downvotes_count,
        created_at,
        users!forums_user_id_fkey ( id, name, profile_url ),
        subjects ( id, name )
      `,
      )
      .order("created_at", { ascending: false });
  },

  async findByUserId(userId) {
    const { data, error } = await supabase
      .from("forums")
      .select(
        `
      *,
      user:user_id(id, name, profile_url, school),
      subject:subject_id(id, name),
      forum_tags(
        tag:tag_id(id, name, slug, usage_count)
      )
    `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    // Transform tags for each forum
    const transformed = data.map((forum) => ({
      ...forum,
      tags: (forum.forum_tags || []).map((ft) => ft.tag).filter(Boolean),
      forum_tags: undefined,
    }));
    return { data: transformed, error: null };
  },

  async update(id, updates) {
    return supabase.from(TABLE).update(updates).eq("id", id).select().single();
  },

  async delete(id) {
    return supabase.from(TABLE).delete().eq("id", id);
  },

  async getTagsForForum(forumId) {
    const { data, error } = await supabase
      .from("forum_tags")
      .select("tag:tag_id(id, name, slug)")
      .eq("forum_id", forumId);
    if (error) throw error;
    return data.map((item) => item.tag);
  },

  async setTags(forumId, tagIds) {
    // Delete existing
    const { error: delError } = await supabase
      .from("forum_tags")
      .delete()
      .eq("forum_id", forumId);
    if (delError) throw delError;

    if (tagIds.length === 0) return [];

    const rows = tagIds.map((tagId) => ({ forum_id: forumId, tag_id: tagId }));
    const { data, error } = await supabase
      .from("forum_tags")
      .insert(rows)
      .select();
    if (error) throw error;
    return data;
  },

  // models/forum_model.js
  async getTrendingAcademicForums(limit = 3) {
    const cutoff = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // 1. Fetch forums from last 30 days
    const { data: forums, error: forumsErr } = await supabase
      .from("forums")
      .select(
        "id, title, content, upvotes_count, comments_count, created_at, subject_id, user_id",
      )
      .gte("created_at", cutoff);
    if (forumsErr) throw forumsErr;
    if (!forums || forums.length === 0) return [];

    // 2. Get subject popularity (total forums count per subject)
    const { data: subjectCounts, error: subjErr } = await supabase
      .from("subjects")
      .select("id, forums:forums(count)");
    if (subjErr) throw subjErr;
    const subjectPopMap = {};
    subjectCounts.forEach((s) => {
      subjectPopMap[s.id] = s.forums?.[0]?.count || 0;
    });

    // 3. Get tag popularity per forum
    //    Fetch all forum_tags for these forums in one query
    const forumIds = forums.map((f) => f.id);
    const { data: forumTags, error: tagErr } = await supabase
      .from("forum_tags")
      .select("forum_id, tag:tag_id(id, name, forum_tags(count))")
      .in("forum_id", forumIds);
    if (tagErr) throw tagErr;

    // Map: forum_id -> sum of tag forum_counts
    const tagPopMap = {};
    for (const ft of forumTags || []) {
      const tagCount = ft.tag?.forum_tags?.[0]?.count || 0;
      if (!tagPopMap[ft.forum_id]) tagPopMap[ft.forum_id] = 0;
      tagPopMap[ft.forum_id] += tagCount;
    }

    // 4. Compute score for each forum
    const now = Date.now();
    const forumsWithScore = forums.map((forum) => {
      const daysOld = (now - new Date(forum.created_at)) / (1000 * 3600 * 24);
      const freshness = Math.max(0, 1 - daysOld / 30);
      const engagement =
        (forum.upvotes_count || 0) + (forum.comments_count || 0);
      const tagScore = (tagPopMap[forum.id] || 0) * 0.5;
      const subjectScore = (subjectPopMap[forum.subject_id] || 0) * 0.3;
      const score = (engagement + tagScore + subjectScore) * freshness;
      return { ...forum, score };
    });

    // 5. Group by subject_id, keep the highest‑scoring forum per subject
    const bestPerSubject = new Map();
    for (const forum of forumsWithScore) {
      const existing = bestPerSubject.get(forum.subject_id);
      if (!existing || forum.score > existing.score) {
        bestPerSubject.set(forum.subject_id, forum);
      }
    }

    // 6. Sort by score and take top N
    const bestForums = Array.from(bestPerSubject.values());
    bestForums.sort((a, b) => b.score - a.score);
    const topForums = bestForums.slice(0, limit);

    // 7. Enrich with subject name and user name
    const subjectIds = [...new Set(topForums.map((f) => f.subject_id))];
    const { data: subjects, error: subjNameErr } = await supabase
      .from("subjects")
      .select("id, name")
      .in("id", subjectIds);
    if (subjNameErr) throw subjNameErr;
    const subjectMap = {};
    subjects.forEach((s) => {
      subjectMap[s.id] = s.name;
    });

    const userIds = [...new Set(topForums.map((f) => f.user_id))];
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id, name, profile_url")
      .in("id", userIds);
    if (userErr) throw userErr;
    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u;
    });

    // Final shape
    return topForums.map((forum) => ({
      id: forum.id,
      title: forum.title,
      content: forum.content,
      upvotes: forum.upvotes_count,
      comments: forum.comments_count,
      created_at: forum.created_at,
      subject: {
        id: forum.subject_id,
        name: subjectMap[forum.subject_id] || "Unknown",
      },
      user: userMap[forum.user_id] || {
        id: forum.user_id,
        name: "Anonymous",
        profile_url: null,
      },
    }));
  },
};
