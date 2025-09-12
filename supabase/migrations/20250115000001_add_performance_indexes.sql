-- Add performance indexes for frequently queried columns
-- This migration adds indexes to improve query performance for contacts, lists, and related tables

-- Indexes for contacts table
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_status ON public.contacts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN (tags);

-- Indexes for email_lists table
CREATE INDEX IF NOT EXISTS idx_email_lists_user_id ON public.email_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_email_lists_created_at ON public.email_lists(created_at);
CREATE INDEX IF NOT EXISTS idx_email_lists_list_type ON public.email_lists(list_type);

-- Indexes for contact_lists junction table
CREATE INDEX IF NOT EXISTS idx_contact_lists_list_id ON public.contact_lists(list_id);
CREATE INDEX IF NOT EXISTS idx_contact_lists_contact_id ON public.contact_lists(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_lists_list_contact ON public.contact_lists(list_id, contact_id);

-- Indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- Indexes for contact_products table
CREATE INDEX IF NOT EXISTS idx_contact_products_contact_id ON public.contact_products(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_products_product_id ON public.contact_products(product_id);

-- Indexes for campaigns table
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- Indexes for unsubscribed_contacts table
CREATE INDEX IF NOT EXISTS idx_unsubscribed_contacts_user_id ON public.unsubscribed_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribed_contacts_created_at ON public.unsubscribed_contacts(created_at);

-- Indexes for reviews table (if not already exists)
CREATE INDEX IF NOT EXISTS idx_reviews_is_active ON public.reviews(is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_sort_order ON public.reviews(sort_order);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_contacts_user_status_created ON public.contacts(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_lists_user_created ON public.email_lists(user_id, created_at);

-- Add comments for documentation
COMMENT ON INDEX idx_contacts_user_id_status IS 'Index for filtering contacts by user and status';
COMMENT ON INDEX idx_contact_lists_list_id IS 'Index for counting contacts in lists';
COMMENT ON INDEX idx_email_lists_user_id IS 'Index for filtering email lists by user';
COMMENT ON INDEX idx_contacts_user_status_created IS 'Composite index for common contact queries with user, status, and date ordering';
