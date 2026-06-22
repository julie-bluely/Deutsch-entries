// ============================================================
//  Admin — Deutsch Entries
//  Loads real posts, wires create / edit / delete / publish /
//  schedule / image upload. Falls back to the built-in sample
//  rows when Supabase keys aren't set yet (design preview).
// ============================================================
(function () {
  if (!document.querySelector(".admin")) return;          // not the admin page
  if (!window.SUPABASE_CONFIGURED || !window.db) return;   // keep sample UI as-is
  var db = window.db;
  var H = window.DE;

  var editingId = null;          // null = writing a new post
  var pendingImageFile = null;   // a freshly picked image not yet uploaded
  var pendingImageExistingUrl = null; // thumb already on the post being edited

  // run once the session guard confirms we're logged in
  if (window.__ADMIN_SESSION) start();
  else document.addEventListener("admin-authed", start);

  function start() {
    overlayUploader();
    wireEditorButtons();
    wireNewEntryButtons();
    wireDeleteModal();
    wireStatusSegment();
    loadPosts();
  }

  // ---------- LOAD + RENDER THE DASHBOARD LIST ----------
  function loadPosts() {
    db.from("posts").select("*").order("publish_at", { ascending: false }).then(function (res) {
      if (res.error) { console.error(res.error); return; }
      renderRows(res.data || []);
    });
  }

  function renderRows(posts) {
    var container = document.querySelector(".posts");
    if (!container) return;
    var head = container.querySelector(".post-row.head");
    var empty = document.getElementById("postsEmpty");

    // remove existing data rows (keep header + empty state)
    container.querySelectorAll(".post-row:not(.head)").forEach(function (r) { r.remove(); });

    var placeholderSvg =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>';

    posts.forEach(function (p) {
      var isPub = p.status === "published";
      var row = document.createElement("div");
      row.className = "post-row";
      row.setAttribute("data-status", isPub ? "pub" : "draft");
      row.dataset.id = p.id;

      var thumb = p.thumb_url
        ? '<img src="' + H.esc(p.thumb_url) + '" alt="" style="width:100%;height:100%;object-fit:cover">'
        : placeholderSvg;

      var badge = isPub
        ? '<span class="badge pub">Published</span>'
        : '<span class="badge draft">Draft</span>';

      var dateTxt = isPub ? H.formatDateDE(p.publish_at) : "—";

      row.innerHTML =
        '<div class="pr-thumb">' + thumb + "</div>" +
        '<div><div class="pr-title">' + H.esc(p.title) + "</div>" +
        '<div class="pr-cat">' + H.esc(p.category || "") + "</div></div>" +
        "<span>" + badge + "</span>" +
        '<span class="pr-date">' + dateTxt + "</span>" +
        '<div class="pr-actions">' +
        '<button class="pr-edit">Edit</button>' +
        '<button class="pr-del">Delete</button></div>';

      row.querySelector(".pr-edit").addEventListener("click", function () { editPost(p); });
      row.querySelector(".pr-del").addEventListener("click", function () { askDelete(p); });

      if (empty) container.insertBefore(row, empty);
      else container.appendChild(row);
    });

    updateStats(posts);

    // reset the All/Published/Drafts filter to "All"
    if (typeof window.filterPosts === "function") {
      var allTab = document.querySelector('.filter-tabs .ftab[data-status="all"]');
      window.filterPosts("all", allTab);
    }
  }

  function updateStats(posts) {
    var pub = posts.filter(function (p) { return p.status === "published"; }).length;
    var draft = posts.length - pub;
    var cards = document.querySelectorAll(".stats .stat-card .n");
    if (cards[0]) cards[0].textContent = pub;
    if (cards[1]) cards[1].textContent = draft;
  }

  // ---------- DELETE (reuses the existing #delModal) ----------
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
    if (confirmBtn) {
      confirmBtn.onclick = function () {
        if (!deleteTargetId) { modal.hidden = true; return; }
        db.from("posts").delete().eq("id", deleteTargetId).then(function (res) {
          if (res.error) { alert("Could not delete: " + res.error.message); }
          deleteTargetId = null;
          modal.hidden = true;
          loadPosts();
        });
      };
    }
  }

  // ---------- NEW ENTRY ----------
  function wireNewEntryButtons() {
    // sidebar "New entry" + topbar "+ New entry"
    document.querySelectorAll('[data-view="write"]').forEach(function (b) {
      b.addEventListener("click", resetEditor);
    });
    document.querySelectorAll(".topbar .btn-primary").forEach(function (b) {
      if ((b.textContent || "").indexOf("New entry") !== -1) {
        b.addEventListener("click", resetEditor);
      }
    });
  }

  function resetEditor() {
    editingId = null;
    pendingImageFile = null;
    pendingImageExistingUrl = null;
    setVal(".ed-title", "");
    setVal(".ed-excerpt", "");
    setVal(".ed-body", "");
    var cat = document.querySelector(".ed-cat");
    if (cat) cat.selectedIndex = 0;
    var slot = document.getElementById("editor-featured");
    if (slot) slot.removeAttribute("src");
    var titleEl = document.querySelector("#view-write .topbar h1");
    if (titleEl) titleEl.innerHTML = "Write a <em>new entry</em>";
  }

  // ---------- EDIT ----------
  function editPost(p) {
    editingId = p.id;
    pendingImageFile = null;
    pendingImageExistingUrl = p.thumb_url || null;
    setVal(".ed-title", p.title || "");
    setVal(".ed-excerpt", p.excerpt || "");
    setVal(".ed-body", p.body || "");
    var cat = document.querySelector(".ed-cat");
    if (cat) {
      Array.prototype.forEach.call(cat.options, function (o, i) {
        if (o.value === p.category || o.textContent === p.category) cat.selectedIndex = i;
      });
    }
    var slot = document.getElementById("editor-featured");
    if (slot) {
      if (p.thumb_url) slot.setAttribute("src", p.thumb_url);
      else slot.removeAttribute("src");
    }
    var titleEl = document.querySelector("#view-write .topbar h1");
    if (titleEl) titleEl.innerHTML = "Edit <em>entry</em>";
    if (typeof window.showView === "function") window.showView("write");
  }

  // ---------- IMAGE UPLOAD OVERLAY ----------
  // <image-slot> is read-only outside the design tool, so we lay a real
  // file input over the dropzone and preview via the slot's src attribute.
  function overlayUploader() {
    var zone = document.querySelector(".dropzone");
    if (!zone) return;
    zone.style.position = "relative";
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:5;";
    zone.appendChild(input);
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f) return;
      pendingImageFile = f;
      var url = URL.createObjectURL(f);
      var slot = document.getElementById("editor-featured");
      if (slot) slot.setAttribute("src", url);
    });
  }

  function thumbnailToggleOn() {
    var sw = document.querySelector(".thumb-toggle .switch");
    return sw ? sw.classList.contains("on") : true;
  }

  // ---------- STATUS SEGMENT (Draft / Live) ----------
  function wireStatusSegment() {
    var seg = document.querySelector(".rail-box .seg");
    if (!seg) return;
    seg.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
    });
  }

  // ---------- PUBLISH / SAVE DRAFT ----------
  function wireEditorButtons() {
    var write = document.getElementById("view-write");
    if (!write) return;
    write.querySelectorAll("button").forEach(function (b) {
      var txt = (b.textContent || "").trim().toLowerCase();
      if (txt.indexOf("save draft") !== -1) {
        b.addEventListener("click", function (e) { e.preventDefault(); savePost("draft", b); });
      } else if (txt.indexOf("publish") !== -1) {
        b.addEventListener("click", function (e) { e.preventDefault(); savePost("published", b); });
      }
    });
  }

  function getVal(sel) {
    var el = document.querySelector(sel);
    return el ? (el.value || "").trim() : "";
  }
  function setVal(sel, v) {
    var el = document.querySelector(sel);
    if (el) el.value = v;
  }

  function chosenPublishAt() {
    var schedSwitch = document.querySelector(".sched-toggle .switch");
    var on = schedSwitch && schedSwitch.classList.contains("on");
    var input = document.getElementById("schedInput");
    if (on && input && input.value) return new Date(input.value).toISOString();
    return new Date().toISOString();
  }

  function savePost(status, btn) {
    var title = getVal(".ed-title");
    if (!title) { alert("Please give your entry a title first."); return; }
    var body = getVal(".ed-body");
    var category = getVal(".ed-cat") || "Leben";
    var excerpt = getVal(".ed-excerpt") || H.autoExcerpt(body);

    var label = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Saving…"; }

    function restore() { if (btn) { btn.disabled = false; btn.innerHTML = label; } }

    maybeUploadImage().then(function (thumbUrl) {
      var record = {
        title: title,
        slug: H.slugify(title) + "-" + Date.now().toString(36),
        category: category,
        body: body,
        excerpt: excerpt,
        read_min: H.readMinutes(body),
        status: status,
        publish_at: chosenPublishAt()
      };
      if (thumbUrl) record.thumb_url = thumbUrl;

      var op;
      if (editingId) {
        // don't regenerate slug on edit; keep image if none re-picked
        delete record.slug;
        if (!thumbUrl && pendingImageExistingUrl) record.thumb_url = pendingImageExistingUrl;
        op = db.from("posts").update(record).eq("id", editingId);
      } else {
        op = db.from("posts").insert(record);
      }

      op.then(function (res) {
        restore();
        if (res.error) { alert("Could not save: " + res.error.message); return; }
        resetEditor();
        if (typeof window.showView === "function") window.showView("dash");
        loadPosts();
      });
    }).catch(function (err) {
      restore();
      alert("Image upload failed: " + (err && err.message ? err.message : err));
    });
  }

  // returns a Promise<string|null> with the public thumb URL
  function maybeUploadImage() {
    if (!pendingImageFile || !thumbnailToggleOn()) return Promise.resolve(null);
    var f = pendingImageFile;
    var ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    var path = "posts/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return db.storage.from("post-images").upload(path, f, { upsert: false }).then(function (res) {
      if (res.error) throw res.error;
      var pub = db.storage.from("post-images").getPublicUrl(path);
      return pub.data.publicUrl;
    });
  }
})();
