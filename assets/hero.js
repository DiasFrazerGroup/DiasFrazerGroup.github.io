// Home-page hero animation: a tiny diffusion model.
// Points start as Gaussian noise, "denoise" into a structure (double helix -> phylogenetic tree ->
// single-cell clusters), hold, then diffuse back to noise and form the next one.
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

  const N = 190;
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
    const nRung = 16, rest = N - pts.length, per = Math.max(1, Math.floor(rest / nRung));
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

  function clusters() {
    // Single-cell-atlas-like embedding: a few anisotropic clusters, two joined by a trajectory.
    const C = [
      [0.18, 0.32, 0.07, 0.05, 0.4], [0.40, 0.72, 0.06, 0.08, -0.3], [0.62, 0.30, 0.08, 0.05, 0.9],
      [0.85, 0.62, 0.05, 0.07, 0.2], [0.80, 0.18, 0.04, 0.04, 0.0],
    ];
    const pts = [];
    const nTraj = Math.floor(N * 0.14);
    for (let k = 0; k < nTraj; k++) {               // a differentiation trajectory from cluster 0 to 2
      const u = k / (nTraj - 1);
      pts.push([0.18 + 0.44 * u + 0.012 * gauss(), 0.32 - 0.12 * Math.sin(Math.PI * u) + 0.012 * gauss(), 0.5]);
    }
    while (pts.length < N) {
      const c = C[Math.floor(rnd() * C.length)];
      const gx = gauss() * c[2], gy = gauss() * c[3], r = c[4];
      pts.push([c[0] + gx * Math.cos(r) - gy * Math.sin(r), c[1] + gx * Math.sin(r) + gy * Math.cos(r), 0.5]);
    }
    return { pts, edges: [] };
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
  function silhouette(poly, extras, label) {
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
    for (const e of extras) {                        // e.g. the vaquita's dark eye ring
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

  // Vaquita (Phocoena sinus), facing left: blunt head, tall triangular dorsal fin, flukes, dark eye ring.
  // Small, chubby porpoise: rounded head with no beak, broad low triangular fin set mid-back.
  const vaquita = silhouette([
    [0.03, 0.53], [0.04, 0.46], [0.08, 0.40], [0.15, 0.355], [0.26, 0.325], [0.40, 0.31], [0.45, 0.305],
    [0.535, 0.215], [0.555, 0.22], [0.60, 0.32], [0.70, 0.36], [0.80, 0.42], [0.875, 0.46], [0.945, 0.375],
    [0.985, 0.38], [0.945, 0.5], [0.985, 0.62], [0.945, 0.625], [0.875, 0.54], [0.80, 0.57], [0.70, 0.63],
    [0.56, 0.68], [0.40, 0.695], [0.32, 0.69], [0.30, 0.78], [0.265, 0.785], [0.24, 0.685], [0.14, 0.66],
    [0.07, 0.62],
  ], [{ x: 0.115, y: 0.47, r: 0.03, n: 10 }], "Vaquita · Phocoena sinus · critically endangered");

  // Black rhinoceros (Diceros bicornis), facing left: hooked lip, two horns, shoulder hump, four legs.
  const rhino = silhouette([
    [0.035, 0.56], [0.05, 0.47], [0.085, 0.44], [0.035, 0.235], [0.075, 0.25], [0.135, 0.405], [0.165, 0.39],
    [0.165, 0.305], [0.2, 0.37], [0.245, 0.35], [0.255, 0.27], [0.285, 0.33], [0.33, 0.315], [0.40, 0.265],
    [0.52, 0.27], [0.66, 0.285], [0.78, 0.29], [0.88, 0.335], [0.935, 0.41], [0.95, 0.47], [0.925, 0.55],
    [0.915, 0.79], [0.855, 0.79], [0.845, 0.64], [0.78, 0.66], [0.74, 0.79], [0.685, 0.79], [0.68, 0.655],
    [0.50, 0.67], [0.43, 0.665], [0.42, 0.79], [0.365, 0.79], [0.36, 0.66], [0.31, 0.655], [0.30, 0.79],
    [0.245, 0.79], [0.245, 0.62], [0.17, 0.62], [0.10, 0.62], [0.06, 0.6],
  ], [], "Black rhinoceros · Diceros bicornis · critically endangered");

  const H_ = helix(); H_.label = "DNA";
  const T_ = tree(); T_.label = "Phylogeny";
  const C_ = clusters(); C_.label = "Single-cell atlas";
  const shapes = [H_, T_, vaquita, C_, rhino];
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
    const h1 = hero.querySelector("h1");
    textRight = h1 ? h1.getBoundingClientRect().right - r.left : W * 0.5;
    // text blocks the animation should sit quietly behind
    textRects = [...hero.querySelectorAll("h1, p, .eyebrow")].map((el) => {
      const b = el.getBoundingClientRect();
      return [b.left - r.left - 14, b.top - r.top - 10, b.right - r.left + 14, b.bottom - r.top + 10];
    });
    narrow = W - textRight < 320;
    box = narrow
      ? { x: W * 0.06, y: H * 0.1, w: W * 0.88, h: H * 0.8 }
      : { x: Math.max(textRight - 40, W * 0.42), y: H * 0.14, w: 0, h: H * 0.72 };
    if (!narrow) box.w = Math.min(W - 24 - box.x, 620);
  }

  let accent = "#7cc7bb", muted = "#8a93a3";
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
    const s = Math.min(box.w, box.h / 0.62);
    for (let i = 0; i < N; i++) {
      const p = shape.pts[i], g = noise[i];
      const tx = shape.keepAspect ? cx + (p[0] - 0.5) * s : box.x + p[0] * box.w;
      const ty = shape.keepAspect ? cy + (p[1] - 0.5) * s : box.y + p[1] * box.h;
      pos[i][0] = sa * tx + (1 - sa) * cx + sn * g[0] * spread * (1 - 0.85 * a);
      pos[i][1] = sa * ty + (1 - sa) * cy + sn * g[1] * spread * (1 - 0.85 * a);
    }
    ctx.clearRect(0, 0, W, H);
    const base = narrow ? 0.32 : 0.9;
    const behindText = (x, y) => textRects.some(([l, t, r, b]) => x > l && x < r && y > t && y < b);
    const fade = (x, y) => (behindText(x, y) ? (narrow ? 0.5 : 0.14) : 1);

    // edges appear as the structure resolves
    const ea = smooth(0.55, 0.98, a) * 0.38 * base;
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
      ctx.beginPath(); ctx.arc(pos[i][0], pos[i][1], 1.2 + 1.6 * z, 0, TAU); ctx.fill();
    }
    // caption, fading in once the structure has formed
    const la = smooth(0.8, 1, a) * (narrow ? 0.45 : 0.75);
    if (la > 0.01 && shape.label) {
      ctx.globalAlpha = la;
      ctx.fillStyle = muted;
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = "right";
      ctx.fillText(shape.label.toUpperCase(), box.x + box.w, box.y + box.h + 18);
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
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (reduceMotion) draw(PH.noise + PH.form + 1); }, 120); });
  new MutationObserver(() => { readColours(); if (reduceMotion) draw(PH.noise + PH.form + 1); })
    .observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();
