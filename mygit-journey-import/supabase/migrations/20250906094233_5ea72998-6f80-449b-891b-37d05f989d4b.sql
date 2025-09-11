-- Fix orphaned unsubscribed contacts by properly moving them through the unsubscribe process
DO $$
DECLARE
    contact_record RECORD;
BEGIN
    -- Find contacts with status 'unsubscribed' but no entries in unsubscribes table
    FOR contact_record IN 
        SELECT c.* FROM contacts c
        LEFT JOIN unsubscribes u ON c.email = u.email AND c.user_id = u.user_id
        WHERE c.status = 'unsubscribed' AND u.id IS NULL
    LOOP
        -- Call the handle_unsubscribe function to properly process the unsubscribe
        PERFORM public.handle_unsubscribe(
            contact_record.email,
            contact_record.user_id,
            'System cleanup - contact was marked unsubscribed but not properly processed'
        );
        
        RAISE NOTICE 'Processed orphaned unsubscribed contact: %', contact_record.email;
    END LOOP;
END $$;