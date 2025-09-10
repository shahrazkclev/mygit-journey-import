-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  user_name TEXT,
  user_instagram_handle TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_url_optimized TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  description TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reviews
CREATE POLICY "Allow reading all reviews for management" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Allow inserting reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow updating reviews for management" 
ON public.reviews 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow deleting reviews for management" 
ON public.reviews 
FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_is_active ON public.reviews(is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_sort_order ON public.reviews(sort_order);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON public.reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the table
COMMENT ON TABLE public.reviews IS 'Customer reviews and testimonials';
COMMENT ON COLUMN public.reviews.is_active IS 'Whether the review is published (true) or pending approval (false)';
COMMENT ON COLUMN public.reviews.sort_order IS 'Order for displaying reviews (higher numbers first)';
COMMENT ON COLUMN public.reviews.media_url_optimized IS 'URL to the compressed/optimized version of the media file';
