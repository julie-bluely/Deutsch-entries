// ============================================================
//  Supabase connection — Deutsch Entries
//  Paste your two values below, save, upload to GitHub. Done.
//  The anon key is SAFE in front-end code: your data is guarded
//  by login + Row Level Security, not by hiding this key.
// ============================================================

// 1) Project URL  (the "API URL", ends in .supabase.co)
const SUPABASE_URL = "https://wbodebovbehggpibpckk.supabase.co";

// 2) anon / public key  (the long string, usually starts with eyJ...)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib2RlYm92YmVoZ2dwaWJwY2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDE3OTgsImV4cCI6MjA5NzY3Nzc5OH0.Q7Wy5qyUFhAz-dlcRH54rG0js8eKEHEj4_smX9LG-Qo";

// ------------------------------------------------------------
//  You normally don't need to touch anything below.
// ------------------------------------------------------------
(function () {
  var looksFilled =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.indexOf("PASTE_") === -1 &&
    SUPABASE_ANON_KEY.indexOf("PASTE_") === -1 &&
    /^https:\/\/.+\.supabase\.co/.test(SUPABASE_URL);

  // Is the Supabase SDK present on the page?
  var sdkReady = !!(window.supabase && window.supabase.createClient);

  window.SUPABASE_CONFIGURED = !!(looksFilled && sdkReady);

  if (window.SUPABASE_CONFIGURED) {
    window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    window.db = null;
    if (!looksFilled) {
      console.info(
        "[Deutsch Entries] Supabase keys not set yet — the site is showing its built-in sample content. " +
          "Paste your Project URL + anon key into supabase-config.js to go live."
      );
    } else if (!sdkReady) {
      console.warn(
        "[Deutsch Entries] Supabase SDK not loaded. Make sure the @supabase/supabase-js script tag is above supabase-config.js."
      );
    }
  }
})();
