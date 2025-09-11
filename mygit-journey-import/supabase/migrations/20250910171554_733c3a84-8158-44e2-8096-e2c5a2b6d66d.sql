-- Get the admin user ID and migrate all data
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the real admin user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'cgdora4@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Update contacts
        UPDATE public.contacts 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update campaigns
        UPDATE public.campaigns 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update products
        UPDATE public.products 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update email_lists
        UPDATE public.email_lists 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update user_settings
        UPDATE public.user_settings 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update style_guides
        UPDATE public.style_guides 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update tag_rules
        UPDATE public.tag_rules 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update unsubscribed_contacts
        UPDATE public.unsubscribed_contacts 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update unsubscribes
        UPDATE public.unsubscribes 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        -- Update unsubscribe_tokens
        UPDATE public.unsubscribe_tokens 
        SET user_id = admin_user_id 
        WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
        
        RAISE NOTICE 'Data migrated successfully for admin user: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Admin user cgdora4@gmail.com not found';
    END IF;
END $$;