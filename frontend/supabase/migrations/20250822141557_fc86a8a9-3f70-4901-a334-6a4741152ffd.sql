
-- 1) Make user_settings upsert reliable
create unique index if not exists ux_user_settings_user_id
on public.user_settings (user_id);

-- 2) Add dynamic/static list support
alter table public.email_lists
  add column if not exists list_type text not null default 'static',
  add column if not exists rule_config jsonb;

-- 3) Speed up tag filtering
create index if not exists idx_contacts_tags_gin
on public.contacts using gin (tags);

-- 4) Prevent duplicate memberships
create unique index if not exists ux_contact_lists_contact_id_list_id
on public.contact_lists (contact_id, list_id);
