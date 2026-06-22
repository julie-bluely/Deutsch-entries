// ============================================================
//  Public pages — Deutsch Entries
//  Renders home, archive, and single-post from Supabase.
//  When keys aren't set (or on any error) it leaves the
//  hand-designed sample content in place so the site never
//  looks broken.
// ============================================================
(function () {
  if (!window.SUPABASE_CONFIGURED || !window.db) return; // keep sample content
  var db = window.db;
  var H = window.DE;

  var isPost = !!document.querySelector("article .read-col");
  var isArchive = !!document.querySelector(".masonry");
  var isHome = !!document.querySelector(".featured") && !isPost;

  if (isPost) renderPost();
  else if (isArchive) renderArchive();
  else if (isHome) renderHome();

  // ---- live published posts, newest first ----
  function fetchPublished(limit) {
    var q = db.from("posts").select("*")
      .eq("status", "published")
      .lte("publish_at", new Date().toISOString())
      .order("publish_at", { ascending: false });
    if (limit) q = q.limit(limit);
    return q;
  }

  function readLabel(min) { return (min || 1) + " Min."; }

  // ---------------- HOME ----------------
  function renderHome() {
    fetchPublished(7).then(function (res) {
      if (res.error || !res.data || !res.data.length) return; // keep samples
      var posts = res.data;
      var featured = posts[0];
      var rest = posts.slice(1, 7);

      // ----- featured block -----
      var f = document.querySelector(".featured");
      if (f && featured) {
        var link = "post.html?slug=" + encodeURIComponent(featured.slug);
        var imgA = f.querySelector(".f-img");
        if (imgA) {
          imgA.setAttribute("href", link);
          setSlot(imgA.querySelector("image-slot"), featured.thumb_url);
        }
        setText(f, ".f-tag", "Featured · " + (featured.category || ""));
        setHTML(f, "h2", H.esc(featured.title));
        var fde = f.querySelector(".f-de");
        if (fde) fde.textContent = featured.excerpt || "";
        var fbody = f.querySelector(".f-body");
        if (fbody) fbody.textContent = featured.excerpt || H.autoExcerpt(featured.body);
        var readBtn = f.querySelector(".btn");
        if (readBtn) readBtn.setAttribute("href", link);
      }

      // ----- recent grid -----
      var grid = document.querySelector(".grid-3");
      if (grid) {
        grid.innerHTML = rest.map(cardHTML).join("");
        hydrateSlots(grid, rest);
      }
    });
  }

  // ---------------- ARCHIVE ----------------
  function renderArchive() {
    fetchPublished(null).then(function (res) {
      if (res.error || !res.data || !res.data.length) return; // keep samples
      var posts = res.data;
      var heights = ["h-tall", "h-mid", "h-short"];
      var masonry = document.querySelector(".masonry");
      if (!masonry) return;
      masonry.innerHTML = posts.map(function (p, i) {
        return cardHTML(p, heights[i % heights.length]);
      }).join("");
      hydrateSlots(masonry, posts);

      // update the count in the eyebrow
      var eyebrow = document.querySelector(".arch-head .eyebrow");
      if (eyebrow) eyebrow.textContent = "Das Archiv · " + posts.length + " Einträge";

      // re-init the existing chip/search filter over the new cards
      if (typeof window.initArchiveFilter === "function") window.initArchiveFilter();
    });
  }

  // a single archive/home card (matches the existing markup)
  function cardHTML(p, heightClass) {
    var link = "post.html?slug=" + encodeURIComponent(p.slug);
    var cls = "card" + (heightClass ? " " + heightClass : "");
    return (
      '<a href="' + link + '" class="' + cls + '" data-cat="' + H.esc(H.catKey(p.category)) + '">' +
      '<div class="thumb"><span class="cat">' + H.esc(p.category || "") + "</span>" +
      '<image-slot shape="rect" data-thumb="' + H.esc(p.thumb_url || "") + '"></image-slot></div>' +
      '<div class="meta"><span>' + H.formatDateDE(p.publish_at) + "</span>·" +
      '<span class="de">' + readLabel(p.read_min) + "</span></div>" +
      "<h3>" + H.esc(p.title) + "</h3>" +
      '<p class="excerpt">' + H.esc(p.excerpt || H.autoExcerpt(p.body)) + "</p>" +
      '<span class="read">Weiterlesen →</span></a>'
    );
  }

  // set image-slot src for cards that carry a data-thumb
  function hydrateSlots(scope, posts) {
    scope.querySelectorAll("image-slot[data-thumb]").forEach(function (slot) {
      var u = slot.getAttribute("data-thumb");
      if (u) slot.setAttribute("src", u);
    });
  }

  function setSlot(slot, url) {
    if (slot && url) slot.setAttribute("src", url);
  }

  // ---------------- SINGLE POST ----------------
  function renderPost() {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) return; // no slug → keep the sample post showing

    db.from("posts").select("*").eq("slug", slug)
      .eq("status", "published").limit(1).then(function (res) {
        if (res.error) return;
        var p = res.data && res.data[0];
        if (!p) { window.location.replace("404.html"); return; }

        document.title = p.title + " — Deutsch Entries";

        setHTML(document, ".post-head h1", H.esc(p.title));
        var dek = document.querySelector(".post-head .dek");
        if (dek) dek.textContent = p.excerpt || "";

        // categories row → one real category + the Auf Deutsch flag
        var cats = document.querySelector(".post-head .cats");
        if (cats) cats.innerHTML = "<span>" + H.esc(p.category || "") + "</span>";
        var crumbCat = document.querySelector(".crumb span:last-child");
        if (crumbCat) crumbCat.textContent = p.category || "";

        var when = document.querySelector(".byline .when");
        if (when) when.textContent =
          H.formatDateDE(p.publish_at) + " · " + readLabel(p.read_min) + " Lesezeit · auf Deutsch";

        // hero image
        var hero = document.querySelector(".post-hero image-slot");
        if (hero) {
          if (p.thumb_url) hero.setAttribute("src", p.thumb_url);
          else hero.removeAttribute("src");
        }

        // body → paragraphs, drop-cap on the first
        var col = document.querySelector(".read-col");
        if (col) {
          var paras = (p.body || "").split(/\n\s*\n/).map(function (t) { return t.trim(); }).filter(Boolean);
          col.innerHTML = paras.map(function (t, i) {
            return '<p' + (i === 0 ? ' class="drop"' : "") + ">" + H.esc(t) + "</p>";
          }).join("");
        }
      });
  }

  // ---------- tiny DOM helpers ----------
  function setText(scope, sel, txt) { var e = scope.querySelector(sel); if (e) e.textContent = txt; }
  function setHTML(scope, sel, html) { var e = scope.querySelector(sel); if (e) e.innerHTML = html; }
})();
