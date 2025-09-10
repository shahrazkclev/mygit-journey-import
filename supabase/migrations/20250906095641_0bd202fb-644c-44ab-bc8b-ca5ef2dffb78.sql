-- Test and apply tag rules to existing unsubscribed contacts
SELECT public.reapply_tag_rules_to_unsubscribed_contacts('550e8400-e29b-41d4-a716-446655440000'::uuid);