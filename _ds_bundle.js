/* @ds-bundle: {"format":3,"namespace":"GermanEntries_529ea7","components":[],"sourceHashes":{"image-slot.js":"9309434cb09c","js/admin.js":"53a36969bc74","js/auth.js":"6efed58365ea","js/public.js":"f2f0b7317bdd","js/shared.js":"25b08a571cc1","site.js":"4c44c1f46d4b","supabase-config.js":"9b109f105a42"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GermanEntries_529ea7 = window.GermanEntries_529ea7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "image-slot.js", error: String((e && e.message) || e) }); }

// js/admin.js
try { (() => {
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
  var pendingSettings = {}; // settings image URLs/nulls picked but not yet saved
  var pendingSettingsFiles = {}; // settings images picked, uploaded at save time
  var currentLevel = "A2";
  if (window.__ADMIN_SESSION) start();else document.addEventListener("admin-authed", start);
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
    db.from("posts").select("*").order("publish_at", {
      ascending: false
    }).then(function (res) {
      if (res.error) {
        console.error(res.error);
        return;
      }
      renderRows(res.data || []);
    });
  }
  function renderRows(posts) {
    var container = document.querySelector(".posts");
    if (!container) return;
    var empty = document.getElementById("postsEmpty");
    container.querySelectorAll(".post-row:not(.head)").forEach(function (r) {
      r.remove();
    });
    var ph = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>';
    posts.forEach(function (p) {
      var isPub = p.status === "published";
      var row = document.createElement("div");
      row.className = "post-row";
      row.setAttribute("data-status", isPub ? "pub" : "draft");
      row.dataset.id = p.id;
      var thumb = p.thumb_url ? '<img src="' + H.esc(p.thumb_url) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : ph;
      var badge = isPub ? '<span class="badge pub">Published</span>' : '<span class="badge draft">Draft</span>';
      var dateTxt = isPub ? H.formatDateDE(p.publish_at) : "—";
      row.innerHTML = '<div class="pr-thumb">' + thumb + "</div>" + '<div><div class="pr-title">' + H.esc(p.title) + "</div>" + '<div class="pr-cat">' + H.esc(p.category || "") + "</div></div>" + "<span>" + badge + "</span>" + '<span class="pr-date">' + dateTxt + "</span>" + '<div class="pr-actions"><button class="pr-edit">Edit</button><button class="pr-del">Delete</button></div>';
      row.querySelector(".pr-edit").addEventListener("click", function () {
        editPost(p);
      });
      row.querySelector(".pr-del").addEventListener("click", function () {
        askDelete(p);
      });
      if (empty) container.insertBefore(row, empty);else container.appendChild(row);
    });
    updateStats(posts);
    if (typeof window.filterPosts === "function") {
      window.filterPosts("all", document.querySelector('.filter-tabs .ftab[data-status="all"]'));
    }
  }
  function updateStats(posts) {
    var pub = posts.filter(function (p) {
      return p.status === "published";
    }).length;
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
      if (!deleteTargetId) {
        modal.hidden = true;
        return;
      }
      db.from("posts").delete().eq("id", deleteTargetId).then(function (res) {
        if (res.error) alert("Could not delete: " + res.error.message);
        deleteTargetId = null;
        modal.hidden = true;
        loadPosts();
      });
    };
  }

  // ---------- NEW / EDIT ----------
  function wireNewEntryButtons() {
    document.querySelectorAll('[data-view="write"]').forEach(function (b) {
      b.addEventListener("click", resetEditor);
    });
    document.querySelectorAll(".topbar .btn-primary").forEach(function (b) {
      if ((b.textContent || "").indexOf("New entry") !== -1) b.addEventListener("click", resetEditor);
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
    if (slot && slot.removeAttribute) slot.removeAttribute("src");
    setHTML("#view-write .topbar h1", "Write a <em>new entry</em>");
  }
  function editPost(p) {
    editingId = p.id;
    pendingImageFile = null;
    pendingImageExistingUrl = p.thumb_url || null;
    setVal(".ed-title", p.title || "");
    setVal(".ed-excerpt", p.excerpt || "");
    setVal(".ed-body", p.body || "");
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
      var f = input.files && input.files[0];
      if (!f) return;
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
      if (txt.indexOf("save draft") !== -1) b.addEventListener("click", function (e) {
        e.preventDefault();
        savePost("draft", b);
      });else if (txt.indexOf("publish") !== -1) b.addEventListener("click", function (e) {
        e.preventDefault();
        savePost("published", b);
      });
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
    if (!title) {
      alert("Please give your entry a title first.");
      return;
    }
    var body = getVal(".ed-body");
    var category = getVal(".ed-cat") || "Life";
    var excerpt = getVal(".ed-excerpt") || H.autoExcerpt(body);
    var label = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Saving…";
    }
    function restore() {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    }
    maybeUploadImage().then(function (thumbUrl) {
      var rec = {
        title: title,
        category: category,
        body: body,
        excerpt: excerpt,
        read_min: H.readMinutes(body),
        status: status,
        publish_at: chosenPublishAt()
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
        if (res.error) {
          alert("Could not save: " + res.error.message);
          return;
        }
        resetEditor();
        if (typeof window.showView === "function") window.showView("dash");
        loadPosts();
      });
    }).catch(function (err) {
      restore();
      alert("Image upload failed: " + (err && err.message ? err.message : err));
    });
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
      previewInto(document.getElementById("set-home-arch"), s.hero_arch_url);
      previewInto(document.getElementById("set-home-round"), s.hero_round_url);
      previewInto(document.getElementById("set-home-rug"), s.hero_rug_url);
      previewInto(document.getElementById("set-home-lemon"), s.hero_citrus_url);
      previewInto(document.getElementById("set-home-portrait"), s.portrait_url);
      previewInto(document.getElementById("set-about-main"), s.about_main_url);
      previewInto(document.getElementById("set-about-rug"), s.about_rug_url);
      previewInto(document.getElementById("set-about-lemon"), s.about_lemon_url);
      setText("#dashLevel", currentLevel);
    });
  }
  function wireSettings() {
    // image upload slots
    document.querySelectorAll(".upload-slot[data-col]").forEach(function (slotWrap) {
      var col = slotWrap.getAttribute("data-col");
      var input = makeFileInput(slotWrap);
      input.addEventListener("change", function () {
        var f = input.files && input.files[0];
        if (!f) return;
        previewInto(slotWrap.querySelector("image-slot, img"), URL.createObjectURL(f));
        // defer the actual upload to save time so a quick Save can't miss it
        pendingSettingsFiles[col] = f;
        delete pendingSettings[col];
      });
    });
    // CLEAR buttons — remove the picture, fall back to the default placeholder
    document.querySelectorAll(".sh-clear[data-clear]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var col = btn.getAttribute("data-clear");
        pendingSettings[col] = null; // null on save → cleared in DB
        delete pendingSettingsFiles[col]; // cancel any pending upload
        var card = btn.closest(".img-slot-card");
        var holder = card && card.querySelector(".upload-slot");
        if (holder) clearPreview(holder);
        flash(btn, "Cleared");
      });
    });
    // save buttons (topbar + bottom of settings)
    document.querySelectorAll("#view-settings .btn-primary").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        saveSettings(b);
      });
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
    var label = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Saving…";
    }
    function restore() {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    }

    // 1) upload every freshly-picked image FIRST, then 2) upsert the row.
    var cols = Object.keys(pendingSettingsFiles);
    var uploads = cols.map(function (col) {
      return uploadToBucket(pendingSettingsFiles[col]).then(function (url) {
        rec[col] = url;
      });
    });
    Promise.all(uploads).then(function () {
      // cleared images (null) and any already-resolved urls
      Object.keys(pendingSettings).forEach(function (k) {
        rec[k] = pendingSettings[k];
      });
      return db.from("settings").upsert(rec, {
        onConflict: "id"
      });
    }).then(function (res) {
      restore();
      if (!res || res.error) {
        alert("Could not save settings: " + (res && res.error && res.error.message || "unknown error"));
        return;
      }
      currentLevel = rec.level;
      setText("#dashLevel", currentLevel);
      pendingSettings = {};
      pendingSettingsFiles = {};
      flash(btn, "Saved ✓");
    }).catch(function (e) {
      restore();
      alert("Could not save settings: " + (e && e.message ? e.message : e));
    });
  }

  // ---------- MEDIA ----------
  var mediaLoaded = false;
  function wireMedia() {
    document.querySelectorAll('[data-view="media"]').forEach(function (b) {
      b.addEventListener("click", function () {
        loadMedia();
      });
    });
  }
  function loadMedia() {
    var grid = document.getElementById("mediaGrid");
    if (!grid || mediaLoaded) return;
    grid.innerHTML = '<p style="color:var(--ink-faint);font-size:14px">Loading…</p>';
    db.storage.from("post-images").list("posts", {
      limit: 100,
      sortBy: {
        column: "created_at",
        order: "desc"
      }
    }).then(function (res) {
      if (res.error) {
        grid.innerHTML = '<p style="color:var(--ink-faint)">Could not load media.</p>';
        return;
      }
      var files = (res.data || []).filter(function (f) {
        return f.name && !f.name.startsWith(".");
      });
      if (!files.length) {
        grid.innerHTML = '<p style="color:var(--ink-faint);font-size:14px">No images yet. Upload one when writing an entry.</p>';
        return;
      }
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
        if (t === "bold") wrapSel(body, "**", "**");else if (t === "italic") wrapSel(body, "*", "*");else if (t === "heading") linePrefix(body, "## ");else if (t === "quote") linePrefix(body, "> ");else if (t === "list") linePrefix(body, "- ");else if (t === "link") {
          var u = prompt("Link URL:", "https://");
          if (u) wrapSel(body, "[", "](" + u + ")");
        }
        body.focus();
      });
    });
  }
  function wrapSel(ta, before, after) {
    if (!ta) return;
    var s = ta.selectionStart,
      e = ta.selectionEnd,
      v = ta.value;
    var sel = v.slice(s, e) || "Text";
    ta.value = v.slice(0, s) + before + sel + after + v.slice(e);
    ta.selectionStart = s + before.length;
    ta.selectionEnd = s + before.length + sel.length;
  }
  function linePrefix(ta, prefix) {
    if (!ta) return;
    var s = ta.selectionStart,
      v = ta.value;
    var lineStart = v.lastIndexOf("\n", s - 1) + 1;
    ta.value = v.slice(0, lineStart) + prefix + v.slice(lineStart);
    ta.selectionStart = ta.selectionEnd = s + prefix.length;
  }

  // ---------- shared upload + helpers ----------
  function uploadToBucket(file) {
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var path = "posts/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return db.storage.from("post-images").upload(path, file, {
      upsert: false
    }).then(function (res) {
      if (res.error) throw res.error;
      return db.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    });
  }
  function makeFileInput(host) {
    host.style.position = "relative";
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:5;";
    host.appendChild(input);
    return input;
  }
  function previewInto(slotOrImg, url) {
    if (!slotOrImg || !url) return;
    if (slotOrImg.tagName === "IMG") {
      slotOrImg.src = url;
      return;
    }
    if (slotOrImg.setAttribute) slotOrImg.setAttribute("src", url);
  }
  // empty a settings preview back to its dashed placeholder
  function clearPreview(holder) {
    if (!holder) return;
    var img = holder.querySelector("img");
    if (img) img.remove();
    var slot = holder.querySelector("image-slot");
    if (slot) {
      slot.removeAttribute("src");
      if (typeof slot.clear === "function") {
        try {
          slot.clear();
        } catch (e) {}
      }
    }
  }
  function flash(btn, msg) {
    if (!btn) return;
    var old = btn.innerHTML;
    btn.innerHTML = msg;
    setTimeout(function () {
      btn.innerHTML = old;
    }, 1400);
  }
  function getVal(sel) {
    var el = document.querySelector(sel);
    return el ? (el.value || "").trim() : "";
  }
  function setVal(sel, v) {
    var el = document.querySelector(sel);
    if (el) el.value = v;
  }
  function selectVal(sel, v) {
    var el = document.querySelector(sel);
    if (!el) return;
    Array.prototype.forEach.call(el.options, function (o, i) {
      if (o.value === v || o.textContent === v) el.selectedIndex = i;
    });
  }
  function setText(sel, txt) {
    var el = document.querySelector(sel);
    if (el) el.textContent = txt;
  }
  function setHTML(sel, html) {
    var el = document.querySelector(sel);
    if (el) el.innerHTML = html;
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "js/admin.js", error: String((e && e.message) || e) }); }

// js/auth.js
try { (() => {
// ============================================================
//  Auth — Deutsch Entries
//  Handles: login form, admin session guard, sign-out.
//  Safe before keys are set: login shows a friendly message,
//  and the admin page stays viewable as a static preview.
// ============================================================
(function () {
  var configured = !!window.SUPABASE_CONFIGURED;
  var db = window.db;

  // ---- which page are we on? ----
  var loginForm = document.querySelector(".login-form form");
  var isAdmin = !!document.querySelector(".admin");

  // ---------- LOGIN PAGE ----------
  if (loginForm) {
    // make room for an inline message under the button (reuses page styles)
    var msg = document.createElement("p");
    msg.className = "login-note";
    msg.style.color = "var(--rug)";
    msg.style.display = "none";
    msg.style.marginTop = "16px";
    loginForm.appendChild(msg);
    function showMsg(text) {
      msg.textContent = text;
      msg.style.display = "block";
    }
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (document.getElementById("email") || {}).value || "";
      var pw = (document.getElementById("pw") || {}).value || "";
      if (!configured) {
        showMsg("The backend isn’t connected yet. Add your Supabase keys to go live — then this form signs you in for real.");
        return;
      }
      if (!email || !pw) {
        showMsg("Please enter your email and password.");
        return;
      }
      var btn = loginForm.querySelector("button[type=submit]");
      var label = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = "Signing in…";
      }
      db.auth.signInWithPassword({
        email: email,
        password: pw
      }).then(function (res) {
        if (res.error) {
          showMsg("That didn’t work: " + res.error.message);
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = label;
          }
          return;
        }
        window.location.href = "admin.html";
      }).catch(function (err) {
        showMsg("Connection problem: " + (err && err.message ? err.message : err));
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = label;
        }
      });
    });
  }

  // ---------- ADMIN PAGE: session guard + sign-out ----------
  if (isAdmin) {
    // Wire every "Sign out" link.
    document.querySelectorAll('a[href="login.html"]').forEach(function (a) {
      if ((a.textContent || "").toLowerCase().indexOf("sign out") !== -1) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          if (configured && db) {
            db.auth.signOut().then(function () {
              window.location.href = "login.html";
            });
          } else {
            window.location.href = "login.html";
          }
        });
      }
    });

    // Guard: if keys are set but nobody is logged in, bounce to login.
    // (Before keys are set we leave the admin viewable as a design preview.)
    if (configured && db) {
      db.auth.getSession().then(function (res) {
        var session = res && res.data ? res.data.session : null;
        if (!session) {
          window.location.replace("login.html");
        } else {
          window.__ADMIN_SESSION = session;
          document.dispatchEvent(new CustomEvent("admin-authed"));
        }
      });
    }
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "js/auth.js", error: String((e && e.message) || e) }); }

// js/public.js
try { (() => {
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
  if (isPost) renderPost();else if (isArchive) renderArchive();else if (isAbout) renderAbout();else if (isHome) renderHome();else reveal();
  function fetchPublished(limit) {
    var q = db.from("posts").select("*").eq("status", "published").lte("publish_at", new Date().toISOString()).order("publish_at", {
      ascending: false
    });
    if (limit) q = q.limit(limit);
    return q;
  }
  function readLabel(min) {
    return (min || 1) + " Min.";
  }

  // ---------- SETTINGS (hero images, level, portrait) ----------
  // On public pages, image-slots must NEVER be interactive — a visitor
  // could otherwise drag their own image in. So every hero slot is
  // replaced with either the real settings image or a static (non-
  // draggable) placeholder.
  function applySettings(s) {
    s = s || {};
    // home hero collage
    fillOrBlank(document.getElementById("hero-arch"), s.hero_arch_url);
    fillOrBlank(document.getElementById("hero-round"), s.hero_round_url);
    fillOrBlank(document.getElementById("hero-rug"), s.hero_rug_url);
    fillOrBlank(document.getElementById("hero-lemon"), s.hero_citrus_url);
    // about-page collage — its own columns now
    fillOrBlank(document.getElementById("about-main"), s.about_main_url);
    fillOrBlank(document.getElementById("about-rug"), s.about_rug_url);
    fillOrBlank(document.getElementById("about-citrus"), s.about_lemon_url);
    // portrait(s)
    document.querySelectorAll("#author-portrait").forEach(function (el) {
      fillOrBlank(el, s.portrait_url);
    });
    if (s.level) setText(document, "#statLevel", s.level);

    // DEFENSIVE SWEEP: a public page must never contain an interactive
    // image-slot (a visitor could otherwise drag in their own image).
    // Replace every remaining slot with a static placeholder — but skip
    // CONTENT slots, which the page's own render function fills with the
    // post's real thumbnail.
    sweepRemainingSlots();
  }
  function sweepRemainingSlots() {
    document.querySelectorAll("image-slot").forEach(function (slot) {
      // these are filled by renderHome / renderPost with the real thumb
      if (slot.closest(".f-img, .post-hero, .thumb")) return;
      slot.replaceWith(placeholderEl());
    });
  }

  // non-interactive placeholder (subtle striped fill, no drag target)
  function placeholderEl() {
    var d = document.createElement("div");
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = "width:100%;height:100%;display:block;" + "background:repeating-linear-gradient(135deg,#ece0cb,#ece0cb 11px,#e6d8c0 11px,#e6d8c0 22px);";
    return d;
  }
  function imgEl(url) {
    var img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    return img;
  }
  // replace a slot with a real image if we have one, else a static placeholder
  function fillOrBlank(slot, url) {
    if (!slot) return;
    slot.replaceWith(url ? imgEl(url) : placeholderEl());
  }
  function lockImage(slot, url) {
    fillOrBlank(slot, url);
  }

  // ---------------- HOME ----------------
  function renderHome() {
    fetchPublished(7).then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        reveal();
        return;
      }
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
        if (imgA) {
          imgA.setAttribute("href", link);
          fillOrBlank(imgA.querySelector("image-slot"), featured.thumb_url);
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
      var grid = document.querySelector(".grid-3");
      if (grid) {
        if (rest.length) {
          grid.innerHTML = rest.map(function (p) {
            return cardHTML(p);
          }).join("");
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
      if (res.error || !res.data || !res.data.length) {
        reveal();
        return;
      }
      var posts = res.data;
      var heights = ["h-tall", "h-mid", "h-short"];
      var masonry = document.querySelector(".masonry");
      if (masonry) {
        masonry.innerHTML = posts.map(function (p, i) {
          return cardHTML(p, heights[i % heights.length]);
        }).join("");
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
    var thumb = p.thumb_url ? '<img src="' + H.esc(p.thumb_url) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '<div aria-hidden="true" style="width:100%;height:100%;background:repeating-linear-gradient(135deg,#ece0cb,#ece0cb 11px,#e6d8c0 11px,#e6d8c0 22px)"></div>';
    return '<a href="' + link + '" class="' + cls + '" data-cat="' + H.esc(H.catKey(p.category)) + '">' + '<div class="thumb"><span class="cat">' + H.esc(p.category || "") + "</span>" + thumb + "</div>" + '<div class="meta"><span>' + H.formatDateDE(p.publish_at) + "</span>·" + '<span class="de">' + readLabel(p.read_min) + "</span></div>" + "<h3>" + H.esc(p.title) + "</h3>" + '<p class="excerpt">' + H.esc(p.excerpt || H.autoExcerpt(p.body)) + "</p>" + '<span class="read">Weiterlesen →</span></a>';
  }
  function hydrate(scope) {/* images already inlined as <img> */}
  function setSlot(slot, url) {
    fillOrBlank(slot, url);
  }

  // ---------------- SINGLE POST ----------------
  function renderPost() {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) {
      reveal();
      return;
    } // direct sample view

    db.from("posts").select("*").eq("slug", slug).eq("status", "published").limit(1).then(function (res) {
      if (res.error) {
        reveal();
        return;
      }
      var p = res.data && res.data[0];
      if (!p) {
        window.location.replace("404.html");
        return;
      }
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
      var posts = res && res.data || [];
      // A "journey" needs a few entries — until then, hide the section
      // rather than show a single milestone that looks like filler.
      if (res.error || posts.length < 2) {
        var sec = box.closest("section");
        if (sec) sec.style.display = "none";else box.style.display = "none";
        return;
      }
      var asc = posts.slice().reverse(); // oldest → newest
      var picks = [];
      picks.push({
        p: asc[0],
        head: "The beginning"
      });
      if (asc.length > 2) picks.push({
        p: asc[Math.floor(asc.length / 2)],
        head: "Finding a rhythm"
      });
      picks.push({
        p: asc[asc.length - 1],
        head: "Where I am now"
      });
      box.innerHTML = picks.map(function (it) {
        var d = new Date(it.p.publish_at);
        var year = d.getFullYear();
        var mon = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][d.getMonth()];
        return '<div class="tl-item">' + '<div class="tl-when">' + year + "<small>" + mon + "</small></div>" + '<div class="tl-body"><h4>' + H.esc(it.head) + "</h4>" + "<p>" + H.esc(it.p.title) + "</p></div>" + "</div>";
      }).join("");
    });
  }

  // ---------- helpers ----------
  function setText(scope, sel, txt) {
    var e = scope.querySelector(sel);
    if (e) e.textContent = txt;
  }
  function setHTML(scope, sel, html) {
    var e = scope.querySelector(sel);
    if (e) e.innerHTML = html;
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "js/public.js", error: String((e && e.message) || e) }); }

