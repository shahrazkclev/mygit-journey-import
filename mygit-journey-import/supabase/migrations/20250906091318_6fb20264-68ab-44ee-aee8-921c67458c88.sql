-- Reapply tag rules automatically and ensure trigger-based enforcement
-- 1) Create a pure function to apply tag rules to a tag array
-- 2) Update trigger function to call the pure function
-- 3) Add trigger on contacts BEFORE INSERT OR UPDATE OF tags
-- 4) Create a function to reapply rules for all contacts of a user
-- 5) Add trigger on tag_rules changes to invoke reapply for that user

-- 1) Pure function returning updated tags based on user's enabled rules
CREATE OR REPLACE FUNCTION public.apply_tag_rules_pure(p_user_id uuid, p_tags text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_record RECORD;
  updated_tags text[] := coalesce(p_tags, ARRAY[]::text[]);
  has_changes boolean := false;
  match_count integer;
  required_matches integer;
  trig_tags text[];
  add_len integer;
  rem_len integer;
  i integer;
  j integer;
BEGIN
  -- Loop through all enabled tag rules for this user
  FOR rule_record IN 
    SELECT * FROM public.tag_rules 
    WHERE user_id = p_user_id AND enabled = true
  LOOP
    match_count := 0;
    required_matches := 0;
    trig_tags := coalesce(NULLIF(rule_record.trigger_tags, ARRAY[]::text[]), ARRAY[rule_record.trigger_tag]);

    IF trig_tags IS NOT NULL AND array_length(trig_tags, 1) > 0 THEN
      required_matches := CASE 
        WHEN coalesce(rule_record.trigger_match_type, 'any') = 'all' THEN array_length(trig_tags, 1)
        ELSE 1 -- 'any'
      END;

      -- Count matches between current tags and trigger tags (case-insensitive, trimmed)
      IF updated_tags IS NOT NULL THEN
        FOR i IN 1..array_length(trig_tags, 1) LOOP
          FOR j IN 1..array_length(updated_tags, 1) LOOP
            IF lower(trim(updated_tags[j])) = lower(trim(trig_tags[i])) THEN
              match_count := match_count + 1;
              EXIT; -- found this trigger tag
            END IF;
          END LOOP;
        END LOOP;
      END IF;

      IF match_count < required_matches THEN
        CONTINUE; -- this rule doesn't match
      END IF;
    ELSE
      CONTINUE; -- no triggers defined
    END IF;

    -- Add tags
    add_len := array_length(rule_record.add_tags, 1);
    IF add_len IS NOT NULL AND add_len > 0 THEN
      FOR i IN 1..add_len LOOP
        IF rule_record.add_tags[i] IS NULL OR length(trim(rule_record.add_tags[i])) = 0 THEN
          CONTINUE;
        END IF;
        IF updated_tags IS NULL THEN
          updated_tags := ARRAY[trim(rule_record.add_tags[i])];
          has_changes := true;
        ELSIF NOT (trim(rule_record.add_tags[i]) = ANY(updated_tags)) THEN
          updated_tags := array_append(updated_tags, trim(rule_record.add_tags[i]));
          has_changes := true;
        END IF;
      END LOOP;
    END IF;

    -- Remove tags
    rem_len := array_length(rule_record.remove_tags, 1);
    IF rem_len IS NOT NULL AND rem_len > 0 THEN
      FOR i IN 1..rem_len LOOP
        IF rule_record.remove_tags[i] IS NULL THEN CONTINUE; END IF;
        updated_tags := array_remove(updated_tags, trim(rule_record.remove_tags[i]));
        -- We consider it a change even if tag wasn't present; harmless
        has_changes := true;
      END LOOP;
    END IF;
  END LOOP;

  IF has_changes THEN
    RETURN updated_tags;
  ELSE
    RETURN p_tags; -- unchanged
  END IF;
END;
$$;

-- 2) Update trigger to use pure function
CREATE OR REPLACE FUNCTION public.apply_tag_rules_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process if tags actually changed to avoid extra work
  IF TG_OP = 'UPDATE' AND OLD.tags IS NOT DISTINCT FROM NEW.tags THEN
    RETURN NEW;
  END IF;

  NEW.tags := public.apply_tag_rules_pure(NEW.user_id, NEW.tags);
  RETURN NEW;
END;
$$;

-- 3) Create trigger on contacts to apply rules on insert/update of tags
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_apply_tag_rules_on_contact_change') THEN
    DROP TRIGGER trg_apply_tag_rules_on_contact_change ON public.contacts;
  END IF;
END$$;

CREATE TRIGGER trg_apply_tag_rules_on_contact_change
BEFORE INSERT OR UPDATE OF tags ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.apply_tag_rules_trigger();

-- 4) Function to reapply rules for all contacts of a user
CREATE OR REPLACE FUNCTION public.reapply_tag_rules_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recompute tags for all contacts of this user using the pure function
  UPDATE public.contacts c
  SET tags = public.apply_tag_rules_pure(c.user_id, c.tags)
  WHERE c.user_id = p_user_id;
END;
$$;

-- 5) Trigger on tag_rules changes to invoke reapply
CREATE OR REPLACE FUNCTION public.on_tag_rule_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
BEGIN
  target_user := COALESCE(NEW.user_id, OLD.user_id);
  IF target_user IS NOT NULL THEN
    PERFORM public.reapply_tag_rules_for_user(target_user);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_on_tag_rule_change') THEN
    DROP TRIGGER trg_on_tag_rule_change ON public.tag_rules;
  END IF;
END$$;

CREATE TRIGGER trg_on_tag_rule_change
AFTER INSERT OR UPDATE OR DELETE ON public.tag_rules
FOR EACH ROW
EXECUTE FUNCTION public.on_tag_rule_change();