-- ============================================================
--  Deutsch Entries — database setup
--  HOW TO USE: in Supabase, open "SQL Editor" → "New query",
--  paste this whole file, and click RUN. One time only.
-- ============================================================

-- 1) The posts table -----------------------------------------
create table if not exists posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text unique not null,
  category    text not null default 'Leben',
  body        text not null default '',
  excerpt     text default '',
  read_min    int  default 1,
  thumb_url   text,
  status      text not null default 'draft',   -- 'draft' or 'published'
  publish_at  timestamptz default now(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- keep updated_at fresh on every edit
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_touch on posts;
create trigger posts_touch
  before update on posts
  for each row execute function touch_updated_at();

-- 2) Row Level Security --------------------------------------
alter table posts enable row level security;

-- Visitors (not logged in) can read ONLY posts that are
-- published AND whose publish time has arrived.
drop policy if exists "public can read live posts" on posts;
create policy "public can read live posts"
  on posts for select
  to anon
  using ( status = 'published' and publish_at <= now() );

-- The logged-in admin can do everything.
drop policy if exists "admin full read"   on posts;
drop policy if exists "admin can insert"  on posts;
drop policy if exists "admin can update"  on posts;
drop policy if exists "admin can delete"  on posts;

create policy "admin full read"  on posts for select to authenticated using ( true );
create policy "admin can insert" on posts for insert to authenticated with check ( true );
create policy "admin can update" on posts for update to authenticated using ( true );
create policy "admin can delete" on posts for delete to authenticated using ( true );

-- 3) Image storage bucket ------------------------------------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Anyone can VIEW images; only the admin can upload/replace/delete.
drop policy if exists "public can view images"  on storage.objects;
drop policy if exists "admin can upload images" on storage.objects;
drop policy if exists "admin can delete images" on storage.objects;

create policy "public can view images"
  on storage.objects for select
  to anon
  using ( bucket_id = 'post-images' );

create policy "admin can upload images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'post-images' );

create policy "admin can delete images"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'post-images' );

-- 4) Settings (single row) — level, tagline, bio, hero images ----
create table if not exists settings (
  id             int primary key default 1,
  site_title     text default 'Deutsch Entries',
  tagline        text default 'A diary of learning German, one cultural detour at a time.',
  level          text default 'A2',
  author_name    text default 'die Autorin',
  author_bio     text default 'Eine Lernende, kein Profi. Ich schreibe dieses Tagebuch, um mein Deutsch zu üben — Korrekturen sind herzlich willkommen.',
  instagram      text default '',
  email          text default '',
  hero_arch_url  text,
  hero_round_url text,
  hero_rug_url   text,
  hero_citrus_url text,
  portrait_url   text,
  updated_at     timestamptz default now(),
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

alter table settings enable row level security;
drop policy if exists "anyone can read settings" on settings;
drop policy if exists "admin can update settings" on settings;
drop policy if exists "admin can insert settings" on settings;
create policy "anyone can read settings" on settings for select to anon, authenticated using ( true );
create policy "admin can update settings" on settings for update to authenticated using ( true ) with check ( true );
create policy "admin can insert settings" on settings for insert to authenticated with check ( true );

-- Done. Your backend is ready.
