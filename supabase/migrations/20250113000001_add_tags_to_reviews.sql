-- Add tags column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add index for tags column for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_tags ON public.reviews USING GIN (tags);

-- Add comment to document the new column
COMMENT ON COLUMN public.reviews.tags IS 'Array of tags associated with the review for categorization and filtering';

-- Create a function to search reviews by tags
CREATE OR REPLACE FUNCTION search_reviews_by_tags(tag_search TEXT[])
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  user_name TEXT,
  user_instagram_handle TEXT,
  media_url TEXT,
  media_url_optimized TEXT,
  media_type TEXT,
  rating DECIMAL(2,1),
  description TEXT,
  user_avatar TEXT,
  is_active BOOLEAN,
  sort_order INTEGER,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_email,
    r.user_name,
    r.user_instagram_handle,
    r.media_url,
    r.media_url_optimized,
    r.media_type,
    r.rating,
    r.description,
    r.user_avatar,
    r.is_active,
    r.sort_order,
    r.tags,
    r.created_at,
    r.updated_at
  FROM public.reviews r
  WHERE r.tags && tag_search; -- Use && operator to check if arrays overlap
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all unique tags from reviews
CREATE OR REPLACE FUNCTION get_review_tags()
RETURNS TABLE (tag TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(tags) as tag
  FROM public.reviews
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  ORDER BY tag;
END;
$$ LANGUAGE plpgsql;

-- Update the existing RLS policies to include the new tags column
-- (No changes needed as the policies already allow all operations)