// js/shared.js
try { (() => {
// ============================================================
//  Shared helpers — Deutsch Entries
//  Used by admin.js and public.js.
// ============================================================
(function () {
  var MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  // "14. Juni 2026"
  function formatDateDE(value) {
    if (!value) return "—";
    var d = new Date(value);
    if (isNaN(d)) return "—";
    return d.getDate() + ". " + MONTHS_DE[d.getMonth()] + " " + d.getFullYear();
  }

  // umlaut-safe URL slug
  function slugify(title) {
    return (title || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "eintrag";
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
    return (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function catKey(cat) {
    return (cat || "").toLowerCase().trim();
  }

  // ---- time since first entry → friendly "X days/months in" ----
  function timeSince(dateStr) {
    if (!dateStr) return {
      n: 0,
      label: "Days in"
    };
    var start = new Date(dateStr),
      now = new Date();
    var days = Math.max(0, Math.floor((now - start) / 86400000));
    if (days < 31) return {
      n: days,
      label: days === 1 ? "Day in" : "Days in"
    };
    var months = Math.floor(days / 30.4);
    if (months < 24) return {
      n: months,
      label: months === 1 ? "Month in" : "Months in"
    };
    return {
      n: Math.floor(months / 12),
      label: "Years in"
    };
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
      var lines = block.split("\n").filter(function (l) {
        return l.trim() !== "";
      });
      if (!lines.length) return;
      if (lines.every(function (l) {
        return /^\s*-\s+/.test(l);
      })) {
        out.push("<ul>" + lines.map(function (l) {
          return "<li>" + mdInline(esc(l.replace(/^\s*-\s+/, ""))) + "</li>";
        }).join("") + "</ul>");
      } else if (/^\s*>\s+/.test(lines[0])) {
        var q = lines.map(function (l) {
          return esc(l.replace(/^\s*>\s?/, ""));
        }).join(" ");
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
    _settingsPromise = db.from("settings").select("*").eq("id", 1).limit(1).then(function (res) {
      if (res.error) {
        return null;
      } // table may not exist yet — fail soft
      return res.data && res.data[0] || null;
    }).catch(function () {
      return null;
    });
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
})(); } catch (e) { __ds_ns.__errors.push({ path: "js/shared.js", error: String((e && e.message) || e) }); }

// site.js
try { (() => {
// shared: mobile nav toggle
document.addEventListener('click', function (e) {
  var t = e.target.closest('.nav-toggle');
  if (t) {
    var panel = document.querySelector('.mobile-menu');
    if (panel) panel.classList.toggle('open');
  }
  if (e.target.classList && e.target.classList.contains('mobile-menu')) {
    e.target.classList.remove('open');
  }
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "site.js", error: String((e && e.message) || e) }); }

// supabase-config.js
try { (() => {
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
  var looksFilled = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.indexOf("PASTE_") === -1 && SUPABASE_ANON_KEY.indexOf("PASTE_") === -1 && /^https:\/\/.+\.supabase\.co/.test(SUPABASE_URL);

  // Is the Supabase SDK present on the page?
  var sdkReady = !!(window.supabase && window.supabase.createClient);
  window.SUPABASE_CONFIGURED = !!(looksFilled && sdkReady);
  if (window.SUPABASE_CONFIGURED) {
    window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    window.db = null;
    if (!looksFilled) {
      console.info("[Deutsch Entries] Supabase keys not set yet — the site is showing its built-in sample content. " + "Paste your Project URL + anon key into supabase-config.js to go live.");
    } else if (!sdkReady) {
      console.warn("[Deutsch Entries] Supabase SDK not loaded. Make sure the @supabase/supabase-js script tag is above supabase-config.js.");
    }
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "supabase-config.js", error: String((e && e.message) || e) }); }

})();
