-- Add policy to allow reading all reviews for management
CREATE POLICY "Allow reading all reviews for management" 
ON public.reviews 
FOR SELECT 
USING (true);

-- Add policy to allow updating reviews for management
CREATE POLICY "Allow updating reviews for management" 
ON public.reviews 
FOR UPDATE 
USING (true);

-- Add policy to allow deleting reviews for management
CREATE POLICY "Allow deleting reviews for management" 
ON public.reviews 
FOR DELETE 
USING (true);