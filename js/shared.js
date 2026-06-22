// ============================================================
//  Shared helpers — Deutsch Entries
//  Small utilities used by admin.js and public.js.
// ============================================================
(function () {
  var MONTHS_DE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  // "14. Juni 2026"
  function formatDateDE(value) {
    if (!value) return "—";
    var d = new Date(value);
    if (isNaN(d)) return "—";
    return d.getDate() + ". " + MONTHS_DE[d.getMonth()] + " " + d.getFullYear();
  }

  // umlaut-safe URL slug: "Über die Höflichkeit" -> "ueber-die-hoeflichkeit"
  function slugify(title) {
    return (title || "")
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "eintrag";
  }

  // rough reading time in minutes (German ~200 wpm)
  function readMinutes(body) {
    var words = (body || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  // first ~160 chars as a fallback excerpt
  function autoExcerpt(body) {
    var t = (body || "").replace(/\s+/g, " ").trim();
    if (t.length <= 160) return t;
    return t.slice(0, 160).replace(/\s+\S*$/, "") + "…";
  }

  // escape text before inserting into HTML
  function esc(s) {
    return (s == null ? "" : String(s))
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // category label -> data-cat key used by the archive filter
  function catKey(cat) {
    return (cat || "").toLowerCase().trim();
  }

  window.DE = {
    formatDateDE: formatDateDE,
    slugify: slugify,
    readMinutes: readMinutes,
    autoExcerpt: autoExcerpt,
    esc: esc,
    catKey: catKey
  };
})();
