// ============================================================
//  Admin — Deutsch Entries
//  Real posts list, create / edit / delete / publish / schedule,
//  image upload, Settings (save + image uploads), Media library,
//  and a working editor toolbar. Falls back to the static sample
//  UI when Supabase keys aren't set yet.
// ============================================================
(function () {
  if (!document.querySelector(".admin")) return;
  var H = window.DE;

  // editor toolbar works even before login (pure text editing)
  wireToolbar();

  if (!window.SUPABASE_CONFIGURED || !window.db) return;
  var db = window.db;

  var editingId = null;
  var pendingImageFile = null;
  var pendingImageExistingUrl = null;
  var pendingSettings = {};   // settings image URLs picked but not yet saved
  var currentLevel = "A2";

  if (window.__ADMIN_SESSION) start();
  else document.addEventListener("admin-authed", start);

  function start() {
    overlayUploader();
    wireEditorButtons();
    wireNewEntryButtons();
    wireDeleteModal();
    wireSettings();
    wireMedia();
    loadSettingsIntoUI();
    loadPosts();
  }

  // ---------- POSTS ----------
  function loadPosts() {
    db.from("posts").select("*").order("publish_at", { ascending: false }).then(function (res) {
      if (res.error) { console.error(res.error); return; }
      renderRows(res.data || []);
    });
  }

  function renderRows(posts) {
    var container = document.querySelector(".posts");
    if (!container) return;
    var empty = document.getElementById("postsEmpty");
    container.querySelectorAll(".post-row:not(.head)").forEach(function (r) { r.remove(); });

    var ph = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>';

    posts.forEach(function (p) {
      var isPub = p.status === "published";
      var row = document.createElement("div");
      row.className = "post-row";
      row.setAttribute("data-status", isPub ? "pub" : "draft");
      row.dataset.id = p.id;
      var thumb = p.thumb_url
        ? '<img src="' + H.esc(p.thumb_url) + '" alt="" style="width:100%;height:100%;object-fit:cover">'
        : ph;
      var badge = isPub ? '<span class="badge pub">Published</span>' : '<span class="badge draft">Draft</span>';
      var dateTxt = isPub ? H.formatDateDE(p.publish_at) : "—";
      row.innerHTML =
        '<div class="pr-thumb">' + thumb + "</div>" +
        '<div><div class="pr-title">' + H.esc(p.title) + "</div>" +
        '<div class="pr-cat">' + H.esc(p.category || "") + "</div></div>" +
        "<span>" + badge + "</span>" +
        '<span class="pr-date">' + dateTxt + "</span>" +
        '<div class="pr-actions"><button class="pr-edit">Edit</button><button class="pr-del">Delete</button></div>';
      row.querySelector(".pr-edit").addEventListener("click", function () { editPost(p); });
      row.querySelector(".pr-del").addEventListener("click", function () { askDelete(p); });
      if (empty) container.insertBefore(row, empty); else container.appendChild(row);
    });

    updateStats(posts);
    if (typeof window.filterPosts === "function") {
      window.filterPosts("all", document.querySelector('.filter-tabs .ftab[data-status="all"]'));
    }
  }

  function updateStats(posts) {
    var pub = posts.filter(function (p) { return p.status === "published"; }).length;
    var draft = posts.length - pub;
    setText("#dashPub", String(pub));
    setText("#dashDraft", String(draft));
    setText("#dashTotal", String(posts.length));
    setText("#dashLevel", currentLevel);
  }

  // ---------- DELETE ----------
  var deleteTargetId = null;
  function askDelete(p) {
    deleteTargetId = p.id;
    var t = document.getElementById("delTitle");
    if (t) t.textContent = "“" + p.title + "”";
    var modal = document.getElementById("delModal");
    if (modal) modal.hidden = false;
  }
  function wireDeleteModal() {
    var modal = document.getElementById("delModal");
    if (!modal) return;
    var confirmBtn = modal.querySelector(".btn-danger");
    if (confirmBtn) confirmBtn.onclick = function () {
      if (!deleteTargetId) { modal.hidden = true; return; }
      db.from("posts").delete().eq("id", deleteTargetId).then(function (res) {
        if (res.error) alert("Could not delete: " + res.error.message);
        deleteTargetId = null; modal.hidden = true; loadPosts();
      });
    };
  }

  // ---------- NEW / EDIT ----------
  function wireNewEntryButtons() {
    document.querySelectorAll('[data-view="write"]').forEach(function (b) { b.addEventListener("click", resetEditor); });
    document.querySelectorAll(".topbar .btn-primary").forEach(function (b) {
      if ((b.textContent || "").indexOf("New entry") !== -1) b.addEventListener("click", resetEditor);
    });
  }
  function resetEditor() {
    editingId = null; pendingImageFile = null; pendingImageExistingUrl = null;
    setVal(".ed-title", ""); setVal(".ed-excerpt", ""); setVal(".ed-body", "");
    var cat = document.querySelector(".ed-cat"); if (cat) cat.selectedIndex = 0;
    var slot = document.getElementById("editor-featured"); if (slot && slot.removeAttribute) slot.removeAttribute("src");
    setHTML("#view-write .topbar h1", "Write a <em>new entry</em>");
  }
  function editPost(p) {
    editingId = p.id; pendingImageFile = null; pendingImageExistingUrl = p.thumb_url || null;
    setVal(".ed-title", p.title || ""); setVal(".ed-excerpt", p.excerpt || ""); setVal(".ed-body", p.body || "");
    var cat = document.querySelector(".ed-cat");
    if (cat) Array.prototype.forEach.call(cat.options, function (o, i) {
      if (o.value === p.category || o.textContent === p.category) cat.selectedIndex = i;
    });
    setHTML("#view-write .topbar h1", "Edit <em>entry</em>");
    if (typeof window.showView === "function") window.showView("write");
  }

  // ---------- FEATURED IMAGE UPLOAD ----------
  function overlayUploader() {
    var zone = document.querySelector(".dropzone");
    if (!zone) return;
    var input = makeFileInput(zone);
    input.addEventListener("change", function () {
      var f = input.files && input.files[0]; if (!f) return;
      pendingImageFile = f;
      previewInto(document.getElementById("editor-featured"), URL.createObjectURL(f));
    });
  }
  function thumbnailToggleOn() {
    var sw = document.querySelector(".thumb-toggle .switch");
    return sw ? sw.classList.contains("on") : true;
  }

  // ---------- PUBLISH / SAVE ----------
  function wireEditorButtons() {
    var write = document.getElementById("view-write");
    if (!write) return;
    write.querySelectorAll("button").forEach(function (b) {
      var txt = (b.textContent || "").trim().toLowerCase();
      if (txt.indexOf("save draft") !== -1) b.addEventListener("click", function (e) { e.preventDefault(); savePost("draft", b); });
      else if (txt.indexOf("publish") !== -1) b.addEventListener("click", function (e) { e.preventDefault(); savePost("published", b); });
    });
  }
  function chosenPublishAt() {
    var sw = document.querySelector(".sched-toggle .switch");
    var input = document.getElementById("schedInput");
    if (sw && sw.classList.contains("on") && input && input.value) return new Date(input.value).toISOString();
    return new Date().toISOString();
  }
  function savePost(status, btn) {
    var title = getVal(".ed-title");
    if (!title) { alert("Please give your entry a title first."); return; }
    var body = getVal(".ed-body");
    var category = getVal(".ed-cat") || "Life";
    var excerpt = getVal(".ed-excerpt") || H.autoExcerpt(body);
    var label = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Saving…"; }
    function restore() { if (btn) { btn.disabled = false; btn.innerHTML = label; } }

    maybeUploadImage().then(function (thumbUrl) {
      var rec = {
        title: title, category: category, body: body, excerpt: excerpt,
        read_min: H.readMinutes(body), status: status, publish_at: chosenPublishAt()
      };
      if (thumbUrl) rec.thumb_url = thumbUrl;
      var op;
      if (editingId) {
        if (!thumbUrl && pendingImageExistingUrl) rec.thumb_url = pendingImageExistingUrl;
        op = db.from("posts").update(rec).eq("id", editingId);
      } else {
        rec.slug = H.slugify(title) + "-" + Date.now().toString(36);
        op = db.from("posts").insert(rec);
      }
      op.then(function (res) {
        restore();
        if (res.error) { alert("Could not save: " + res.error.message); return; }
        resetEditor();
        if (typeof window.showView === "function") window.showView("dash");
        loadPosts();
      });
    }).catch(function (err) { restore(); alert("Image upload failed: " + (err && err.message ? err.message : err)); });
  }
  function maybeUploadImage() {
    if (!pendingImageFile || !thumbnailToggleOn()) return Promise.resolve(null);
    return uploadToBucket(pendingImageFile);
  }

  // ---------- SETTINGS ----------
  function loadSettingsIntoUI() {
    H.loadSettings(db).then(function (s) {
      if (!s) return;
      currentLevel = s.level || "A2";
      setVal("#setTitle", s.site_title || "");
      setVal("#setTagline", s.tagline || "");
      selectVal("#setLevel", s.level || "A2");
      setVal("#setName", s.author_name || "");
      setVal("#setBio", s.author_bio || "");
      setVal("#setInstagram", s.instagram || "");
      setVal("#setEmail", s.email || "");
      previewInto(document.getElementById("set-hero-arch"), s.hero_arch_url);
      previewInto(document.getElementById("set-hero-round"), s.hero_round_url);
      previewInto(document.getElementById("set-hero-rug"), s.hero_rug_url);
      previewInto(document.getElementById("set-hero-citrus"), s.hero_citrus_url);
      previewInto(document.getElementById("set-portrait"), s.portrait_url);
      setText("#dashLevel", currentLevel);
    });
  }
  function wireSettings() {
    // image upload slots
    document.querySelectorAll(".upload-slot[data-col]").forEach(function (slotWrap) {
      var col = slotWrap.getAttribute("data-col");
      var input = makeFileInput(slotWrap);
      input.addEventListener("change", function () {
        var f = input.files && input.files[0]; if (!f) return;
        previewInto(slotWrap.querySelector("image-slot, img"), URL.createObjectURL(f));
        uploadToBucket(f).then(function (url) { pendingSettings[col] = url; })
          .catch(function (e) { alert("Upload failed: " + (e.message || e)); });
      });
    });
    // save buttons (topbar + bottom of settings)
    document.querySelectorAll("#view-settings .btn-primary").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); saveSettings(b); });
    });
  }
  function saveSettings(btn) {
    var rec = {
      id: 1,
      site_title: getVal("#setTitle"),
      tagline: getVal("#setTagline"),
      level: getVal("#setLevel") || "A2",
      author_name: getVal("#setName"),
      author_bio: getVal("#setBio"),
      instagram: getVal("#setInstagram"),
      email: getVal("#setEmail"),
      updated_at: new Date().toISOString()
    };
    Object.keys(pendingSettings).forEach(function (k) { rec[k] = pendingSettings[k]; });
    var label = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Saving…"; }
    db.from("settings").upsert(rec, { onConflict: "id" }).then(function (res) {
      if (btn) { btn.disabled = false; btn.innerHTML = label; }
      if (res.error) { alert("Could not save settings: " + res.error.message); return; }
      currentLevel = rec.level; setText("#dashLevel", currentLevel);
      pendingSettings = {};
      flash(btn, "Saved ✓");
    });
  }

  // ---------- MEDIA ----------
  var mediaLoaded = false;
  function wireMedia() {
    document.querySelectorAll('[data-view="media"]').forEach(function (b) {
      b.addEventListener("click", function () { loadMedia(); });
    });
  }
  function loadMedia() {
    var grid = document.getElementById("mediaGrid");
    if (!grid || mediaLoaded) return;
    grid.innerHTML = '<p style="color:var(--ink-faint);font-size:14px">Loading…</p>';
    db.storage.from("post-images").list("posts", { limit: 100, sortBy: { column: "created_at", order: "desc" } })
      .then(function (res) {
        if (res.error) { grid.innerHTML = '<p style="color:var(--ink-faint)">Could not load media.</p>'; return; }
        var files = (res.data || []).filter(function (f) { return f.name && !f.name.startsWith("."); });
        if (!files.length) { grid.innerHTML = '<p style="color:var(--ink-faint);font-size:14px">No images yet. Upload one when writing an entry.</p>'; return; }
        grid.innerHTML = files.map(function (f) {
          var url = db.storage.from("post-images").getPublicUrl("posts/" + f.name).data.publicUrl;
          return '<a class="media-cell" href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt=""></a>';
        }).join("");
        mediaLoaded = true;
      });
  }

  // ---------- editor toolbar (markdown) ----------
  function wireToolbar() {
    var tb = document.querySelector(".ed-toolbar");
    if (!tb) return;
    var body = document.querySelector(".ed-body");
    tb.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var t = (b.getAttribute("title") || "").toLowerCase();
        if (t === "bold") wrapSel(body, "**", "**");
        else if (t === "italic") wrapSel(body, "*", "*");
        else if (t === "heading") linePrefix(body, "## ");
        else if (t === "quote") linePrefix(body, "> ");
        else if (t === "list") linePrefix(body, "- ");
        else if (t === "link") { var u = prompt("Link URL:", "https://"); if (u) wrapSel(body, "[", "](" + u + ")"); }
        body.focus();
      });
    });
  }
  function wrapSel(ta, before, after) {
    if (!ta) return;
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    var sel = v.slice(s, e) || "Text";
    ta.value = v.slice(0, s) + before + sel + after + v.slice(e);
    ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length;
  }
  function linePrefix(ta, prefix) {
    if (!ta) return;
    var s = ta.selectionStart, v = ta.value;
    var lineStart = v.lastIndexOf("\n", s - 1) + 1;
    ta.value = v.slice(0, lineStart) + prefix + v.slice(lineStart);
    ta.selectionStart = ta.selectionEnd = s + prefix.length;
  }

  // ---------- shared upload + helpers ----------
  function uploadToBucket(file) {
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var path = "posts/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return db.storage.from("post-images").upload(path, file, { upsert: false }).then(function (res) {
      if (res.error) throw res.error;
      return db.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    });
  }
  function makeFileInput(host) {
    host.style.position = "relative";
    var input = document.createElement("input");
    input.type = "file"; input.accept = "image/png,image/jpeg,image/webp";
    input.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:5;";
    host.appendChild(input);
    return input;
  }
  function previewInto(slotOrImg, url) {
    if (!slotOrImg || !url) return;
    if (slotOrImg.tagName === "IMG") { slotOrImg.src = url; return; }
    if (slotOrImg.setAttribute) slotOrImg.setAttribute("src", url);
  }
  function flash(btn, msg) {
    if (!btn) return;
    var old = btn.innerHTML; btn.innerHTML = msg;
    setTimeout(function () { btn.innerHTML = old; }, 1400);
  }
  function getVal(sel) { var el = document.querySelector(sel); return el ? (el.value || "").trim() : ""; }
  function setVal(sel, v) { var el = document.querySelector(sel); if (el) el.value = v; }
  function selectVal(sel, v) {
    var el = document.querySelector(sel); if (!el) return;
    Array.prototype.forEach.call(el.options, function (o, i) { if (o.value === v || o.textContent === v) el.selectedIndex = i; });
  }
  function setText(sel, txt) { var el = document.querySelector(sel); if (el) el.textContent = txt; }
  function setHTML(sel, html) { var el = document.querySelector(sel); if (el) el.innerHTML = html; }
})();
