// Home-page hero animation: a tiny diffusion model.
// Points start as Gaussian noise, "denoise" into a structure (double helix -> phylogenetic tree ->
// a cell, endangered animals), hold, then diffuse back to noise and form the next one.
// Each point's noise drifts as an Ornstein-Uhlenbeck process, so the noise cloud itself moves gently.
// Respects prefers-reduced-motion (draws one still frame) and pauses when off-screen or in a hidden tab.
(function () {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const cv = document.createElement("canvas");
  cv.className = "hero-canvas";
  cv.setAttribute("aria-hidden", "true");
  hero.prepend(cv);
  const ctx = cv.getContext("2d");

  const N = window.innerWidth < 760 ? 220 : 420;
  const K = N / 190;                                  // scale for shapes with hand-set point counts
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  // ---------- helpers ----------
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => {
    const u = Math.max(rnd(), 1e-9), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // ---------- target shapes (unit square), each with optional edges between point indices ----------
  function helix() {
    const pts = [], edges = [];
    const nStrand = Math.floor(N * 0.36), turns = 2.1;
    for (let s = 0; s < 2; s++) {
      for (let k = 0; k < nStrand; k++) {
        const u = k / (nStrand - 1);
        const ph = TAU * turns * u + s * Math.PI;
        pts.push([0.04 + 0.92 * u, 0.5 + 0.3 * Math.sin(ph), 0.55 + 0.45 * Math.cos(ph)]);
        if (k > 0) edges.push([pts.length - 2, pts.length - 1]);
      }
    }
    const nRung = 22, rest = N - pts.length, per = Math.max(1, Math.floor(rest / nRung));
    for (let r = 0; r < nRung && pts.length < N; r++) {
      const u = (r + 0.5) / nRung, ph = TAU * turns * u;
      const yA = 0.5 + 0.3 * Math.sin(ph), yB = 0.5 + 0.3 * Math.sin(ph + Math.PI);
      for (let j = 0; j < per && pts.length < N; j++) {
        const f = (j + 1) / (per + 1);
        pts.push([0.04 + 0.92 * u, yA + (yB - yA) * f, 0.35]);
        if (j > 0) edges.push([pts.length - 2, pts.length - 1]);
      }
    }
    while (pts.length < N) pts.push([rnd(), 0.5 + 0.3 * Math.sin(TAU * rnd()), 0.4]);
    return { pts, edges };
  }

  function tree() {
    // Rectangular cladogram, root on the left, 16 leaves on the right, slightly uneven branch lengths.
    const depth = 4, leaves = 1 << depth, segs = [];
    function build(d, lo, hi, x) {
      const y = (lo + hi) / 2;
      if (d === depth) return { y, x };
      const mid = (lo + hi) / 2;
      const xc = x + (0.16 + 0.1 * rnd());
      const a = build(d + 1, lo, mid, xc), b = build(d + 1, mid, hi, xc);
      segs.push([[x, a.y], [x, b.y]]);               // vertical connector
      segs.push([[x, a.y], [a.x, a.y]]);             // horizontal branches
      segs.push([[x, b.y], [b.x, b.y]]);
      return { y: (a.y + b.y) / 2, x };
    }
    const root = build(0, 0.06, 0.94, 0.12);
    segs.push([[0.02, root.y], [0.12, root.y]]);
    // stretch leaf tips to the right edge
    let maxX = 0;
    segs.forEach((s) => s.forEach((p) => (maxX = Math.max(maxX, p[0]))));
    segs.forEach((s) => s.forEach((p) => (p[0] = 0.02 + ((p[0] - 0.02) / (maxX - 0.02)) * 0.94)));
    const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
    const total = lens.reduce((x, y) => x + y, 0);
    const pts = [], edges = [];
    segs.forEach(([a, b], i) => {
      const n = Math.max(2, Math.round((lens[i] / total) * N));
      for (let k = 0; k < n && pts.length < N; k++) {
        const f = k / (n - 1);
        pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0.5]);
        if (k > 0) edges.push([pts.length - 2, pts.length - 1]);
      }
    });
    while (pts.length < N) { const s = segs[Math.floor(rnd() * segs.length)][1]; pts.push([s[0], s[1], 0.5]); }
    return { pts, edges, leaves };
  }

  // A eukaryotic cell: wavy membrane, nucleus with nucleolus, mitochondria and endoplasmic reticulum.
  function cell() {
    const pts = [], edges = [];
    function loop(n, f, z) {                          // closed outline of n points
      const s0 = pts.length;
      for (let k = 0; k < n; k++) { const [x, y] = f((k / n) * TAU); pts.push([x, y, z]); if (k > 0) edges.push([pts.length - 2, pts.length - 1]); }
      edges.push([pts.length - 1, s0]);
    }
    loop(Math.round(64 * K), (a) => { const w = 1 + 0.05 * Math.sin(3 * a) + 0.03 * Math.sin(5 * a + 1); return [0.5 + 0.42 * w * Math.cos(a), 0.5 + 0.27 * w * Math.sin(a)]; }, 0.85);
    loop(Math.round(32 * K), (a) => [0.42 + 0.13 * Math.cos(a), 0.5 + 0.11 * Math.sin(a)], 1);
    for (let k = 0; k < Math.round(10 * K); k++) pts.push([0.45 + 0.025 * gauss(), 0.48 + 0.02 * gauss(), 1]);   // nucleolus
    for (const [mx, my, r] of [[0.71, 0.37, 0.4], [0.74, 0.62, -0.3], [0.24, 0.67, 0.2]]) {         // mitochondria
      loop(Math.round(12 * K), (a) => { const x = 0.065 * Math.cos(a), y = 0.026 * Math.sin(a); return [mx + x * Math.cos(r) - y * Math.sin(r), my + x * Math.sin(r) + y * Math.cos(r)]; }, 0.7);
    }
    for (const R of [0.175, 0.205]) {                 // ER: two wavy arcs hugging the nucleus
      const s0 = pts.length;
      const nE = Math.round(18 * K);
      for (let k = 0; k < nE; k++) {
        const a = -1.1 + (2.2 * k) / (nE - 1), w = R * (1 + 0.06 * Math.sin(9 * a));
        pts.push([0.42 + w * Math.cos(a) * 1.15, 0.5 + w * Math.sin(a) * 0.95, 0.5]);
        if (k > 0) edges.push([pts.length - 2, pts.length - 1]);
      }
    }
    while (pts.length < N) {                          // a little cytoplasm
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.9;
      const x = 0.5 + 0.4 * r * Math.cos(a), y = 0.5 + 0.25 * r * Math.sin(a);
      if (Math.hypot((x - 0.42) / 0.15, (y - 0.5) / 0.13) > 1) pts.push([x, y, 0.3]);
    }
    return { pts, edges, keepAspect: true };
  }

  // Animal silhouettes: points along the outline (with edges) plus a light fill. Coordinates are in
  // units of the shape's width, so they are drawn with a uniform scale (keepAspect).
  function inside(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  // Closed Catmull-Rom spline through the control points. A point written [x, y, 1] is a corner:
  // the curve meets it with straight tangents, so horn tips, fin tips and feet stay sharp.
  function smoothPoly(ctrl, per = 8) {
    const n = ctrl.length, out = [];
    const at = (i) => ctrl[(i + n) % n];
    for (let i = 0; i < n; i++) {
      const p1 = at(i), p2 = at(i + 1);
      const p0 = p1[2] ? p1 : at(i - 1), p3 = p2[2] ? p2 : at(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  }

  function silhouette(ctrl, extras, label) {
    const poly = smoothPoly(ctrl);
    const pts = [], edges = [];
    const nExtra = extras.reduce((n, e) => n + e.n, 0);
    const nOutline = Math.floor((N - nExtra) * 0.72);
    const seg = poly.map((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
    const total = seg.reduce((a, b) => a + b, 0);
    for (let k = 0; k < nOutline; k++) {
      let d = (k / nOutline) * total, i = 0;
      while (d > seg[i]) { d -= seg[i]; i++; }
      const p = poly[i], q = poly[(i + 1) % poly.length], f = d / seg[i];
      pts.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, 0.85]);
      if (k > 0) edges.push([k - 1, k]);
    }
    edges.push([nOutline - 1, 0]);
    for (const e of extras) {                        // e.g. a dark eye ring
      for (let k = 0; k < e.n; k++) {
        const a = (k / e.n) * TAU;
        pts.push([e.x + e.r * Math.cos(a), e.y + e.r * 0.8 * Math.sin(a), 1]);
        if (k > 0) edges.push([pts.length - 2, pts.length - 1]);
      }
      edges.push([pts.length - 1, pts.length - e.n]);
    }
    let xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const bx = [Math.min(...xs), Math.max(...xs)], by = [Math.min(...ys), Math.max(...ys)];
    let guard = 0;
    while (pts.length < N && guard++ < 20000) {
      const x = bx[0] + rnd() * (bx[1] - bx[0]), y = by[0] + rnd() * (by[1] - by[0]);
      if (inside(poly, x, y)) pts.push([x, y, 0.3]);
    }
    return { pts, edges, keepAspect: true, label };
  }

  // Black rhinoceros (Diceros bicornis), facing left. Head carried fairly high, hooked upper lip,
  // long front horn curving back and a shorter second horn, rounded ears, level back with a slight
  // dip behind the shoulder, sagging belly, four short legs (the far pair a little shorter).
  const rhino = silhouette([
    // shoulder hump with a dip behind it; belly tucks up into the flank in front of the hind legs; two separate front legs
    [0.035, 0.505, 1], [0.05, 0.47], [0.078, 0.445], [0.09, 0.43], [0.06, 0.215, 1], [0.13, 0.4],
    [0.148, 0.39], [0.172, 0.285, 1], [0.195, 0.372], [0.22, 0.35], [0.238, 0.322], [0.247, 0.252, 1],
    [0.276, 0.306], [0.305, 0.316], [0.35, 0.285], [0.39, 0.248], [0.435, 0.238], [0.48, 0.258], [0.535, 0.29],
    [0.6, 0.296], [0.68, 0.28], [0.79, 0.285], [0.875, 0.325], [0.912, 0.375], [0.938, 0.42],
    [0.936, 0.535, 1], [0.922, 0.45], [0.924, 0.5], [0.914, 0.585], [0.9, 0.7], [0.902, 0.8, 1],
    [0.842, 0.8, 1], [0.84, 0.7], [0.826, 0.655], [0.814, 0.69], [0.81, 0.778, 1], [0.766, 0.778, 1],
    [0.77, 0.68], [0.735, 0.615], [0.7, 0.632], [0.64, 0.668], [0.58, 0.686], [0.568, 0.684], [0.556, 0.7],
    [0.552, 0.788, 1], [0.506, 0.788, 1], [0.502, 0.712], [0.478, 0.652], [0.448, 0.712], [0.445, 0.8, 1],
    [0.386, 0.8, 1], [0.386, 0.7], [0.376, 0.622], [0.315, 0.578], [0.245, 0.552], [0.16, 0.545],
    [0.095, 0.53], [0.058, 0.522],
  ], [], "Black rhinoceros · Diceros bicornis · critically endangered");

  const H_ = helix(); H_.label = "DNA";
  const T_ = tree(); T_.label = "Phylogeny";
  const C_ = cell(); C_.label = "Cell";
  const shapes = [H_, T_, C_, rhino];
  // Shuffle which point goes where in each shape, so points travel when the shape changes.
  shapes.forEach((s) => {
    const idx = [...Array(N).keys()];
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const inv = []; idx.forEach((v, i) => (inv[v] = i));
    s.pts = idx.map((v) => s.pts[v]);
    s.edges = s.edges.map(([a, b]) => [inv[a], inv[b]]);
  });

  // ---------- Ornstein-Uhlenbeck noise per point (stationary N(0,1)) ----------
  const noise = Array.from({ length: N }, () => [gauss(), gauss()]);
  const theta = 0.35;
  function stepNoise(dt) {
    const s = Math.sqrt(2 * theta * dt);
    for (const g of noise) { g[0] += -theta * g[0] * dt + s * gauss(); g[1] += -theta * g[1] * dt + s * gauss(); }
  }

  // ---------- schedule: noise -> form -> hold -> dissolve, then next shape ----------
  const PH = { noise: 1.6, form: 4.2, hold: 4.5, dissolve: 3.2 };
  const CYCLE = PH.noise + PH.form + PH.hold + PH.dissolve;
  function signal(t) {                               // returns [shape index, alpha-bar in 0..1]
    const k = Math.floor(t / CYCLE), r = t - k * CYCLE;
    let a;
    if (r < PH.noise) a = 0;
    else if (r < PH.noise + PH.form) a = ease((r - PH.noise) / PH.form);
    else if (r < PH.noise + PH.form + PH.hold) a = 1;
    else a = 1 - ease((r - PH.noise - PH.form - PH.hold) / PH.dissolve);
    return [k % shapes.length, a];
  }

  // ---------- layout ----------
  let W = 0, H = 0, dpr = 1, box = null, textRight = 0, narrow = false, textRects = [];
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        textRight = Math.max(W * 0.3, ...[...hero.querySelectorAll("h1, p")].map((el) => el.getBoundingClientRect().right - r.left));
    // text blocks the animation should sit quietly behind
    textRects = [...hero.querySelectorAll("h1, p, .eyebrow, .hiring")].map((el) => {
      const b = el.getBoundingClientRect();
      return [b.left - r.left - 14, b.top - r.top - 10, b.right - r.left + 14, b.bottom - r.top + 10];
    });
    narrow = W - textRight < 320;
    box = narrow
      ? { x: W * 0.06, y: H * 0.1, w: W * 0.88, h: H * 0.8 }
      : { x: Math.max(textRight - 40, W * 0.42), y: H * 0.14, w: 0, h: H * 0.72 };
    if (!narrow) box.w = Math.min(W - 24 - box.x, 620);
  }

  let accent = "#6cb0ff", muted = "#8a93a3";
  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    accent = (cs.getPropertyValue("--accent") || accent).trim() || accent;
    muted = (cs.getPropertyValue("--muted") || muted).trim() || muted;
  }

  // ---------- draw ----------
  const pos = Array.from({ length: N }, () => [0, 0]);
  function draw(t) {
    const [si, a] = signal(t);
    const shape = shapes[si];
    const sa = Math.sqrt(a), sn = Math.sqrt(1 - a * 0.985);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, spread = Math.min(box.w, box.h) * 0.32;
    const s = Math.min(box.w, box.h / 0.62) * 0.86;
    const acx = narrow ? cx : box.x + box.w - s / 2 - 8;      // animals hug the right edge
    for (let i = 0; i < N; i++) {
      const p = shape.pts[i], g = noise[i];
      const tx = shape.keepAspect ? acx + (p[0] - 0.5) * s : box.x + p[0] * box.w;
      const ty = shape.keepAspect ? cy + (p[1] - 0.5) * s : box.y + p[1] * box.h;
      pos[i][0] = sa * tx + (1 - sa) * cx + sn * g[0] * spread * (1 - 0.85 * a);
      pos[i][1] = sa * ty + (1 - sa) * cy + sn * g[1] * spread * (1 - 0.85 * a);
    }
    ctx.clearRect(0, 0, W, H);
    const base = narrow ? 0.42 : 0.95;
    const behindText = (x, y) => textRects.some(([l, t, r, b]) => x > l && x < r && y > t && y < b);
    const fade = (x, y) => (behindText(x, y) ? (narrow ? 0.5 : 0.14) : 1);

    // edges appear as the structure resolves
    const ea = smooth(0.55, 0.98, a) * 0.3 * base;
    if (ea > 0.01 && shape.edges.length) {
      ctx.strokeStyle = accent; ctx.lineWidth = 1;
      for (const [i, j] of shape.edges) {
        ctx.globalAlpha = ea * fade(pos[i][0], pos[i][1]);
        ctx.beginPath(); ctx.moveTo(pos[i][0], pos[i][1]); ctx.lineTo(pos[j][0], pos[j][1]); ctx.stroke();
      }
    }
    // points: depth (z) gives the helix a 3D feel
    for (let i = 0; i < N; i++) {
      const z = shape.pts[i][2] * a + 0.5 * (1 - a);
      ctx.globalAlpha = base * (0.35 + 0.55 * z) * fade(pos[i][0], pos[i][1]);
      ctx.fillStyle = z > 0.55 ? accent : muted;
      ctx.beginPath(); ctx.arc(pos[i][0], pos[i][1], 0.95 + 1.3 * z, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- loop ----------
  let t = PH.noise + PH.form * 0.35, last = null, running = false, visible = true, raf = 0;
  function frame(now) {
    if (!running) return;
    const dt = last == null ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now; t += dt;
    stepNoise(dt);
    if (Math.floor(t * 2) % 4 === 0) readColours();  // pick up theme toggles
    draw(t);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running && visible && !document.hidden && !reduceMotion) { running = true; last = null; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // For tuning in the browser console: heroSeek(shapeIndex) jumps to the moment that shape has just formed.
  window.heroSeek = (k) => { t = k * CYCLE + PH.noise + PH.form + 0.5; if (reduceMotion) draw(t); };

  layout(); readColours();
  if (reduceMotion) { draw(PH.noise + PH.form + 1); }
  else {
    start();
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }
  // re-measure once web fonts have loaded (the headline changes width when they swap in)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); if (reduceMotion) draw(PH.noise + PH.form + 1); });
  window.addEventListener("load", () => layout());
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (reduceMotion) draw(PH.noise + PH.form + 1); }, 120); });
  new MutationObserver(() => { readColours(); if (reduceMotion) draw(PH.noise + PH.form + 1); })
    .observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();
