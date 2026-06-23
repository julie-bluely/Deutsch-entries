-- ============================================================
--  Deutsch Entries — add separate About-page image columns
--  HOW TO USE: Supabase → SQL Editor → New query → paste all
--  of this → Run.  Safe to run more than once.
--  This lets the About page use its OWN pictures, independent
--  of the home page collage.
-- ============================================================

alter table settings add column if not exists about_main_url  text;
alter table settings add column if not exists about_rug_url   text;
alter table settings add column if not exists about_lemon_url text;

-- Done. Reload the Settings page and you'll have separate
-- About-page image slots.
