// Home-page hero animation, 3D version (the default; assets/hero.js is the 2D original, shown with ?hero=2d).
// Same tiny diffusion model, but every shape is a 3D point cloud with many more points, and the
// scene turns slowly in perspective, so depth reads from size, brightness and parallax.
// Shapes: double helix (spinning on its axis), a branching 3D tree, the vaquita, a cell (membrane,
// nucleus, mitochondria, ER) and the black rhino. The animals are "inflated" from their 2D silhouettes: each point inside
// the outline gets the height of the union of the largest discs that fit inside the shape, which
// turns legs into thin limbs and the body into a rounded barrel.
(function () {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const cv = document.createElement("canvas");
  cv.className = "hero-canvas";
  cv.setAttribute("aria-hidden", "true");
  hero.prepend(cv);
  const ctx = cv.getContext("2d");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const N = window.innerWidth < 760 ? 520 : 1100;

  // ---------- helpers ----------
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => { const u = Math.max(rnd(), 1e-9), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // All shapes live in "shape units": x across 0..1, y downwards, z towards the viewer, centred on
  // (0.5, 0.5, 0). Each returns exactly N points [x, y, z].
  const fill = (pts, f) => { while (pts.length < N) pts.push(f()); return pts.slice(0, N); };

  // ---------- double helix along x ----------
  function helix() {
    const pts = [], turns = 2.2, R = 0.15;
    const nStrand = Math.floor(N * 0.34);
    for (let s = 0; s < 2; s++) for (let k = 0; k < nStrand; k++) {
      const u = k / (nStrand - 1), ph = TAU * turns * u + s * Math.PI, j = 0.006;
      pts.push([0.03 + 0.94 * u, 0.5 + R * Math.sin(ph) + j * gauss(), R * Math.cos(ph) + j * gauss()]);
    }
    const nRung = 26;
    while (pts.length < N) {                         // base pairs: rungs joining the strands
      const r = Math.floor(rnd() * nRung), u = (r + 0.5) / nRung, ph = TAU * turns * u, f = rnd();
      const ya = R * Math.sin(ph), za = R * Math.cos(ph);
      pts.push([0.03 + 0.94 * u, 0.5 + ya * (1 - 2 * f), za * (1 - 2 * f)]);
    }
    return { pts, spin: true };
  }

  // ---------- branching phylogeny in 3D: each split turns its plane by 90 degrees ----------
  function tree() {
    const segs = [];
    function grow(p, dir, len, depth, roll) {
      const q = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
      segs.push([p, q]);
      if (depth === 0) return;
      const ang = 0.5 + 0.12 * rnd();
      for (const sgn of [-1, 1]) {
        // rotate the forward direction by ±ang, alternating between the y and z planes
        const c = Math.cos(sgn * ang), s = Math.sin(sgn * ang);
        const d = roll ? [dir[0] * c - dir[2] * s, dir[1], dir[0] * s + dir[2] * c]
                       : [dir[0] * c - dir[1] * s, dir[0] * s + dir[1] * c, dir[2]];
        const m = Math.hypot(...d);
        grow(q, d.map((v) => v / m), len * (0.72 + 0.1 * rnd()), depth - 1, !roll);
      }
    }
    grow([0.02, 0.5, 0], [1, 0, 0], 0.2, 5, false);
    let lo = [9, 9, 9], hi = [-9, -9, -9];
    segs.forEach((s) => s.forEach((p) => p.forEach((v, i) => { lo[i] = Math.min(lo[i], v); hi[i] = Math.max(hi[i], v); })));
    const sc = 0.94 / (hi[0] - lo[0]);
    const norm = (p) => [0.03 + (p[0] - lo[0]) * sc, 0.5 + (p[1] - (lo[1] + hi[1]) / 2) * sc, (p[2] - (lo[2] + hi[2]) / 2) * sc];
    const S = segs.map(([a, b]) => [norm(a), norm(b)]);
    const lens = S.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    const total = lens.reduce((x, y) => x + y, 0);
    const pts = [];
    S.forEach(([a, b], i) => {
      const n = Math.max(2, Math.round((lens[i] / total) * N * 0.97));
      for (let k = 0; k < n; k++) { const f = k / (n - 1); pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); }
    });
    const tips = S.slice(-32).map((s) => s[1]);
    return { pts: fill(pts, () => { const t = tips[Math.floor(rnd() * tips.length)]; return [t[0] + 0.008 * gauss(), t[1] + 0.008 * gauss(), t[2] + 0.008 * gauss()]; }) };
  }

  // ---------- a eukaryotic cell: membrane, nucleus, nucleolus, mitochondria, ER ----------
  function cell() {
    const pts = [];
    const sph = () => { const z = 2 * rnd() - 1, a = rnd() * TAU, r = Math.sqrt(1 - z * z); return [r * Math.cos(a), r * Math.sin(a), z]; };
    const nMem = Math.floor(N * 0.34), nNuc = Math.floor(N * 0.2), nNo = Math.floor(N * 0.06), nMito = Math.floor(N * 0.2), nER = Math.floor(N * 0.2);
    // a 4th coordinate marks how a point is drawn: 0 = faint membrane, 1 = bright organelle
    for (let k = 0; k < nMem; k++) {                 // wavy oblate membrane: a crisp rim seen face-on, plus a faint shell
      const rim = k % 2 === 0;
      let [u, v, w] = sph();
      if (rim) { const a = (k / nMem) * TAU; u = Math.cos(a); v = Math.sin(a); w = 0.04 * gauss(); }
      const a = Math.atan2(v, u), wob = 1 + 0.05 * Math.sin(3 * a) + 0.03 * Math.sin(5 * a + 1) + 0.03 * Math.sin(4 * w);
      pts.push([0.5 + 0.42 * wob * u, 0.5 + 0.27 * wob * v, 0.24 * wob * w, rim ? 0.85 : 0]);
    }
    for (let k = 0; k < nNuc; k++) { const [u, v, w] = sph(); pts.push([0.42 + 0.13 * u, 0.5 + 0.11 * v, 0.02 + 0.11 * w, 1]); }
    for (let k = 0; k < nNo; k++) pts.push([0.45 + 0.022 * gauss(), 0.48 + 0.02 * gauss(), 0.05 + 0.02 * gauss(), 1]);
    const mitos = [[0.71, 0.37, 0.08, 0.4, 0.3], [0.74, 0.62, -0.06, -0.3, -0.4], [0.24, 0.67, 0.05, 0.2, 0.6], [0.62, 0.5, 0.15, 1.2, 0.1]];
    for (let k = 0; k < nMito; k++) {                // capsules: points on a stretched sphere, rotated
      const [cx, cy, cz, r1, r2] = mitos[k % mitos.length], [u, v, w] = sph();
      let x = 0.065 * u, y = 0.024 * v, z = 0.024 * w;
      const x1 = x * Math.cos(r1) - y * Math.sin(r1), y1 = x * Math.sin(r1) + y * Math.cos(r1);
      const x2 = x1 * Math.cos(r2) - z * Math.sin(r2), z2 = x1 * Math.sin(r2) + z * Math.cos(r2);
      pts.push([cx + x2, cy + y1, cz + z2, 1]);
    }
    for (let k = 0; k < nER; k++) {                  // ER: folded shells around one side of the nucleus
      const R = k % 2 ? 0.175 : 0.205, a = -1.1 + 2.2 * rnd(), b = -0.9 + 1.8 * rnd(), f = R * (1 + 0.06 * Math.sin(9 * a + 4 * b));
      pts.push([0.42 + f * Math.cos(a) * Math.cos(b) * 1.15, 0.5 + f * Math.sin(a) * 0.95, 0.02 + f * Math.cos(a) * Math.sin(b), 1]);
    }
    return { pts: fill(pts, () => { const [u, v, w] = sph(); return [0.42 + 0.13 * u, 0.5 + 0.11 * v, 0.02 + 0.11 * w, 1]; }), animal: true };
  }

  // ---------- animals: inflate a 2D silhouette into a 3D surface ----------
  function smoothPoly(ctrl, per = 8) {
    const n = ctrl.length, out = [], at = (i) => ctrl[(i + n) % n];
    for (let i = 0; i < n; i++) {
      const p1 = at(i), p2 = at(i + 1), p0 = p1[2] ? p1 : at(i - 1), p3 = p2[2] ? p2 : at(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  }
  function inside(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function segDist(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
    const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / L, 0, 1);
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }

  function animal(ctrl, opts = {}) {
    const poly = smoothPoly(ctrl), thick = opts.thick || 0.85;
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const GX = 110, c = (x1 - x0) / GX, GY = Math.ceil((y1 - y0) / c) + 1;
    const D = new Float32Array(GX * GY), Hh = new Float32Array(GX * GY), cells = [];
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const x = x0 + (i + 0.5) * c, y = y0 + (j + 0.5) * c;
      if (!inside(poly, x, y)) continue;
      let d = 1e9;
      for (let k = 0; k < poly.length; k++) d = Math.min(d, segDist(x, y, poly[k], poly[(k + 1) % poly.length]));
      D[j * GX + i] = d; cells.push(j * GX + i);
    }
    // height = union of medial discs turned into balls: h(p) = max_q sqrt(d(q)^2 - |p - q|^2)
    for (const q of cells) {
      const d = D[q], qi = q % GX, qj = (q / GX) | 0, r = Math.ceil(d / c);
      for (let j = Math.max(0, qj - r); j <= Math.min(GY - 1, qj + r); j++)
        for (let i = Math.max(0, qi - r); i <= Math.min(GX - 1, qi + r); i++) {
          const p = j * GX + i; if (!D[p]) continue;
          const dd = d * d - ((i - qi) * c) ** 2 - ((j - qj) * c) ** 2;
          if (dd > 0) Hh[p] = Math.max(Hh[p], Math.sqrt(dd));
        }
    }
    const pts = [];
    // a crisp rim (the silhouette at z = 0) ...
    const seg = poly.map((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
    const total = seg.reduce((a, b) => a + b, 0), nRim = Math.floor(N * 0.22);
    for (let k = 0; k < nRim; k++) {
      let d = (k / nRim) * total, i = 0;
      while (d > seg[i]) { d -= seg[i]; i++; }
      const p = poly[i], q = poly[(i + 1) % poly.length], f = d / seg[i];
      pts.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, 0]);
    }
    // ... features such as the vaquita's eye ring, on both flanks ...
    for (const e of opts.extras || []) for (let k = 0; k < e.n; k++) {
      const a = (k / e.n) * TAU, x = e.x + e.r * Math.cos(a), y = e.y + e.r * 0.8 * Math.sin(a);
      const i = clamp(Math.floor((x - x0) / c), 0, GX - 1), j = clamp(Math.floor((y - y0) / c), 0, GY - 1);
      const z = Hh[j * GX + i] * thick * 1.02;
      pts.push([x, y, k % 2 ? z : -z]);
    }
    // ... and the rest scattered over the inflated surface, front and back
    while (pts.length < N) {
      const q = cells[Math.floor(rnd() * cells.length)], i = q % GX, j = (q / GX) | 0;
      const x = x0 + (i + rnd()) * c, y = y0 + (j + rnd()) * c;
      if (!inside(poly, x, y)) continue;
      const z = Hh[q] * thick;
      pts.push([x, y, rnd() < 0.5 ? z : -z]);
    }
    return { pts, animal: true };
  }

  const vaquita = animal([
    [0.03, 0.53], [0.04, 0.46], [0.08, 0.40], [0.15, 0.355], [0.26, 0.325], [0.40, 0.31], [0.45, 0.305],
    [0.535, 0.215, 1], [0.555, 0.22, 1], [0.60, 0.32], [0.70, 0.36], [0.80, 0.42], [0.875, 0.46], [0.945, 0.375, 1],
    [0.985, 0.38, 1], [0.945, 0.5, 1], [0.985, 0.62, 1], [0.945, 0.625, 1], [0.875, 0.54], [0.80, 0.57], [0.70, 0.63],
    [0.56, 0.68], [0.40, 0.695], [0.32, 0.69], [0.30, 0.78, 1], [0.265, 0.785, 1], [0.24, 0.685], [0.14, 0.66],
    [0.07, 0.62],
  ], { extras: [{ x: 0.115, y: 0.47, r: 0.03, n: 24 }], thick: 0.95 });

  const rhino = animal([
    [0.035, 0.505, 1], [0.05, 0.47], [0.078, 0.445],
    [0.09, 0.43], [0.06, 0.215, 1], [0.13, 0.40],
    [0.148, 0.39], [0.172, 0.285, 1], [0.195, 0.372],
    [0.22, 0.35], [0.238, 0.322], [0.247, 0.252, 1], [0.276, 0.306],
    [0.305, 0.312], [0.355, 0.298], [0.42, 0.268], [0.50, 0.282], [0.58, 0.29],
    [0.68, 0.276], [0.79, 0.285], [0.875, 0.325], [0.912, 0.375],
    [0.938, 0.42], [0.936, 0.535, 1], [0.922, 0.45],
    [0.924, 0.5], [0.914, 0.585], [0.9, 0.7], [0.902, 0.8, 1], [0.842, 0.8, 1],
    [0.84, 0.7], [0.826, 0.655],
    [0.814, 0.69], [0.81, 0.778, 1], [0.766, 0.778, 1], [0.77, 0.68], [0.72, 0.665],
    [0.62, 0.675], [0.545, 0.672],
    [0.526, 0.69], [0.521, 0.778, 1], [0.477, 0.778, 1], [0.472, 0.7], [0.46, 0.672],
    [0.454, 0.72], [0.451, 0.8, 1], [0.386, 0.8, 1], [0.386, 0.7], [0.376, 0.622],
    [0.315, 0.578], [0.245, 0.552], [0.16, 0.545], [0.095, 0.53], [0.058, 0.522],
  ], { thick: 0.9 });

  const shapes = [helix(), tree(), vaquita, cell(), rhino];
  // Shuffle which point goes where in each shape, so points travel when the shape changes.
  shapes.forEach((s) => {
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [s.pts[i], s.pts[j]] = [s.pts[j], s.pts[i]]; }
    let lo = 9, hi = -9; s.pts.forEach((p) => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
    s.yc = (lo + hi) / 2;                            // vertical centre, for placing the shape
  });

  // ---------- 3D Ornstein-Uhlenbeck noise per point (stationary N(0,1)) ----------
  const noise = Array.from({ length: N }, () => [gauss(), gauss(), gauss()]);
  const theta = 0.35;
  function stepNoise(dt) {
    const s = Math.sqrt(2 * theta * dt);
    for (const g of noise) for (let k = 0; k < 3; k++) g[k] += -theta * g[k] * dt + s * gauss();
  }

  // ---------- schedule ----------
  const PH = { noise: 1.6, form: 4.2, hold: 5.0, dissolve: 3.2 };
  const CYCLE = PH.noise + PH.form + PH.hold + PH.dissolve;
  function signal(t) {
    const k = Math.floor(t / CYCLE), r = t - k * CYCLE;
    let a;
    if (r < PH.noise) a = 0;
    else if (r < PH.noise + PH.form) a = ease((r - PH.noise) / PH.form);
    else if (r < PH.noise + PH.form + PH.hold) a = 1;
    else a = 1 - ease((r - PH.noise - PH.form - PH.hold) / PH.dissolve);
    return [k % shapes.length, a];
  }

  // ---------- layout ----------
  let W = 0, H = 0, dpr = 1, box = null, narrow = false, textRects = [];
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const textRight = Math.max(W * 0.3, ...[...hero.querySelectorAll("h1, p")].map((el) => el.getBoundingClientRect().right - r.left));
    textRects = [...hero.querySelectorAll("h1, p, .eyebrow, .hiring")].map((el) => {
      const b = el.getBoundingClientRect();
      return [b.left - r.left - 14, b.top - r.top - 10, b.right - r.left + 14, b.bottom - r.top + 10];
    });
    narrow = W - textRight < 320;
    box = narrow
      ? { x: W * 0.06, y: H * 0.1, w: W * 0.88, h: H * 0.8 }
      : { x: Math.max(textRight - 40, W * 0.42), y: H * 0.12, w: 0, h: H * 0.76 };
    if (!narrow) box.w = Math.min(W - 24 - box.x, 640);
  }

  let accent = "#6cb0ff", muted = "#8a93a3";
  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    accent = (cs.getPropertyValue("--accent") || accent).trim() || accent;
    muted = (cs.getPropertyValue("--muted") || muted).trim() || muted;
  }

  // ---------- draw ----------
  const P = Array.from({ length: N }, () => [0, 0, 0]);  // projected x, y, depth 0..1
  const order = [...Array(N).keys()];
  function draw(t) {
    const [si, a] = signal(t);
    const shape = shapes[si];
    const sa = Math.sqrt(a), sn = Math.sqrt(1 - a * 0.985);
    const s = Math.min(box.w, box.h / 0.66) * (shape.animal ? 0.84 : 0.8);
    const cx = narrow ? box.x + box.w / 2 : box.x + box.w - s / 2 - 8, cy = box.y + box.h / 2;
    // camera: a slow sway around the vertical axis and a slight downward look; the helix also spins
    const yaw = 0.62 * Math.sin((TAU * t) / 19) + (shape.animal ? 0.0 : 0.15), pitch = 0.22 + 0.06 * Math.sin((TAU * t) / 27);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const spin = shape.spin ? t * 0.55 * a : 0, cs_ = Math.cos(spin), ss_ = Math.sin(spin);
    const F = 2.4, spread = 0.2 * (1 - 0.85 * a);
    for (let i = 0; i < N; i++) {
      const p = shape.pts[i], g = noise[i];
      let x = p[0] - 0.5, y = p[1] - shape.yc, z = p[2];
      if (spin) { const y2 = y * cs_ - z * ss_; z = y * ss_ + z * cs_; y = y2; }
      x = sa * x + sn * g[0] * spread * 1.6;
      y = sa * y + sn * g[1] * spread;
      z = sa * z + sn * g[2] * spread;
      const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;   // yaw
      const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;       // pitch
      const k = F / (F - z2);
      P[i][0] = cx + x1 * s * k; P[i][1] = cy + y1 * s * k; P[i][2] = clamp(0.5 + z2 * 2.4, 0, 1);
    }
    order.sort((i, j) => P[i][2] - P[j][2]);           // far points first
    ctx.clearRect(0, 0, W, H);
    const base = narrow ? 0.4 : 0.92;
    const behindText = (x, y) => textRects.some(([l, tt, r, b]) => x > l && x < r && y > tt && y < b);
    for (const i of order) {
      const [x, y, d] = P[i];
      const f = behindText(x, y) ? (narrow ? 0.5 : 0.12) : 1;
      const e = shape.pts[i][3];                       // emphasis (cell only): fades in as the shape forms
      const em = e === undefined ? 0.5 : 0.5 + (e - 0.5) * a;
      ctx.globalAlpha = base * (0.18 + 0.72 * d) * f * (e === undefined ? 1 : 0.45 + 0.9 * em);
      ctx.fillStyle = d > 0.5 || em > 0.75 ? accent : muted;
      const r = (0.55 + 1.35 * d) * (e === undefined ? 1 : 0.75 + 0.5 * em);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
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
    if (Math.floor(t * 2) % 4 === 0) readColours();
    draw(t);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running && visible && !document.hidden && !reduceMotion) { running = true; last = null; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

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
