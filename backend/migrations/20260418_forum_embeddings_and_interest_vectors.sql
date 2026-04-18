-- ============================================
-- Forum Embeddings + Personalized Feed Schema
-- ============================================

-- 1. Add 'embedding' column to forums (JSONB array for storing vectors)
ALTER TABLE IF EXISTS public.forums
ADD COLUMN IF NOT EXISTS embedding JSONB;

-- ⚠️  NO INDEX on embedding column
-- Reason: Vectors too large for BTREE (~6KB per row, max 2.7KB allowed)
-- Solution: Similarity search done in application code (Node.js)
-- Future: If scaling >1M forums, migrate to pgvector with ivfflat/hnsw indexes

-- 2. Add interest vector columns to users table (for personalized feeds)
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS interest_vector JSONB,
ADD COLUMN IF NOT EXISTS interest_vector_updated_at TIMESTAMP WITH TIME ZONE;

-- 3. Create user_interest_vectors table for caching computed vectors
CREATE TABLE IF NOT EXISTS public.user_interest_vectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  interest_vector JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create user_activity table to track user interactions
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  forum_id UUID NOT NULL REFERENCES public.forums(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('upvote', 'downvote', 'comment', 'save')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- 5. Create indexes for fast lookups (on columns we actually query, not vectors)
CREATE INDEX IF NOT EXISTS user_interest_vectors_user_id_idx ON public.user_interest_vectors(user_id);
CREATE INDEX IF NOT EXISTS user_interest_vectors_updated_at_idx ON public.user_interest_vectors(updated_at DESC);

CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_forum_id_idx ON public.user_activity(forum_id);
CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON public.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_action_type_idx ON public.user_activity(action_type);

-- 6. Grant permissions (if needed for Supabase RLS)
ALTER TABLE public.user_interest_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
