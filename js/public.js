// ============================================================
//  Public pages — Deutsch Entries
//  Renders home, archive, single-post, and the About timeline
//  from Supabase. Falls back to the built-in sample content
//  whenever keys aren't set or a query fails, so the site is
//  never blank.
// ============================================================
(function () {
  var H = window.DE;
  var configured = !!(window.SUPABASE_CONFIGURED && window.db);
  var db = window.db;

  var isPost = !!document.querySelector(".read-col");
  var isArchive = !!document.querySelector(".masonry");
  var isAbout = !!document.getElementById("aboutTimeline");
  var isHome = !!document.querySelector(".hero-strip");

  // ---- anti-flash: hide sample lists until real data is in ----
  if (configured && (isArchive || isHome || isPost)) {
    var hide = document.createElement("style");
    hide.id = "liveHide";
    hide.textContent = ".masonry,.grid-3,.read-col{visibility:hidden}";
    document.head.appendChild(hide);
  }
  function reveal() {
    var s = document.getElementById("liveHide");
    if (s) s.remove();
  }

  if (!configured) return; // samples already in the HTML

  // settings power hero images, level, portrait
  H.loadSettings(db).then(applySettings);

  if (isPost) renderPost();
  else if (isArchive) renderArchive();
  else if (isAbout) renderAbout();
  else if (isHome) renderHome();
  else reveal();

  function fetchPublished(limit) {
    var q = db.from("posts").select("*")
      .eq("status", "published")
      .lte("publish_at", new Date().toISOString())
      .order("publish_at", { ascending: false });
    if (limit) q = q.limit(limit);
    return q;
  }
  function readLabel(min) { return (min || 1) + " Min."; }

  // ---------- SETTINGS (hero images, level, portrait) ----------
  // On public pages, image-slots must NEVER be interactive — a visitor
  // could otherwise drag their own image in. So every hero slot is
  // replaced with either the real settings image or a static (non-
  // draggable) placeholder.
  function applySettings(s) {
    s = s || {};
    fillOrBlank(document.getElementById("hero-arch"), s.hero_arch_url);
    fillOrBlank(document.getElementById("hero-round"), s.hero_round_url);
    fillOrBlank(document.getElementById("hero-rug"), s.hero_rug_url);
    fillOrBlank(document.getElementById("hero-lemon"), s.hero_citrus_url);
    document.querySelectorAll("#author-portrait").forEach(function (el) {
      fillOrBlank(el, s.portrait_url);
    });
    if (s.level) setText(document, "#statLevel", s.level);
  }

  // non-interactive placeholder (subtle striped fill, no drag target)
  function placeholderEl() {
    var d = document.createElement("div");
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = "width:100%;height:100%;display:block;" +
      "background:repeating-linear-gradient(135deg,#ece0cb,#ece0cb 11px,#e6d8c0 11px,#e6d8c0 22px);";
    return d;
  }
  function imgEl(url) {
    var img = document.createElement("img");
    img.src = url; img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    return img;
  }
  // replace a slot with a real image if we have one, else a static placeholder
  function fillOrBlank(slot, url) {
    if (!slot) return;
    slot.replaceWith(url ? imgEl(url) : placeholderEl());
  }
  function lockImage(slot, url) { fillOrBlank(slot, url); }

  // ---------------- HOME ----------------
  function renderHome() {
    fetchPublished(7).then(function (res) {
      if (res.error || !res.data || !res.data.length) { reveal(); return; }
      var posts = res.data;

      // real hero stats
      var total = posts.length;
      setText(document, "#statEntries", String(total));
      // time since first (oldest) entry
      var oldest = posts[posts.length - 1];
      var t = H.timeSince(oldest.publish_at);
      setText(document, "#statTimeN", String(t.n));
      setText(document, "#statTimeL", t.label);

      var featured = posts[0];
      var rest = posts.slice(1, 7);

      var f = document.querySelector(".featured");
      if (f && featured) {
        var link = "post.html?slug=" + encodeURIComponent(featured.slug);
        var imgA = f.querySelector(".f-img");
        if (imgA) { imgA.setAttribute("href", link); fillOrBlank(imgA.querySelector("image-slot"), featured.thumb_url); }
        setText(f, ".f-tag", "Featured · " + (featured.category || ""));
        setHTML(f, "h2", H.esc(featured.title));
        var fde = f.querySelector(".f-de");
        if (fde) fde.textContent = featured.excerpt || "";
        var fbody = f.querySelector(".f-body");
        if (fbody) fbody.textContent = featured.excerpt || H.autoExcerpt(featured.body);
        var readBtn = f.querySelector(".btn");
        if (readBtn) readBtn.setAttribute("href", link);
      }

      var grid = document.querySelector(".grid-3");
      if (grid) {
        if (rest.length) {
          grid.innerHTML = rest.map(function (p) { return cardHTML(p); }).join("");
          hydrate(grid);
        } else {
          // only one post so far — hide the "Recent entries" section entirely
          var sec = grid.closest("section");
          if (sec) sec.style.display = "none";
        }
      }
      reveal();
    });
  }

  // ---------------- ARCHIVE ----------------
  function renderArchive() {
    fetchPublished(null).then(function (res) {
      if (res.error || !res.data || !res.data.length) { reveal(); return; }
      var posts = res.data;
      var heights = ["h-tall", "h-mid", "h-short"];
      var masonry = document.querySelector(".masonry");
      if (masonry) {
        masonry.innerHTML = posts.map(function (p, i) { return cardHTML(p, heights[i % heights.length]); }).join("");
        hydrate(masonry);
      }
      setText(document, "#archCount", "The Archive · " + posts.length + (posts.length === 1 ? " entry" : " entries"));
      if (typeof window.initArchiveFilter === "function") window.initArchiveFilter();
      reveal();
    });
  }

  function cardHTML(p, heightClass) {
    var link = "post.html?slug=" + encodeURIComponent(p.slug);
    var cls = "card" + (heightClass ? " " + heightClass : "");
    var thumb = p.thumb_url
      ? '<img src="' + H.esc(p.thumb_url) + '" alt="" style="width:100%;height:100%;object-fit:cover">'
      : '<div aria-hidden="true" style="width:100%;height:100%;background:repeating-linear-gradient(135deg,#ece0cb,#ece0cb 11px,#e6d8c0 11px,#e6d8c0 22px)"></div>';
    return (
      '<a href="' + link + '" class="' + cls + '" data-cat="' + H.esc(H.catKey(p.category)) + '">' +
      '<div class="thumb"><span class="cat">' + H.esc(p.category || "") + "</span>" + thumb + "</div>" +
      '<div class="meta"><span>' + H.formatDateDE(p.publish_at) + "</span>·" +
      '<span class="de">' + readLabel(p.read_min) + "</span></div>" +
      "<h3>" + H.esc(p.title) + "</h3>" +
      '<p class="excerpt">' + H.esc(p.excerpt || H.autoExcerpt(p.body)) + "</p>" +
      '<span class="read">Weiterlesen →</span></a>'
    );
  }
  function hydrate(scope) {/* images already inlined as <img> */}
  function setSlot(slot, url) { fillOrBlank(slot, url); }

  // ---------------- SINGLE POST ----------------
  function renderPost() {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { reveal(); return; } // direct sample view

    db.from("posts").select("*").eq("slug", slug)
      .eq("status", "published").limit(1).then(function (res) {
        if (res.error) { reveal(); return; }
        var p = res.data && res.data[0];
        if (!p) { window.location.replace("404.html"); return; }

        document.title = p.title + " — Deutsch Entries";
        setHTML(document, ".post-head h1", H.esc(p.title));
        var dek = document.querySelector(".post-head .dek");
        if (dek) dek.textContent = p.excerpt || "";

        var cats = document.querySelector(".post-head .cats");
        if (cats) cats.innerHTML = "<span>" + H.esc(p.category || "") + "</span>";
        var crumbCat = document.querySelector(".crumb span:last-child");
        if (crumbCat) crumbCat.textContent = p.category || "";

        var when = document.querySelector(".byline .when");
        if (when) when.textContent = H.formatDateDE(p.publish_at) + " · " + readLabel(p.read_min) + " Lesezeit · auf Deutsch";

        var hero = document.querySelector(".post-hero image-slot");
        if (hero) fillOrBlank(hero, p.thumb_url);

        var col = document.querySelector(".read-col");
        if (col) {
          col.innerHTML = H.mdToHtml(p.body || "");
          var firstP = col.querySelector("p");
          if (firstP) firstP.classList.add("drop");
        }
        reveal();
      });
  }

  // ---------------- ABOUT TIMELINE ----------------
  function renderAbout() {
    reveal();
    fetchPublished(null).then(function (res) {
      var box = document.getElementById("aboutTimeline");
      if (!box) return;
      var posts = (res && res.data) || [];
      // A "journey" needs a few entries — until then, hide the section
      // rather than show a single milestone that looks like filler.
      if (res.error || posts.length < 2) {
        var sec = box.closest("section");
        if (sec) sec.style.display = "none";
        else box.style.display = "none";
        return;
      }
      var asc = posts.slice().reverse(); // oldest → newest
      var picks = [];
      picks.push({ p: asc[0], head: "The beginning" });
      if (asc.length > 2) picks.push({ p: asc[Math.floor(asc.length / 2)], head: "Finding a rhythm" });
      picks.push({ p: asc[asc.length - 1], head: "Where I am now" });

      box.innerHTML = picks.map(function (it) {
        var d = new Date(it.p.publish_at);
        var year = d.getFullYear();
        var mon = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"][d.getMonth()];
        return (
          '<div class="tl-item">' +
            '<div class="tl-when">' + year + "<small>" + mon + "</small></div>" +
            '<div class="tl-body"><h4>' + H.esc(it.head) + "</h4>" +
            "<p>" + H.esc(it.p.title) + "</p></div>" +
          "</div>"
        );
      }).join("");
    });
  }

  // ---------- helpers ----------
  function setText(scope, sel, txt) { var e = scope.querySelector(sel); if (e) e.textContent = txt; }
  function setHTML(scope, sel, html) { var e = scope.querySelector(sel); if (e) e.innerHTML = html; }
})();
