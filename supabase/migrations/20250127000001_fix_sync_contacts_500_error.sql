-- Fix sync-contacts Edge Function 500 error
-- This migration safely creates the missing tag_rule_executions table
-- Uses IF NOT EXISTS to prevent data loss

-- Create tag_rule_executions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tag_rule_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.tag_rules(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_tags_before TEXT[] NOT NULL DEFAULT '{}',
  trigger_tags_after TEXT[] NOT NULL DEFAULT '{}',
  trigger_match_type TEXT NOT NULL,
  tags_added TEXT[] DEFAULT NULL,
  tags_removed TEXT[] DEFAULT NULL,
  tags_before TEXT[] NOT NULL DEFAULT '{}',
  tags_after TEXT[] NOT NULL DEFAULT '{}',
  execution_successful BOOLEAN DEFAULT TRUE,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_tag_rule_executions_user_id ON public.tag_rule_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_rule_executions_contact_id ON public.tag_rule_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_tag_rule_executions_rule_id ON public.tag_rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_tag_rule_executions_triggered_at ON public.tag_rule_executions(triggered_at);

-- Enable RLS (safe operation)
ALTER TABLE public.tag_rule_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tag_rule_executions (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tag_rule_executions' 
    AND policyname = 'Users can access their own tag rule executions'
  ) THEN
    CREATE POLICY "Users can access their own tag rule executions" ON public.tag_rule_executions
    FOR ALL
    USING (
      public.is_current_user_admin() OR auth.uid() = user_id
    )
    WITH CHECK (
      public.is_current_user_admin() OR auth.uid() = user_id
    );
  END IF;
END $$;

-- Update the apply_tag_rules_trigger function with better error handling
CREATE OR REPLACE FUNCTION public.apply_tag_rules_trigger()
RETURNS TRIGGER AS $$
DECLARE
  rule_record RECORD;
  i integer;
  tags_to_add text[];
  tags_to_remove text[];
  final_tags text[];
  rule_triggered BOOLEAN;
  tags_changed BOOLEAN := FALSE;
BEGIN
  -- Only apply rules if this is an INSERT (new contact) or if tags actually changed
  IF TG_OP = 'INSERT' THEN
    tags_changed := TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if tags actually changed (not just any field update)
    IF OLD.tags IS DISTINCT FROM NEW.tags THEN
      tags_changed := TRUE;
    END IF;
  END IF;

  -- If tags didn't change, don't apply rules
  IF NOT tags_changed THEN
    RETURN NEW;
  END IF;

  final_tags := COALESCE(NEW.tags, ARRAY[]::text[]);

  FOR rule_record IN
    SELECT * FROM tag_rules
    WHERE user_id = NEW.user_id
      AND enabled = true
  LOOP
    rule_triggered := FALSE;

    IF rule_record.trigger_match_type = 'all' THEN
      -- Check if ALL trigger_tags are present in NEW.tags
      IF NEW.tags @> rule_record.trigger_tags THEN
        rule_triggered := TRUE;
      END IF;
    ELSIF rule_record.trigger_match_type = 'any' THEN
      -- Check if ANY trigger_tag is present in NEW.tags
      IF NEW.tags && rule_record.trigger_tags THEN
        rule_triggered := TRUE;
      END IF;
    END IF;

    IF rule_triggered THEN
      -- Store tags before modification for logging
      DECLARE
        tags_before_modification text[] := final_tags;
      BEGIN
        -- If replace_all_tags is true, clear all existing tags first
        IF rule_record.replace_all_tags THEN
          final_tags := ARRAY[]::text[];
        END IF;

        -- Remove specified tags
        IF array_length(rule_record.remove_tags, 1) > 0 THEN
          FOR i IN 1..array_length(rule_record.remove_tags, 1)
          LOOP
            final_tags := array_remove(final_tags, rule_record.remove_tags[i]);
          END LOOP;
        END IF;

        -- Add new tags (avoid duplicates)
        IF array_length(rule_record.add_tags, 1) > 0 THEN
          FOR i IN 1..array_length(rule_record.add_tags, 1)
          LOOP
            IF NOT rule_record.add_tags[i] = ANY(final_tags) THEN
              final_tags := array_append(final_tags, rule_record.add_tags[i]);
            END IF;
          END LOOP;
        END IF;

        -- Log the execution (with error handling to prevent trigger failure)
        BEGIN
          INSERT INTO tag_rule_executions (
            rule_id,
            rule_name,
            contact_id,
            contact_email,
            user_id,
            trigger_match_type,
            trigger_tags_before,
            trigger_tags_after,
            tags_added,
            tags_removed,
            tags_before,
            tags_after,
            execution_successful
          ) VALUES (
            rule_record.id,
            rule_record.name,
            NEW.id,
            NEW.email,
            NEW.user_id,
            rule_record.trigger_match_type,
            NEW.tags, -- The tags that triggered the rule
            NEW.tags, -- The tags that triggered the rule (same as before for trigger)
            rule_record.add_tags,
            rule_record.remove_tags,
            tags_before_modification,
            final_tags,
            TRUE
          );
        EXCEPTION WHEN OTHERS THEN
          -- If logging fails, continue with the rule application
          -- This prevents the trigger from failing the main operation
          -- Log the error for debugging but don't fail the trigger
          RAISE WARNING 'Failed to log tag rule execution: %', SQLERRM;
        END;
      END;
    END IF;
  END LOOP;

  NEW.tags := final_tags;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


