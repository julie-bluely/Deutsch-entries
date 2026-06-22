# Go-Live Checklist — Deutsch Entries

A click-by-click path from the current prototype to a live, writable blog.
You'll touch four things: **GitHub** (host + code), **Supabase** (backend),
**Claude Code** (does the wiring), and optionally a **domain**.

Estimated time: an afternoon, most of it Claude Code working while you watch.

---

## Stage 1 — Get the code onto GitHub

1. Create a free account at **github.com** if you don't have one.
2. Click **New repository** → name it e.g. `deutsch-entries` → **Public** → Create.
3. Get these project files onto your computer (download the project as a zip, unzip it).
4. Upload them to the repo: on the repo page click **Add file → Upload files**, drag in
   everything (all the `.html`, `site.css`, `site.js`, `image-slot.js`, and the
   `design_handoff_backend/` folder), then **Commit changes**.
   - *(If you know git: `git init`, `git add .`, `git commit`, `git remote add`, `git push`.)*

### Turn on GitHub Pages (gets you a live URL immediately)
5. Repo → **Settings → Pages**.
6. Under **Source**, pick **Deploy from a branch** → Branch: `main` → Folder: `/ (root)` → **Save**.
7. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/deutsch-entries/`.
   - At this point the **design** is already public. The backend comes next.

---

## Stage 2 — Stand up the backend (Supabase)

1. Create a free account at **supabase.com** → **New project**.
   - Pick a name, a strong database password (save it), and a region near you.
2. When the project finishes provisioning, open **Project Settings → API** and copy two values:
   - **Project URL**
   - **anon public** key
   - *(Keep these handy — Claude Code will paste them into `supabase-config.js`. The anon
     key is safe to put in front-end code; that's how Supabase is designed.)*
3. **Create your admin login:** go to **Authentication → Users → Add user** → enter the
   author's email + a password. Then **Authentication → Providers/Settings → disable
   "Allow new users to sign up"** so only you can log in.
4. Leave the SQL schema to Claude Code (it's in `design_handoff_backend/`), or run
   `supabase/schema.sql` yourself in **SQL Editor** once Claude Code generates it.

---

## Stage 3 — Let Claude Code wire it all up

Open this repo in **Claude Code** and paste prompts like these, one stage at a time.

> **Prompt 1 — orient it**
> "Read `design_handoff_backend/README.md` and `GO_LIVE_CHECKLIST.md`. This repo is a
> finished static HTML blog that I want to keep exactly as designed. Your job is to add a
> Supabase backend and wire the existing pages to it without changing the visual design.
> Summarize the plan back to me before writing code."

> **Prompt 2 — schema**
> "Generate `supabase/schema.sql` for the `posts` table, the `post-images` storage bucket,
> and the Row Level Security policies described in the README. Give me the exact SQL to paste
> into the Supabase SQL Editor."

> **Prompt 3 — config + auth**
> "Create `supabase-config.js` that initializes the Supabase client. I'll paste my Project
> URL and anon key. Then wire `login.html` to real Supabase Auth and add a session guard +
> sign-out to `admin.html`, reusing the existing markup and error styles."

> **Prompt 4 — admin CRUD**
> "Wire `admin.html`: load real posts into the `.post-row` list, make the All/Published/Drafts
> tabs reflect real status, implement Edit, Delete (using the existing `#delModal`), the
> editor's Publish/Save-as-draft, the Featured-image upload to Supabase Storage with the
> 'set as thumbnail' toggle, and the Publish-later schedule. Don't restyle anything."

> **Prompt 5 — public pages**
> "Make `index.html`, `archive.html`, and `post.html` read published posts from Supabase and
> render into the existing card/markup. `post.html` should read `?slug=` and 404 on no match.
> Keep the hero collage as fixed site dressing."

> **Prompt 6 — test**
> "Walk me through testing locally, then committing and pushing so GitHub Pages updates."

Work stage by stage and **commit after each** so you can always roll back.

---

## Stage 4 — Publish your first post

1. Go to `…/admin.html` on your live site → log in with the user you created.
2. New entry → write the German title + body → upload an image → "set as thumbnail" →
   **Publish** (or schedule it).
3. Open the home page — your post should appear in the grid and be readable on its own page.

---

## Stage 5 (optional) — Custom domain

1. Buy a domain (e.g. `deutschentries.de`) from any registrar (~$10–15/yr).
2. GitHub repo → **Settings → Pages → Custom domain** → enter it → Save.
3. At your registrar, add the DNS records GitHub shows you (a `CNAME` to
   `<username>.github.io`, or the apex `A` records). Propagation takes minutes to a few hours.
4. Tick **Enforce HTTPS** once it's available.

---

## Costs

| Item             | Cost                                  |
|------------------|---------------------------------------|
| GitHub Pages     | Free                                  |
| Supabase         | Free tier (generous; fine for a blog) |
| Domain (optional)| ~$10–15 / year                        |

---

## Gotchas to know

- **GitHub Pages is static** — never put secret server keys in the repo. The Supabase
  **anon** key is the *only* key that belongs in front-end code, and it's safe by design.
  Your write protection comes from Auth + Row Level Security, not from hiding the key.
- **`image-slot.js` is a prototype helper** (drag-to-preview). In production the editor's
  upload becomes a real file input → Supabase Storage; public pages show plain `<img>`.
- **Scheduling** relies on the RLS rule `publish_at <= now()`, so a scheduled post simply
  becomes visible when its time arrives — no cron needed for v1.
- Keep the repo **Public** for free GitHub Pages (private needs a paid plan). Your admin is
  still safe because writing requires login.
