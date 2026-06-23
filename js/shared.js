// ============================================================
//  Shared helpers — Deutsch Entries
//  Used by admin.js and public.js.
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

  // umlaut-safe URL slug
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
    var words = (body || "").replace(/[#>*_\-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function autoExcerpt(body) {
    var t = (body || "").replace(/[#>*_]/g, "").replace(/\s+/g, " ").trim();
    if (t.length <= 160) return t;
    return t.slice(0, 160).replace(/\s+\S*$/, "") + "…";
  }

  function esc(s) {
    return (s == null ? "" : String(s))
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function catKey(cat) { return (cat || "").toLowerCase().trim(); }

  // ---- time since first entry → friendly "X days/months in" ----
  function timeSince(dateStr) {
    if (!dateStr) return { n: 0, label: "Days in" };
    var start = new Date(dateStr), now = new Date();
    var days = Math.max(0, Math.floor((now - start) / 86400000));
    if (days < 31) return { n: days, label: days === 1 ? "Day in" : "Days in" };
    var months = Math.floor(days / 30.4);
    if (months < 24) return { n: months, label: months === 1 ? "Month in" : "Months in" };
    return { n: Math.floor(months / 12), label: "Years in" };
  }

  // ---- tiny Markdown → HTML (bold, italic, ## heading, > quote, - list, [t](url)) ----
  function mdInline(s) {
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + t + "</a>";
    });
    return s;
  }
  function mdToHtml(text) {
    var blocks = (text || "").replace(/\r/g, "").split(/\n{2,}/);
    var out = [];
    blocks.forEach(function (block) {
      var lines = block.split("\n").filter(function (l) { return l.trim() !== ""; });
      if (!lines.length) return;
      if (lines.every(function (l) { return /^\s*-\s+/.test(l); })) {
        out.push("<ul>" + lines.map(function (l) {
          return "<li>" + mdInline(esc(l.replace(/^\s*-\s+/, ""))) + "</li>";
        }).join("") + "</ul>");
      } else if (/^\s*>\s+/.test(lines[0])) {
        var q = lines.map(function (l) { return esc(l.replace(/^\s*>\s?/, "")); }).join(" ");
        out.push('<p class="pull">' + mdInline(q) + "</p>");
      } else if (/^\s*##\s+/.test(lines[0])) {
        out.push("<h2>" + mdInline(esc(lines[0].replace(/^\s*##\s+/, ""))) + "</h2>");
        var rest = lines.slice(1).join(" ").trim();
        if (rest) out.push("<p>" + mdInline(esc(rest)) + "</p>");
      } else {
        out.push("<p>" + mdInline(esc(lines.join(" "))) + "</p>");
      }
    });
    return out.join("\n");
  }

  // ---- settings (cached single-row fetch) ----
  var _settingsPromise = null;
  function loadSettings(db) {
    if (!db) return Promise.resolve(null);
    if (_settingsPromise) return _settingsPromise;
    _settingsPromise = db.from("settings").select("*").eq("id", 1).limit(1)
      .then(function (res) {
        if (res.error) { return null; }   // table may not exist yet — fail soft
        return (res.data && res.data[0]) || null;
      })
      .catch(function () { return null; });
    return _settingsPromise;
  }

  window.DE = {
    formatDateDE: formatDateDE,
    slugify: slugify,
    readMinutes: readMinutes,
    autoExcerpt: autoExcerpt,
    esc: esc,
    catKey: catKey,
    timeSince: timeSince,
    mdToHtml: mdToHtml,
    loadSettings: loadSettings
  };
})();
