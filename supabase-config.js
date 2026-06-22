// ============================================================
//  Supabase connection — Deutsch Entries
//  Fill in the two values below, then save.
//  These are SAFE to keep in front-end code (the anon key is
//  designed to be public; your data is protected by login +
//  Row Level Security, not by hiding this key).
// ============================================================

// 1) Paste your Project URL here (the "API URL", ends in .supabase.co)
const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";

// 2) Paste your anon / public key here (the long string, starts with eyJ...)
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";

// ------------------------------------------------------------
//  Below this line you normally don't need to touch anything.
//  Requires the Supabase JS SDK to be loaded first, e.g.:
//  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// ------------------------------------------------------------
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make it available to the other scripts (auth.js, admin.js, public.js)
window.db = supabaseClient;
