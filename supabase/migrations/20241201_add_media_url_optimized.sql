-- Add optimized media URL column to reviews table
ALTER TABLE reviews 
ADD COLUMN media_url_optimized TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_media_url_optimized 
ON reviews(media_url_optimized) 
WHERE media_url_optimized IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN reviews.media_url_optimized IS 'URL to the compressed/optimized version of the media file';
