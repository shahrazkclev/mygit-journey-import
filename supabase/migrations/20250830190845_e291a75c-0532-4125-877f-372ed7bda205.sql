-- Create tag_rules table for managing automatic tag updates
create table if not exists public.tag_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text,
  description text,
  trigger_tag text not null,
  add_tags text[],
  remove_tags text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tag_rules enable row level security;

-- Helpful index for trigger lookups
create index if not exists idx_tag_rules_user_trigger on public.tag_rules (user_id, trigger_tag);

-- RLS: allow demo user full access
create policy if not exists "Allow demo user access to tag rules"
  on public.tag_rules
  for all
  using (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
  with check (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Auto-update updated_at on changes
create trigger if not exists update_tag_rules_updated_at
before update on public.tag_rules
for each row execute function public.update_updated_at_column();