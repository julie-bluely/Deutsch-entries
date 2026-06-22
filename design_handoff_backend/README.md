# Handoff: Deutsch Entries — Backend + Deployment

> **For Claude Code.** This document is the single source of truth for turning the
> existing HTML prototype into a live blog with a real backend, hosted on GitHub
> Pages, with a custom admin that the author logs into to write posts in German.

---

## 0. TL;DR for the agent

The repository root already contains a **complete, hand-designed front end** (see
[§7 Files](#7-files-in-this-repo)). **Do not redesign it.** Your job is to keep every
pixel of these pages and make them *real* by:

1. Adding **Supabase** (Postgres + Auth + Storage) as the backend.
2. Wiring `login.html` → real auth, `admin.html` → real create/edit/delete/publish/upload,
   and the public pages (`index.html`, `archive.html`, `post.html`) → read posts from the DB.
3. Keeping the site deployable as **static files on GitHub Pages** (Supabase is called
   from the browser, so no server is required).

The HTML/CSS is the **production front end**, not a throwaway mock. Preserve the markup,
classes, and `site.css`. Only add JavaScript and a few data attributes where needed.

---

## 1. Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  GitHub Pages (static host)  │  HTTPS  │  Supabase (managed backend)  │
│                              │ ──────► │                              │
│  index / archive / post      │  JS SDK │  • Auth  (single admin user) │
│  about / 404                 │         │  • Postgres  (posts table)   │
│  login / admin  (custom UI)  │ ◄────── │  • Storage   (post images)   │
│  site.css / site.js          │         │  • Row Level Security        │
└─────────────────────────────┘         └──────────────────────────────┘
```

**Why this works on GitHub Pages:** Supabase exposes a REST/JS API callable directly
from the browser. The **anon public key is meant to be shipped in client code** — writes
are protected by Row Level Security (RLS) + Auth, not by hiding the key. So a purely
static site can have a fully functional authenticated admin. No Node server, no
serverless functions required for v1.

**Fidelity:** High. Final colors, type, spacing, and interactions are all set. Recreate
nothing — wire the existing DOM.

---

## 2. Data model (Supabase / Postgres)

### Table: `posts`

| column        | type          | notes                                                        |
|---------------|---------------|--------------------------------------------------------------|
| `id`          | `uuid`        | PK, default `gen_random_uuid()`                              |
| `title`       | `text`        | German post title                                            |
| `slug`        | `text`        | unique, URL-safe; generate from title                       |
| `category`    | `text`        | one of: `Sprache, Kultur, Reisen, Leben, Küche`             |
| `body`        | `text`        | German body (store as Markdown or plain text w/ paragraphs) |
| `excerpt`     | `text`        | short teaser for cards/archive                              |
| `read_min`    | `int`         | estimated reading time (compute from word count)            |
| `thumb_url`   | `text` (null) | public URL of the “set as thumbnail” image in Storage       |
| `status`      | `text`        | `draft` or `published`                                       |
| `publish_at`  | `timestamptz` | publish date; future value = scheduled                      |
| `created_at`  | `timestamptz` | default `now()`                                              |
| `updated_at`  | `timestamptz` | default `now()`; bump on edit                               |

### Storage bucket: `post-images` (public read)

One image per post may be flagged as the thumbnail; store its public URL in `posts.thumb_url`.

### Row Level Security

- **Public (anon):** `SELECT` allowed only where `status = 'published'` AND `publish_at <= now()`.
- **Authenticated (the admin):** full `SELECT / INSERT / UPDATE / DELETE`.
- Storage `post-images`: public read; insert/delete only for authenticated.

### Auth

- **Single admin, no public sign-up.** Disable open registration in Supabase Auth.
  Create exactly one user (the author) via the Supabase dashboard. `login.html` signs
  in with email + password.

---

## 3. Screen → backend action mapping

Map each existing UI element to a Supabase call. **Element selectors/classes already
exist in the HTML — reuse them.**

### `login.html`
- Form submit → `supabase.auth.signInWithPassword({ email, password })`.
- On success → redirect to `admin.html`. On error → show the existing error styling.
- Guard `admin.html`: on load, if `supabase.auth.getSession()` is null → redirect to `login.html`.
- “Sign out” links → `supabase.auth.signOut()` → redirect to `login.html`.

### `admin.html` — dashboard list (`.post-row` items)
- On load → `SELECT * FROM posts ORDER BY publish_at DESC` and render one `.post-row` per row.
- The **All / Published / Drafts** tabs (`.filter-tabs .ftab`) already filter client-side by
  `data-status`; set `data-status="draft|pub"` from each row's `status`.
- **Edit** button → load that post into the editor view.
- **Delete** button → already opens the confirm modal (`#delModal`); on **confirm**, call
  `DELETE FROM posts WHERE id = …`, then remove the row (the fade-out animation already exists).
- The thumbnail cell currently shows a static placeholder icon; if `thumb_url` exists, render an `<img>` instead.

### `admin.html` — editor view (`#view-write`)
- **Title** (`.ed-title`), **Category** (`.ed-cat`), **Body** (`.ed-body`) → fields on the post.
- **Featured image** (`#editor-featured` image-slot) → on file pick, upload to Storage
  `post-images`, get public URL. The **“Set as post thumbnail”** toggle decides whether that
  URL is written to `posts.thumb_url`.
- **Preview** button → already opens `#previewModal` populated from the editor fields; no backend needed.
- **Publish later** toggle + datetime (`#schedField` / `#schedInput`) → sets `publish_at`;
  if it’s in the future, also set `status='published'` but rely on the RLS `publish_at <= now()`
  rule so it only appears at the scheduled time.
- **Publish** button → `INSERT` (new) or `UPDATE` (editing) with `status='published'`,
  `publish_at = chosen date or now()`. Compute `read_min` and `excerpt` server-side or in JS.
- **Save as draft** (add if missing) → same but `status='draft'`.

### `index.html` (home)
- Featured block + recent grid (`.featured`, `.grid-3 .card`) → `SELECT … WHERE status='published'
  AND publish_at <= now() ORDER BY publish_at DESC LIMIT n`. Fill title, date, category,
  `read_min`, and thumbnail. Link each card to `post.html?slug=…`.
- The big hero collage (`#hero-arch`, `#hero-round`, `#hero-rug`, `#hero-lemon`) is **fixed
  site dressing**, not per-post. Either keep the image-slots or hardcode chosen images; these
  can live in a small `settings` row later (out of scope for v1).

### `archive.html`
- Render all published posts as `.card` items (the masonry layout + `data-cat` filter + search
  are already wired client-side — just generate the cards from data and set each card's
  `data-cat` to its category).

### `post.html`
- Read `?slug=` from the URL → `SELECT * FROM posts WHERE slug = … AND status='published'`.
- Populate title, date, category, hero image, and body. The reading-progress bar
  (`#readProgress`) already works off scroll. If no match → redirect to `404.html`.

---

## 4. Suggested file additions (keep everything else)

```
/supabase-config.js     // exports the Supabase client (URL + anon key)
/js/auth.js             // login, session guard, sign-out
/js/admin.js            // dashboard list + editor CRUD + image upload
/js/public.js           // fetch + render home / archive / post
/supabase/schema.sql    // the posts table, RLS policies, storage bucket
```

Load the Supabase JS SDK and these scripts from each page. Do **not** inline secrets other
than the public anon key (that one is safe by design).

---

## 5. Design tokens (already defined in `site.css` `:root`)

| Token            | Value       | Use                                  |
|------------------|-------------|--------------------------------------|
| `--cream`        | `#F3EADB`   | page background                      |
| `--cream-deep`   | `#ECE0CB`   | alt sections, chips                  |
| `--paper`        | `#FBF6EC`   | cards, image frames                  |
| `--paper-edge`   | `#E7DAC2`   | card borders                         |
| `--ink`          | `#2B211A`   | primary text                         |
| `--ink-soft`     | `#5E5042`   | secondary text                       |
| `--ink-faint`    | `#8A7B68`   | meta / muted labels                  |
| `--rug`          | `#8E2B22`   | primary accent (Persian-rug red)     |
| `--rug-deep`     | `#6C1E18`   | hover / deep accent                  |
| `--terracotta`   | `#BD6A42`   | warm secondary accent                |
| `--terra-soft`   | `#D89469`   | soft accent, dashed image borders    |
| `--lemon`        | `#DDA52C`   | citrus accent (sparing)              |
| `--lemon-soft`   | `#ECC96B`   | selection highlight                  |
| `--serif`        | Playfair Display | headings                        |
| `--sans`         | Hanken Grotesk   | body / UI                       |
| `--maxw`         | `1240px`    | content max width                    |

Fonts load via Google Fonts `@import` at the top of `site.css`. Don’t change these.

---

## 6. Out of scope for v1 (note for later)

- Comments, newsletter, multi-author, analytics.
- A `settings` table for the home-hero images and author bio (the Settings UI exists in
  `admin.html` but can stay non-functional or be wired later).
- Server-side scheduled publishing jobs — RLS time-gating covers the common case.

---

## 7. Files in this repo

| File            | Role                                                        |
|-----------------|-------------------------------------------------------------|
| `index.html`    | Home — hero collage, featured + recent post grid            |
| `archive.html`  | All posts; category chips + live search + empty state       |
| `post.html`     | Single post template; reading-progress bar                  |
| `about.html`    | Author / blog story                                         |
| `login.html`    | Admin login (UI only — wire to Supabase Auth)               |
| `admin.html`    | Admin dashboard + editor + delete/preview/schedule/settings |
| `404.html`      | Not-found page                                              |
| `site.css`      | Shared stylesheet + design tokens                           |
| `site.js`       | Shared nav behavior                                         |
| `image-slot.js` | Drag-and-drop image placeholder component (prototype-only)  |

> The `image-slot` component is a **prototype convenience** for previewing images by drag.
> In production, replace its use in the editor with a real file `<input type="file">` that
> uploads to Supabase Storage. Public pages should render plain `<img src>` from `thumb_url`.

---

See **GO_LIVE_CHECKLIST.md** for the exact click-by-click steps (GitHub, Supabase,
Claude Code prompts, custom domain).
