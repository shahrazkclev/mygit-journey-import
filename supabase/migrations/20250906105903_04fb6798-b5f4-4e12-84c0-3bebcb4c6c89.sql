-- Allow unsubscribes without an email by making email nullable
ALTER TABLE public.unsubscribes
  ALTER COLUMN email DROP NOT NULL;