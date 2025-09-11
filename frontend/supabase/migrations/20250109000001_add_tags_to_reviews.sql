-- Add tags column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add index for tags for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_tags ON public.reviews USING GIN (tags);

-- Add comment to document the new column
COMMENT ON COLUMN public.reviews.tags IS 'Array of tags to categorize reviews';
