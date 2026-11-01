/* ==========================================================================
   Duck — UI/UX prototype
   Every screen, panel and flow is clickable. Content is mock data, and drawing
   is a simple preview. The real animation engine is built in the next phase.
   ========================================================================== */
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const COLORS = ['#1d1d1f', '#ffffff', '#ff4f7b', '#ff8a3d', '#ffc93c', '#34c77b', '#2f9bff', '#7b5cff', '#8d5a3b'];
  const BGS = [
    { c: '#fbfaf7', name: 'Paper' }, { c: '#ffffff', name: 'White' }, { c: '#eaf4ff', name: 'Sky' },
    { c: '#fff4d6', name: 'Cream' }, { c: '#222428', name: 'Night' }, { c: 'transparent', name: 'Transparent' },
  ];
  const SIZE_RANGES = { brush: [1, 80], eraser: [4, 160], text: [12, 200] };
  const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17.6 17.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const PLAY = '<path d="M7 4.5l13 7.5-13 7.5z"/>';
  const PAUSE = '<rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/>';
  const DOTS = '<svg viewBox="0 0 24 24" class="filled"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';

  /* ───────────────────────── Mock artwork: a walking duck ───────────────────────── */
  function drawDuck(g, W, H, t, color = '#1d1d1f') {
    const s = Math.min(W, H) / 720;
    const x = W * (0.25 + 0.5 * ((t % 12) / 11));
    const bob = Math.sin(t / 12 * Math.PI * 4) * 8 * s;
    const y = H * 0.56 + bob;
    g.save();
    g.lineWidth = 6 * s; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = color;
    g.beginPath(); g.ellipse(x, y, 120 * s, 72 * s, 0, 0, Math.PI * 2); g.stroke();          // body
    g.beginPath(); g.moveTo(x - 115 * s, y - 20 * s); g.lineTo(x - 160 * s, y - 55 * s); g.lineTo(x - 120 * s, y - 2 * s); g.stroke(); // tail
    g.beginPath(); g.arc(x + 110 * s, y - 100 * s, 50 * s, 0, Math.PI * 2); g.stroke();       // head
    g.beginPath(); g.moveTo(x + 155 * s, y - 110 * s); g.quadraticCurveTo(x + 215 * s, y - 105 * s, x + 158 * s, y - 85 * s); g.stroke(); // beak
    g.fillStyle = color; g.beginPath(); g.arc(x + 122 * s, y - 112 * s, 6 * s, 0, Math.PI * 2); g.fill(); // eye
    g.beginPath(); g.moveTo(x - 40 * s, y - 5 * s); g.quadraticCurveTo(x + 10 * s, y + 40 * s, x + 50 * s, y); g.stroke(); // wing
    const step = Math.sin(t / 12 * Math.PI * 4) * 30 * s;
    [[-25, step], [25, -step]].forEach(([ox, d]) => {                                          // legs
      g.beginPath(); g.moveTo(x + ox * s, y + 68 * s); g.lineTo(x + ox * s + d, y + 140 * s); g.lineTo(x + ox * s + d + 30 * s, y + 140 * s); g.stroke();
    });
    g.restore();
    // ground line
    g.save(); g.strokeStyle = color; g.globalAlpha = .35; g.lineWidth = 3 * s;
    g.beginPath(); g.moveTo(W * 0.06, H * 0.56 + 150 * s); g.lineTo(W * 0.94, H * 0.56 + 150 * s); g.stroke(); g.restore();
  }

  /* ───────────────────────── State ───────────────────────── */
  const projects = [
    { id: 'p1', name: 'Duck walk cycle', frames: 12, fps: 12, updated: 'Edited 2 min ago', bg: '#fbfaf7', size: [1280, 720] },
    { id: 'p2', name: 'Bouncing ball', frames: 8, fps: 10, updated: 'Edited yesterday', bg: '#eaf4ff', size: [1280, 720] },
    { id: 'p3', name: 'Logo sting', frames: 24, fps: 24, updated: 'Edited 3 days ago', bg: '#fff4d6', size: [1280, 720] },
    { id: 'p4', name: 'Night pond', frames: 16, fps: 12, updated: 'Edited last week', bg: '#222428', size: [1280, 720] },
  ];

  const S = {
    project: null,
    W: 1280, H: 720, bg: '#fbfaf7', fps: 12,
    frames: [], cur: 0,
    layers: [], layer: 0,
    tool: 'brush', color: '#1d1d1f', sizes: { brush: 6, eraser: 30, text: 56 }, opacity: 100, tolerance: 40,
    onion: true, loop: true, playing: false, playFrom: 0, raf: 0,
    undo: [], redo: [], clip: null, audio: null,
    newSize: [1280, 720], newBg: '#fbfaf7', exportFormat: 'video',
  };

  /* ───────────────────────── Elements ───────────────────────── */
  const studioScreen = $('#studioScreen'), app = $('#app');
  const stage = $('#stage'), g = stage.getContext('2d');
  const overlay = $('#overlay'), og = overlay.getContext('2d');
  const box = $('#canvasBox'), wrap = $('#stageWrap'), dock = $('#dock');
  const framesEl = $('#frames');

  /* ───────────────────────── Toast & progress ───────────────────────── */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }
  async function fakeProgress(text, ms = 1400) {
    $('#progressText').textContent = text; $('#progressBar').style.width = '0%';
    openModal('progressModal');
    const t0 = performance.now();
    await new Promise(res => {
      const step = now => {
        const p = clamp((now - t0) / ms, 0, 1);
        $('#progressBar').style.width = (p * 100) + '%';
        p < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
    closeModal('progressModal');
  }

  /* ───────────────────────── Popovers ───────────────────────── */
  let openPopEl = null, openPopAnchor = null;
  function openPop(pop, anchor, place = 'below') {
    if (openPopEl === pop && openPopAnchor === anchor) { closePops(); return; }
    closePops();
    pop.classList.remove('hidden');
    const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    let left = clamp(r.left + r.width / 2 - pr.width / 2, 8, innerWidth - pr.width - 8);
    let top = place === 'above' ? r.top - pr.height - 10 : r.bottom + 8;
    if (top < 8) top = r.bottom + 8;
    if (top + pr.height > innerHeight - 8) top = Math.max(8, r.top - pr.height - 10);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    openPopEl = pop; openPopAnchor = anchor;
  }
  function closePops() {
    $$('.pop').forEach(p => p.classList.add('hidden'));
    openPopEl = openPopAnchor = null;
  }
  document.addEventListener('pointerdown', e => {
    if (openPopEl && !openPopEl.contains(e.target) && !e.target.closest('[data-pop-anchor]')) closePops();
  }, true);

  /* ───────────────────────── Modals ───────────────────────── */
  function openModal(id) { closePops(); $('#' + id).classList.remove('hidden'); }
  function closeModal(id) { $('#' + id).classList.add('hidden'); }
  $$('.modal').forEach(m => {
    m.addEventListener('click', e => {
      if ((e.target === m && m.id !== 'progressModal') || e.target.closest('[data-close]')) m.classList.add('hidden');
    });
  });

  /* ==========================================================================
     STUDIO (home)
     ========================================================================== */
  function renderStudio() {
    const grid = $('#studioGrid'); grid.innerHTML = '';
    const nw = document.createElement('button');
    nw.className = 'card new';
    nw.innerHTML = '<span class="plus"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>New animation';
    nw.onclick = openNewModal;
    grid.append(nw);

    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card'; card.tabIndex = 0; card.setAttribute('role', 'button');
      const c = document.createElement('canvas'); c.width = 320; c.height = 180;
      const cg = c.getContext('2d');
      cg.fillStyle = p.bg; cg.fillRect(0, 0, 320, 180);
      drawDuck(cg, 320, 180, p.frames % 12, p.bg === '#222428' ? '#f2f2f4' : '#1d1d1f');
      card.innerHTML = `<span class="pill-frames">${p.frames} frames</span>`;
      card.prepend(c);
      const info = document.createElement('div'); info.className = 'card-info';
      info.innerHTML = `<div class="card-name"></div><div class="card-meta">${p.updated}</div>`;
      info.firstChild.textContent = p.name;
      card.append(info);
      const more = document.createElement('button');
      more.className = 'card-more'; more.dataset.popAnchor = ''; more.innerHTML = DOTS; more.setAttribute('aria-label', 'Project options');
      more.onclick = e => { e.stopPropagation(); openCardMenu(more, p); };
      card.append(more);
      card.onclick = () => openEditor(p);
      card.onkeydown = e => { if (e.key === 'Enter') openEditor(p); };
      grid.append(card);
    });
  }

  let cardPop;
  function openCardMenu(anchor, p) {
    if (!cardPop) { cardPop = document.createElement('div'); cardPop.className = 'pop hidden'; document.body.append(cardPop); }
    cardPop.innerHTML = '';
    const items = [
      ['Open', () => openEditor(p)],
      ['Rename', () => { const n = prompt('Rename animation', p.name); if (n && n.trim()) { p.name = n.trim(); renderStudio(); } }],
      ['Duplicate', () => { projects.unshift({ ...p, id: 'p' + Date.now(), name: p.name + ' copy', updated: 'Just now' }); renderStudio(); toast('Duplicated'); }],
      ['Delete', () => { if (confirm(`Delete “${p.name}”? This can’t be undone.`)) { projects.splice(projects.indexOf(p), 1); renderStudio(); toast('Deleted'); } }, 'danger'],
    ];
    items.forEach(([label, fn, cls]) => {
      const b = document.createElement('button'); b.className = 'item' + (cls ? ' ' + cls : ''); b.textContent = label;
      b.onclick = () => { closePops(); fn(); };
      cardPop.append(b);
    });
    openPop(cardPop, anchor);
  }

  $('#btnNew').onclick = openNewModal;
  $('#btnStudioHelp').onclick = () => openModal('helpModal');
  $$('.studio-tabs .tab').forEach(t => t.onclick = () => {
    $$('.studio-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
  });

  /* ───── New animation sheet ───── */
  function buildBgSwatches(el, current, onPick) {
    el.innerHTML = '';
    BGS.forEach(b => {
      const s = document.createElement('button');
      s.className = 'bg-swatch' + (b.c === 'transparent' ? ' transparent' : '') + (b.c === current ? ' active' : '');
      if (b.c !== 'transparent') s.style.background = b.c;
      s.title = b.name; s.setAttribute('aria-label', b.name);
      s.onclick = () => { onPick(b.c); buildBgSwatches(el, b.c, onPick); };
      el.append(s);
    });
  }
  function openNewModal() {
    $('#newName').value = '';
    S.newSize = [1280, 720]; S.newBg = '#fbfaf7';
    $$('#sizeCards .size-card').forEach((c, i) => c.classList.toggle('active', i === 0));
    buildBgSwatches($('#newBgSwatches'), S.newBg, c => S.newBg = c);
    $('#newFps').value = 12; $('#newFpsVal').textContent = '12 fps';
    openModal('newModal');
    setTimeout(() => $('#newName').focus(), 50);
  }
  $$('#sizeCards .size-card').forEach(c => c.onclick = () => {
    $$('#sizeCards .size-card').forEach(x => x.classList.toggle('active', x === c));
    S.newSize = c.dataset.size.split('x').map(Number);
  });
  $('#newFps').oninput = e => $('#newFpsVal').textContent = e.target.value + ' fps';
  $('#btnCreate').onclick = () => {
    const p = {
      id: 'p' + Date.now(), name: $('#newName').value.trim() || 'Untitled animation',
      frames: 1, fps: +$('#newFps').value, updated: 'Just now', bg: S.newBg, size: S.newSize, blank: true,
    };
    projects.unshift(p);
    closeModal('newModal');
    openEditor(p);
  };

  /* ==========================================================================
     EDITOR
     ========================================================================== */
  function openEditor(p) {
    S.project = p;
    [S.W, S.H] = p.size; S.bg = p.bg; S.fps = p.fps;
    stage.width = overlay.width = S.W; stage.height = overlay.height = S.H;
    S.frames = Array.from({ length: p.frames }, (_, i) => ({ pose: p.blank ? null : i, strokes: [] }));
    S.layers = p.blank
      ? [{ name: 'Layer 1', visible: true, opacity: 100 }]
      : [{ name: 'Background', visible: true, opacity: 100 }, { name: 'Duck', visible: true, opacity: 100 }];
    S.layer = S.layers.length - 1; S.cur = 0; S.undo = []; S.redo = [];
    $('#projName').textContent = p.name;
    $('#canvasInfo').textContent = `Canvas: ${S.W} × ${S.H}`;
    studioScreen.classList.add('hidden'); app.classList.remove('hidden');
    resetDock();
    setTool(S.tool);
    buildTimeline(); syncLayerBtn(); syncButtons(); syncAudio();
    requestAnimationFrame(() => { fit(); render(); });
    if (p.blank) toast('Draw something, then tap ＋ to add the next frame');
  }
  function closeEditor() {
    if (S.playing) stopPlay();
    closePops();
    app.classList.add('hidden'); studioScreen.classList.remove('hidden');
    if (S.project) { S.project.frames = S.frames.length; S.project.updated = 'Just now'; S.project.blank = false; }
    renderStudio();
  }
  $('#btnClose').onclick = closeEditor;
  $('#btnStudio').onclick = closeEditor;

  /* ───── Layout: fit canvas into the stage area ───── */
  function fit() {
    if (app.classList.contains('hidden')) return;
    const r = wrap.getBoundingClientRect();
    const dr = dock.getBoundingClientRect();
    let top = dock.classList.contains('dragged') ? 16 : dr.bottom - r.top + 14;
    let availH = r.height - top - 16;
    if (availH < 160) { top = 12; availH = r.height - 24; }
    const availW = r.width - 24;
    const w = Math.min(availW, availH * S.W / S.H), h = w * S.H / S.W;
    Object.assign(box.style, { width: w + 'px', height: h + 'px', left: (r.width - w) / 2 + 'px', top: top + (availH - h) / 2 + 'px' });
    box.style.background = S.bg === 'transparent' ? '' : S.bg;
    box.classList.toggle('transparent', S.bg === 'transparent');
  }
  addEventListener('resize', fit);

  /* ───── Rendering (mock) ───── */
  function inkFor(bg) { return bg === '#222428' ? '#f2f2f4' : '#1d1d1f'; }
  function drawFrame(ctx, i, W, H, opts = {}) {
    const f = S.frames[i];
    if (!opts.noBg) {
      if (S.bg === 'transparent') ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = S.bg; ctx.fillRect(0, 0, W, H); }
    }
    if (f.pose !== null && S.layers.some(l => l.name === 'Duck' && l.visible)) drawDuck(ctx, W, H, f.pose, opts.tint || inkFor(S.bg));
    const sx = W / S.W;
    f.strokes.forEach(st => {
      ctx.save(); ctx.scale(sx, sx);
      ctx.globalAlpha = st.opacity / 100;
      ctx.strokeStyle = opts.tint || st.color; ctx.lineWidth = st.size; ctx.lineCap = ctx.lineJoin = 'round';
      if (st.erase) { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; }
      ctx.beginPath(); st.pts.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y + .01));
      if (st.pts.length === 1) ctx.lineTo(st.pts[0].x + .01, st.pts[0].y);
      ctx.stroke(); ctx.restore();
    });
  }
  function render() {
    const W = S.W, H = S.H;
    if (S.bg === 'transparent') g.clearRect(0, 0, W, H); else { g.fillStyle = S.bg; g.fillRect(0, 0, W, H); }
    if (S.onion && !S.playing) {
      if (S.cur > 0) { g.save(); g.globalAlpha = .28; drawFrame(g, S.cur - 1, W, H, { noBg: true, tint: '#ff3b6b' }); g.restore(); }
      if (S.cur < S.frames.length - 1) { g.save(); g.globalAlpha = .16; drawFrame(g, S.cur + 1, W, H, { noBg: true, tint: '#2f9bff' }); g.restore(); }
    }
    drawFrame(g, S.cur, W, H, { noBg: true });
    drawOverlay();
  }
  let hover = null;
  function drawOverlay() {
    og.clearRect(0, 0, S.W, S.H);
    if (!hover || S.playing || !['brush', 'eraser'].includes(S.tool)) return;
    const k = S.W / box.getBoundingClientRect().width;
    og.lineWidth = 1.5 * k; og.strokeStyle = 'rgba(0,0,0,.45)';
    og.beginPath(); og.arc(hover.x, hover.y, Math.max(2, S.sizes[S.tool] / 2), 0, Math.PI * 2); og.stroke();
  }

  /* ───── Simple drawing preview (brush / eraser) ───── */
  let stroke = null;
  function pos(e) {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) * S.W / r.width, y: (e.clientY - r.top) * S.H / r.height };
  }
  box.addEventListener('pointerdown', e => {
    if (S.playing) { stopPlay(); return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    closePops();
    const L = S.layers[S.layer];
    if (!L.visible) { toast(`“${L.name}” is hidden — show it to draw`); return; }
    const p = pos(e);
    if (S.tool === 'brush' || S.tool === 'eraser') {
      box.setPointerCapture(e.pointerId);
      stroke = { pts: [p], color: S.color, size: S.sizes[S.tool], opacity: S.opacity, erase: S.tool === 'eraser' };
      S.frames[S.cur].strokes.push(stroke);
      render();
    } else if (S.tool === 'fill') {
      toast('Fill bucket — fills the closed shape you tap (engine phase)');
    } else if (S.tool === 'text') {
      const t = prompt('Add text');
      if (t) toast('Text tool — places editable text on the canvas (engine phase)');
    } else if (S.tool === 'lasso') {
      $('#selBar').classList.remove('hidden');
      toast('Selection made — drag to move, corner to resize');
    }
  });
  box.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') hover = pos(e);
    if (stroke) { stroke.pts.push(pos(e)); render(); } else drawOverlay();
  });
  const endStroke = () => {
    if (!stroke) return;
    const f = S.frames[S.cur], st = stroke; stroke = null;
    pushUndo({ undo: () => f.strokes.splice(f.strokes.indexOf(st), 1), redo: () => f.strokes.push(st) });
    updateThumb(S.cur);
  };
  box.addEventListener('pointerup', endStroke);
  box.addEventListener('pointercancel', endStroke);
  box.addEventListener('pointerleave', () => { hover = null; drawOverlay(); });

  /* ───── Undo / redo ───── */
  function pushUndo(e) { S.undo.push(e); S.redo.length = 0; syncButtons(); }
  function undo() { const e = S.undo.pop(); if (!e) return; e.undo(); S.redo.push(e); afterHistory(); }
  function redo() { const e = S.redo.pop(); if (!e) return; e.redo(); S.undo.push(e); afterHistory(); }
  function afterHistory() { S.cur = clamp(S.cur, 0, S.frames.length - 1); buildTimeline(); syncButtons(); render(); }
  function syncButtons() {
    $('#btnUndo').disabled = !S.undo.length;
    $('#btnRedo').disabled = !S.redo.length;
    $('#btnPaste').disabled = !S.clip;
  }
  $('#btnUndo').onclick = undo;
  $('#btnRedo').onclick = redo;

  /* ───── Tools & options ───── */
  function setTool(t) {
    S.tool = t;
    $$('.tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    $$('.opt-group').forEach(gr => gr.classList.toggle('hidden', !gr.dataset.tools.split(' ').includes(t)));
    if (SIZE_RANGES[t]) {
      const [mn, mx] = SIZE_RANGES[t], si = $('#sizeInput');
      si.min = mn; si.max = mx; si.value = S.sizes[t];
      $('#sizeLabel').textContent = t === 'text' ? 'Text size' : 'Size';
    }
    if (t !== 'lasso') $('#selBar').classList.add('hidden');
    syncSizeDot();
    box.style.cursor = t === 'text' ? 'text' : t === 'lasso' ? 'default' : 'crosshair';
    requestAnimationFrame(fit);
  }
  $$('.tool[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));

  function buildSwatches() {
    const el = $('#swatches'); el.innerHTML = '';
    COLORS.forEach(c => {
      const s = document.createElement('button');
      s.className = 'swatch' + (c === S.color ? ' active' : ''); s.style.background = c; s.title = c;
      s.onclick = () => setColor(c);
      el.append(s);
    });
  }
  function setColor(c) { S.color = c; $('#colorInput').value = c; buildSwatches(); syncSizeDot(); }
  $('#colorInput').oninput = e => setColor(e.target.value);
  function syncSizeDot() {
    const d = $('#sizeDot'), v = S.sizes[S.tool] || 6;
    const px = clamp(v / (SIZE_RANGES[S.tool]?.[1] || 80) * 26, 3, 26);
    d.style.width = d.style.height = px + 'px';
    d.style.background = S.tool === 'eraser' ? 'transparent' : S.color;
    d.style.border = S.tool === 'eraser' ? '1.5px solid #888' : S.color === '#ffffff' ? '1px solid #ccc' : '0';
    d.style.opacity = S.tool === 'brush' ? S.opacity / 100 : 1;
  }
  $('#sizeInput').oninput = e => { S.sizes[S.tool] = +e.target.value; syncSizeDot(); };
  $('#opacityInput').oninput = e => { S.opacity = +e.target.value; syncSizeDot(); };
  $('#toleranceInput').oninput = e => { S.tolerance = +e.target.value; };

  /* ───── Draggable toolbar ───── */
  (() => {
    const h = $('#dragHandle'); let start = null;
    h.addEventListener('pointerdown', e => {
      const r = dock.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, l: r.left - wr.left, t: r.top - wr.top };
      h.setPointerCapture(e.pointerId); h.style.cursor = 'grabbing';
    });
    h.addEventListener('pointermove', e => {
      if (!start) return;
      const wr = wrap.getBoundingClientRect(), dr = dock.getBoundingClientRect();
      dock.classList.add('dragged');
      dock.style.left = clamp(start.l + e.clientX - start.x, 4, wr.width - dr.width - 4) + 'px';
      dock.style.top = clamp(start.t + e.clientY - start.y, 4, wr.height - dr.height - 4) + 'px';
    });
    h.addEventListener('pointerup', () => { start = null; h.style.cursor = ''; fit(); });
    h.addEventListener('dblclick', () => { resetDock(); fit(); });
  })();
  function resetDock() { dock.classList.remove('dragged'); dock.style.left = ''; dock.style.top = ''; }

  /* ───── Selection bar (lasso) ───── */
  $('#selBar').addEventListener('click', e => {
    const a = e.target.closest('[data-sel]')?.dataset.sel; if (!a) return;
    if (a === 'copy') { S.clip = { type: 'sel' }; syncButtons(); toast('Selection copied'); }
    if (a === 'flip') toast('Selection flipped');
    if (a === 'delete') toast('Selection deleted');
    if (a === 'done' || a === 'delete') $('#selBar').classList.add('hidden');
  });

  /* ───── “More tools” & main menu ───── */
  $('#btnMore').onclick = e => { $('#onionCheck').classList.toggle('off', !S.onion); openPop($('#morePop'), e.currentTarget); };
  $('#btnMenu').onclick = e => openPop($('#menuPop'), e.currentTarget);
  document.addEventListener('click', e => {
    const b = e.target.closest('.pop [data-act], .layer-actions [data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (!b.closest('.layers-pop')) closePops();
    actions[act]?.();
  });

  const actions = {
    onion() { S.onion = !S.onion; $('#onionInput').checked = S.onion; render(); toast(`Onion skin ${S.onion ? 'on' : 'off'}`); },
    flipLayer() { toast('Layer flipped horizontally'); },
    clearLayer() { clearFrame(); },
    clearFrame() { clearFrame(); },
    settings() { openSettings(); },
    exportVideo() { openExport('video'); },
    exportPng() { openExport('png'); },
    exportSheet() { openExport('sheet'); },
    saveFile() { toast('Saved “' + S.project.name + '.duck”'); },
    openFile() { $('#fileProject').click(); },
    rename() {
      const n = prompt('Rename animation', S.project.name);
      if (n && n.trim()) { S.project.name = n.trim(); $('#projName').textContent = S.project.name; }
    },
    help() { openModal('helpModal'); },
    duplicateFrame() { duplicateFrame(); },
    insertBefore() { insertFrame(S.cur, { pose: null, strokes: [] }, false); },
    frameLeft() { moveFrame(-1); },
    frameRight() { moveFrame(1); },
    deleteFrame() { deleteFrame(); },
    replaceAudio() { $('#fileAudio').click(); },
    removeAudio() { S.audio = null; syncAudio(); toast('Audio removed'); },
    addLayer() {
      if (S.layers.length >= 8) return toast('Up to 8 layers');
      S.layers.splice(S.layer + 1, 0, { name: 'Layer ' + (S.layers.length + 1), visible: true, opacity: 100 });
      S.layer++; buildLayers(); syncLayerBtn();
    },
    deleteLayer() {
      if (S.layers.length === 1) return toast('You need at least one layer');
      if (!confirm(`Delete “${S.layers[S.layer].name}” from every frame?`)) return;
      S.layers.splice(S.layer, 1); S.layer = Math.max(0, S.layer - 1); buildLayers(); syncLayerBtn(); render(); buildTimeline();
    },
    layerUp() { moveLayer(1); },
    layerDown() { moveLayer(-1); },
    renameLayer() {
      const L = S.layers[S.layer], n = prompt('Layer name', L.name);
      if (n && n.trim()) { L.name = n.trim(); buildLayers(); syncLayerBtn(); }
    },
  };

  /* ───── Timeline ───── */
  function buildTimeline() {
    framesEl.innerHTML = '';
    S.frames.forEach((f, i) => {
      const b = document.createElement('button');
      b.className = 'frame'; b.dataset.popAnchor = ''; b.setAttribute('aria-label', `Frame ${i + 1}`);
      const c = document.createElement('canvas'); c.width = 192; c.height = Math.round(192 * S.H / S.W);
      b.append(c);
      const n = document.createElement('span'); n.className = 'badge'; n.textContent = i + 1; b.append(n);
      b.onclick = () => {
        if (S.playing) return;
        if (i === S.cur) { $('#framePopTitle').textContent = `Frame ${i + 1}`; openPop($('#framePop'), b, 'above'); }
        else gotoFrame(i);
      };
      framesEl.append(b);
      paintThumb(c, i);
    });
    const add = document.createElement('button');
    add.className = 'frame add'; add.title = 'New frame (N)'; add.setAttribute('aria-label', 'New frame');
    add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
    add.onclick = () => insertFrame(S.cur + 1, { pose: null, strokes: [] });
    framesEl.append(add);
    markActive();
  }
  function paintThumb(c, i) { drawFrame(c.getContext('2d'), i, c.width, c.height); }
  function updateThumb(i) { const c = framesEl.children[i]?.querySelector('canvas'); if (c) paintThumb(c, i); }
  function markActive(smooth = true) {
    [...framesEl.children].forEach((b, i) => b.classList.toggle('active', i === S.cur));
    framesEl.children[S.cur]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
  }
  function gotoFrame(i) { S.cur = clamp(i, 0, S.frames.length - 1); markActive(); render(); }

  function snapshotFrames() { const fr = S.frames.slice(), cur = S.cur; return () => { S.frames = fr; S.cur = cur; }; }
  function structural(fn) {
    const undoTo = snapshotFrames(); fn(); const redoTo = snapshotFrames();
    pushUndo({ undo: undoTo, redo: redoTo }); buildTimeline(); render();
  }
  function insertFrame(at, f, select = true) {
    structural(() => { S.frames.splice(at, 0, f); S.cur = select ? at : S.cur + 1; });
  }
  function duplicateFrame() {
    const f = S.frames[S.cur];
    insertFrame(S.cur + 1, { pose: f.pose, strokes: f.strokes.map(s => ({ ...s, pts: s.pts.slice() })) });
    toast('Frame duplicated');
  }
  function moveFrame(d) {
    const j = S.cur + d; if (j < 0 || j >= S.frames.length) return;
    structural(() => { const [f] = S.frames.splice(S.cur, 1); S.frames.splice(j, 0, f); S.cur = j; });
  }
  function deleteFrame() {
    if (S.frames.length === 1) return clearFrame();
    structural(() => { S.frames.splice(S.cur, 1); S.cur = Math.min(S.cur, S.frames.length - 1); });
    toast('Frame deleted — Undo to bring it back');
  }
  function clearFrame() {
    structural(() => { S.frames[S.cur] = { pose: null, strokes: [] }; });
  }

  /* ───── Layers panel ───── */
  function buildLayers() {
    const list = $('#layerList'); list.innerHTML = '';
    for (let i = S.layers.length - 1; i >= 0; i--) {
      const L = S.layers[i];
      const row = document.createElement('div');
      row.className = 'layer-row' + (i === S.layer ? ' active' : '') + (L.visible ? '' : ' is-hidden');
      const c = document.createElement('canvas'); c.width = 128; c.height = 72;
      const cg = c.getContext('2d');
      if (L.name === 'Duck') drawDuck(cg, 128, 72, S.frames[S.cur].pose ?? 0);
      if (L.name === 'Background') { cg.fillStyle = S.bg === 'transparent' ? '#fff' : S.bg; cg.fillRect(0, 0, 128, 72); }
      const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = L.name;
      const eye = document.createElement('button'); eye.className = 'eye'; eye.innerHTML = L.visible ? EYE : EYE_OFF;
      eye.title = L.visible ? 'Hide layer' : 'Show layer';
      eye.onclick = e => { e.stopPropagation(); L.visible = !L.visible; buildLayers(); render(); buildTimeline(); };
      row.append(c, nm, eye);
      row.onclick = () => { S.layer = i; buildLayers(); syncLayerBtn(); };
      row.ondblclick = () => actions.renameLayer();
      list.append(row);
    }
    const L = S.layers[S.layer];
    $('#layerOpacity').value = L.opacity; $('#layerOpacityVal').textContent = L.opacity + '%';
  }
  function moveLayer(d) {
    const j = S.layer + d; if (j < 0 || j >= S.layers.length) return;
    [S.layers[S.layer], S.layers[j]] = [S.layers[j], S.layers[S.layer]]; S.layer = j; buildLayers();
  }
  function syncLayerBtn() { $('#layerName').textContent = S.layers[S.layer].name; }
  $('#layerOpacity').oninput = e => {
    S.layers[S.layer].opacity = +e.target.value; $('#layerOpacityVal').textContent = e.target.value + '%';
  };
  $('#btnLayers').onclick = e => { buildLayers(); openPop($('#layersPop'), e.currentTarget, 'above'); };

  /* ───── Playback ───── */
  function startPlay() {
    if (S.frames.length < 2) toast('Tip: add more frames to see motion');
    closePops();
    S.playing = true; S.playFrom = S.cur;
    document.body.classList.add('playing'); $('#playIcon').innerHTML = PAUSE;
    let start = S.cur, t0 = performance.now(), last = -1;
    const tick = now => {
      if (!S.playing) return;
      let idx = start + Math.floor((now - t0) * S.fps / 1000);
      if (idx >= S.frames.length) {
        if (!S.loop) return stopPlay();
        start = 0; t0 = now; idx = 0;
      }
      if (idx !== last) { last = idx; S.cur = idx; markActive(false); render(); }
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }
  function stopPlay() {
    S.playing = false; cancelAnimationFrame(S.raf);
    document.body.classList.remove('playing'); $('#playIcon').innerHTML = PLAY;
    S.cur = S.playFrom; markActive(); render();
  }
  $('#btnPlay').onclick = () => S.playing ? stopPlay() : startPlay();

  /* ───── Copy / paste ───── */
  $('#btnCopy').onclick = () => {
    const f = S.frames[S.cur];
    S.clip = { type: 'frame', frame: { pose: f.pose, strokes: f.strokes.slice() } };
    syncButtons(); toast(`Frame ${S.cur + 1} copied`);
  };
  $('#btnPaste').onclick = () => {
    if (!S.clip) return;
    if (S.clip.type === 'frame') { insertFrame(S.cur + 1, { ...S.clip.frame, strokes: S.clip.frame.strokes.slice() }); toast('Frame pasted'); }
    else { setTool('lasso'); $('#selBar').classList.remove('hidden'); toast('Selection pasted — drag to place'); }
  };

  /* ───── Media & audio ───── */
  $('#btnMedia').onclick = () => $('#fileMedia').click();
  $('#fileMedia').onchange = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.type.startsWith('video/')) {
      fakeProgress('Importing video frames…').then(() => toast('Video added on a new “Video” layer — trace over it!'));
    } else {
      setTool('lasso'); $('#selBar').classList.remove('hidden');
      toast('Image added — drag to place, corner to resize, Done to stamp');
    }
  };
  $('#btnAudio').onclick = e => {
    if (S.audio) { $('#audioPopTitle').textContent = '♪ ' + S.audio; openPop($('#audioPop'), e.currentTarget, 'above'); }
    else $('#fileAudio').click();
  };
  $('#fileAudio').onchange = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    S.audio = f.name; syncAudio(); toast('Audio added — it plays with your animation');
  };
  function syncAudio() {
    $('#btnAudio').classList.toggle('has-audio', !!S.audio);
    $('#audioLabel').textContent = S.audio ? S.audio.replace(/\.[^.]+$/, '') : 'Add audio';
  }
  $('#fileProject').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) toast('Opened “' + f.name + '”'); };

  /* ───── Settings ───── */
  function openSettings() {
    $('#fpsInput').value = S.fps; $('#fpsVal').textContent = S.fps + ' fps';
    $('#onionInput').checked = S.onion; $('#loopInput').checked = S.loop;
    buildBgSwatches($('#bgSwatches'), S.bg, c => { S.bg = c; fit(); render(); buildTimeline(); });
    openModal('settingsModal');
  }
  $('#fpsInput').oninput = e => { S.fps = +e.target.value; $('#fpsVal').textContent = S.fps + ' fps'; };
  $('#onionInput').onchange = e => { S.onion = e.target.checked; render(); };
  $('#loopInput').onchange = e => { S.loop = e.target.checked; };

  /* ───── Share / export ───── */
  function openExport(format = 'video') {
    if (S.playing) stopPlay();
    S.exportFormat = format;
    $$('#formatList .format').forEach(f => f.classList.toggle('active', f.dataset.format === format));
    $('#exportPick').classList.remove('hidden'); $('#exportDone').classList.add('hidden');
    const c = $('#exportThumb'); c.height = Math.round(320 * S.H / S.W);
    drawFrame(c.getContext('2d'), S.cur, c.width, c.height);
    $('#exportMeta').textContent = `${S.frames.length} frame${S.frames.length > 1 ? 's' : ''} · ${(S.frames.length / S.fps).toFixed(1)}s · ${S.fps} fps`;
    openModal('exportModal');
  }
  $('#btnShare').onclick = () => openExport('video');
  $$('#formatList .format').forEach(f => f.onclick = () => {
    S.exportFormat = f.dataset.format;
    $$('#formatList .format').forEach(x => x.classList.toggle('active', x === f));
  });
  $('#btnExport').onclick = async () => {
    closeModal('exportModal');
    const label = { video: 'Rendering video…', gif: 'Building GIF…', png: 'Saving image…', sheet: 'Building sprite sheet…' }[S.exportFormat];
    await fakeProgress(label, S.exportFormat === 'png' ? 500 : 1600);
    const ext = { video: 'mp4', gif: 'gif', png: 'png', sheet: 'png' }[S.exportFormat];
    $('#exportDone .muted').textContent = `${S.project.name.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    $('#exportPick').classList.add('hidden'); $('#exportDone').classList.remove('hidden');
    openModal('exportModal');
  };

  /* ───── Keyboard shortcuts ───── */
  addEventListener('keydown', e => {
    if (app.classList.contains('hidden') || e.target.matches('input, textarea')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    if (mod && k === 'c') { $('#btnCopy').click(); return; }
    if (mod && k === 'v') { $('#btnPaste').click(); return; }
    if (mod) return;
    const map = { b: 'brush', e: 'eraser', l: 'lasso', f: 'fill', t: 'text' };
    if (map[k]) setTool(map[k]);
    else if (k === ' ') { e.preventDefault(); $('#btnPlay').click(); }
    else if (k === 'arrowleft') gotoFrame(S.cur - 1);
    else if (k === 'arrowright') gotoFrame(S.cur + 1);
    else if (k === 'n') insertFrame(S.cur + 1, { pose: null, strokes: [] });
    else if (k === 'd') duplicateFrame();
    else if (k === 'o') actions.onion();
    else if (k === '[' || k === ']') {
      if (!SIZE_RANGES[S.tool]) return;
      const [mn, mx] = SIZE_RANGES[S.tool];
      S.sizes[S.tool] = clamp(S.sizes[S.tool] + (k === ']' ? 2 : -2), mn, mx);
      $('#sizeInput').value = S.sizes[S.tool]; syncSizeDot(); drawOverlay();
    } else if (k === 'escape') { closePops(); $$('.modal').forEach(m => m.id !== 'progressModal' && m.classList.add('hidden')); }
  });

  /* ───── Boot ───── */
  buildSwatches();
  renderStudio();
  const deep = new URLSearchParams(location.search).get('screen');
  if (deep === 'editor') openEditor(projects[0]);
})();
