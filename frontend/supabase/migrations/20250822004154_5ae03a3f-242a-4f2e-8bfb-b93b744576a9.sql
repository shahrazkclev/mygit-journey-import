-- Add signature_font column to style_guides table
ALTER TABLE style_guides 
ADD COLUMN signature_font TEXT DEFAULT '''Dancing Script'', cursive';