-- Fix FOR loop upper bound null error in apply_tag_rules_pure function
CREATE OR REPLACE FUNCTION public.apply_tag_rules_pure(p_user_id uuid, p_tags text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      IF updated_tags IS NOT NULL AND array_length(updated_tags, 1) > 0 THEN
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

    -- Add tags (fix null upper bound)
    add_len := coalesce(array_length(rule_record.add_tags, 1), 0);
    IF add_len > 0 THEN
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

    -- Remove tags (fix null upper bound)
    rem_len := coalesce(array_length(rule_record.remove_tags, 1), 0);
    IF rem_len > 0 THEN
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