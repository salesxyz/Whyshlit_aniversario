create table if not exists public.whylist_state (
  id smallint primary key check (id = 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.whylist_state enable row level security;

revoke all on table public.whylist_state from anon, authenticated;
grant select, insert, update on table public.whylist_state to service_role;

drop function if exists public.mark_whylist_gift_paid(text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('whylist-assets', 'whylist-assets', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;
