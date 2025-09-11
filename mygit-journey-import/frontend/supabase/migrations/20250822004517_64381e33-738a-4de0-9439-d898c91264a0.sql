-- Update default signature font to be more professional
UPDATE style_guides 
SET signature_font = '''Inter'', sans-serif' 
WHERE signature_font = '''Dancing Script'', cursive';