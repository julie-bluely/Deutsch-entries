-- ============================================================
--  Deutsch Entries — SETTINGS table  (run this ONCE)
--  HOW TO USE: Supabase → SQL Editor → New query → paste all
--  of this → Run.  Safe to run more than once.
--  This adds the single-row "settings" record that powers your
--  level, tagline, author bio, footer links, and the fixed
--  home-page hero images. Only you (logged in) can change it;
--  visitors can only read it.
-- ============================================================

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
  about_main_url text,
  about_rug_url  text,
  about_lemon_url text,
  updated_at     timestamptz default now(),
  constraint settings_singleton check (id = 1)
);

-- ensure the single row exists
insert into settings (id) values (1) on conflict (id) do nothing;

-- Row Level Security: everyone can read; only the logged-in admin can change.
alter table settings enable row level security;

drop policy if exists "anyone can read settings"   on settings;
drop policy if exists "admin can update settings"   on settings;
drop policy if exists "admin can insert settings"   on settings;

create policy "anyone can read settings"
  on settings for select
  to anon, authenticated
  using ( true );

create policy "admin can update settings"
  on settings for update
  to authenticated
  using ( true ) with check ( true );

create policy "admin can insert settings"
  on settings for insert
  to authenticated
  with check ( true );

-- Done. Your settings row is ready.
