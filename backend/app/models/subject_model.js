import { supabase } from "../database/supabase.js";

const TABLE = "subjects";

const toSlug = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

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

  async create(name) {
    const slug = toSlug(name);

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ name, slug })
      .select()
      .single();

    return { data, error };
  },
};