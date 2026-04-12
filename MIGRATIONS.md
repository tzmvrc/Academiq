# Database Migrations for AI Features

This document describes the database schema changes required for the AI-powered Point Validation and Comment Verification features.

## Changes to `comments` Table

### Existing Fields (Already in Schema)

The following fields already exist in the `comments` table and are being utilized:

- `points_awarded` (integer) - Points awarded to the comment
- `points_reason` (text) - Reason for the points awarded
- `points_processed_at` (timestamp) - When the comment was graded
- `is_ai_verified` (boolean) - Whether AI verified the comment claims

### New Fields to Add

Run the following SQL to add the verification fields:

```sql
-- Add verification fields to comments table
ALTER TABLE public.comments
ADD COLUMN verification_source_url TEXT DEFAULT NULL,
ADD COLUMN verification_confidence NUMERIC DEFAULT 0.0 CHECK (verification_confidence >= 0 AND verification_confidence <= 1.0),
ADD COLUMN verification_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries on unprocessed payments
CREATE INDEX idx_comments_points_processed_at ON public.comments(points_processed_at)
WHERE points_processed_at IS NULL;

-- Create index for verification status
CREATE INDEX idx_comments_is_ai_verified ON public.comments(is_ai_verified);
```

### Field Descriptions

| Field                     | Type         | Description                                               |
| ------------------------- | ------------ | --------------------------------------------------------- |
| `points_awarded`          | integer      | Points awarded (0-10) after AI grading                    |
| `points_reason`           | text         | Explanation of why those points were awarded              |
| `points_processed_at`     | timestamp    | When the comment was graded (NULL = not yet graded)       |
| `is_ai_verified`          | boolean      | Whether claims in comment are verified (true/false)       |
| `verification_source_url` | text         | URL to credible source if verified (null if not verified) |
| `verification_confidence` | numeric(3,2) | Confidence score 0.0-1.0                                  |
| `verification_checked_at` | timestamp    | When verification was last checked                        |

## Querying Ungraded Comments

To find comments that haven't been graded yet:

```sql
SELECT id, user_id, forum_id, content, created_at
FROM public.comments
WHERE points_processed_at IS NULL
ORDER BY created_at ASC
LIMIT 100;
```

## Querying Verified Comments

To find verified comments:

```sql
SELECT id, content, is_ai_verified, verification_source_url, verification_confidence
FROM public.comments
WHERE is_ai_verified = true
AND verification_checked_at IS NOT NULL
ORDER BY verification_confidence DESC;
```

## Rollback (If Needed)

If you need to rollback these changes:

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_comments_points_processed_at;
DROP INDEX IF EXISTS idx_comments_is_ai_verified;

-- Remove new columns
ALTER TABLE public.comments
DROP COLUMN IF EXISTS verification_source_url,
DROP COLUMN IF EXISTS verification_confidence,
DROP COLUMN IF EXISTS verification_checked_at;
```

## Migration Steps (Manual)

1. **Connect to Supabase Database**
   - Open Supabase Dashboard
   - Go to SQL Editor

2. **Run the Migration Script**
   - Copy the SQL migration script above
   - Execute it in the SQL Editor

3. **Verify Changes**
   - Check that columns exist in the `comments` table
   - Verify indexes were created

## Notes

- The `points_processed_at` field acts as a flag: `NULL` means unprocessed, any timestamp means processed
- The `verification_confidence` is stored as a numeric between 0.0 and 1.0
- All new columns have appropriate defaults to avoid breaking existing queries
- Indexes are added for performance optimization of scheduler queries

## Performance Considerations

- The `idx_comments_points_processed_at` index helps the scheduler quickly find ungraded comments
- Use the `points_processed_at IS NULL` condition in queries for best performance
- Consider partitioning if the comments table grows very large (100M+ rows)

## Example: Batch Processing Comments

```sql
-- Update points for a batch of comments
UPDATE public.comments
SET
  points_awarded = 8,
  points_reason = 'Clear, accurate, and helpful response',
  points_processed_at = NOW()
WHERE id = 'comment-uuid'
AND points_processed_at IS NULL;

-- Verify the update
SELECT id, points_awarded, points_processed_at
FROM public.comments
WHERE id = 'comment-uuid';
```
