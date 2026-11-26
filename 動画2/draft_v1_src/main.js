import * as THREE from './node_modules/three/build/three.module.js';

const W = 1920, H = 1080;
const c2 = document.getElementById('c2');
const ctx = c2.getContext('2d');
const glc = document.getElementById('gl');
const TL = await (await fetch('timing.json?' + Date.now())).json();
const LOGO = new Image(); LOGO.src = 'logo.png'; await LOGO.decode();

// ---------- utils ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
const pr = (t, a, d) => clamp((t - a) / d);
const fadeIO = (t, a, b, f = .4) => clamp(Math.min((t - a) / f, (b - t) / f));
const SANS = "'Noto Sans CJK JP', sans-serif", SERIF = "'Noto Serif CJK JP', serif";
const CY = a => `rgba(90,225,240,${a})`;
const GOLD = a => `rgba(255,205,110,${a})`;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// monotone-ish smooth interpolation of data [[x,y],...] into n samples (Catmull-Rom)
function smooth(data, n = 240) {
  const out = [];
  const xs = data.map(d => d[0]);
  for (let i = 0; i < n; i++) {
    const x = lerp(xs[0], xs[xs.length - 1], i / (n - 1));
    let k = 0; while (k < data.length - 2 && data[k + 1][0] < x) k++;
    const p0 = data[Math.max(0, k - 1)], p1 = data[k], p2 = data[k + 1], p3 = data[Math.min(data.length - 1, k + 2)];
    const u = (x - p1[0]) / (p2[0] - p1[0]);
    const u2 = u * u, u3 = u2 * u;
    const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
    out.push([x, y]);
  }
  return out;
}

// ---------- 2D drawing helpers ----------
function txt(s, x, y, o = {}) {
  const { size = 48, font = SANS, weight = 700, color = '#fff', alpha = 1, align = 'center', glow = 0, glowColor = CY(.9), base = 'middle', spacing = 0, stroke = 0 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  ctx.letterSpacing = spacing + 'px';
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(0,10,15,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (glow) { ctx.shadowColor = glowColor; ctx.shadowBlur = glow; ctx.fillStyle = color; ctx.fillText(s, x, y); }
  ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(s, size, font = SANS, weight = 700, spacing = 0) {
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = spacing + 'px';
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}
function glowPath(pts, k, color = '#eafcff', w = 4, glowC = CY(.9), opt = {}) {
  if (k <= 0 || pts.length < 2) return null;
  const n = pts.length, m = k * (n - 1), mi = Math.floor(m), f = m - mi;
  const path = new Path2D();
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= mi; i++) path.lineTo(pts[i][0], pts[i][1]);
  let end = pts[mi];
  if (mi < n - 1) { end = [lerp(pts[mi][0], pts[mi + 1][0], f), lerp(pts[mi][1], pts[mi + 1][1], f)]; path.lineTo(end[0], end[1]); }
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (opt.dash) ctx.setLineDash(opt.dash);
  ctx.globalAlpha = opt.alpha ?? 1;
  ctx.shadowColor = glowC; ctx.shadowBlur = 30; ctx.strokeStyle = glowC; ctx.lineWidth = w * 2.2; ctx.globalAlpha *= .45; ctx.stroke(path);
  ctx.globalAlpha = opt.alpha ?? 1; ctx.shadowBlur = 12; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(path);
  ctx.restore();
  if (opt.head !== false && k < 1) dot(end[0], end[1], w * 2.2, color, glowC, opt.alpha ?? 1);
  return end;
}
function dot(x, y, r, color = '#fff', glowC = CY(1), alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
  g.addColorStop(0, glowC); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.restore();
}
function line(x1, y1, x2, y2, color, w = 2, alpha = 1, dash) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
// keyword tag: glowing dot + leader line + text (documentary style)
function keyTag(s, x, y, a, o = {}) {
  if (a <= 0) return;
  const len = 70 * eo(a);
  dot(x, y, 5, '#fff', o.glowC || CY(1), a);
  line(x, y, x + len, y, o.lineC || CY(.8), 2, a);
  txt(s, x + 90, y, { size: o.size || 46, align: 'left', alpha: a, glow: 18, weight: 700, ...o });
}

// ---------- backgrounds ----------
const dust = (() => { const r = rng(7); return Array.from({ length: 90 }, () => [r() * W, r() * H, r() * 1.6 + .4, r() * .5 + .1, r() * 6.28]); })();
function bg(t, o = {}) {
  const bright = o.bright || 0, warm = o.warm || 0, dim = o.dim || 0;
  const g = ctx.createRadialGradient(W / 2, H * .18, 50, W / 2, H * .45, 1400);
  const c0 = [lerp(lerp(14, 40, bright), 70, warm * .3), lerp(70, 120, bright), lerp(86, 140, bright)];
  g.addColorStop(0, `rgb(${c0.map(v => v * (1 - dim * .7) | 0)})`);
  g.addColorStop(.55, `rgb(${[4, 34, 44].map(v => v * (1 - dim * .7) + bright * 20 | 0)})`);
  g.addColorStop(1, `rgb(${[1, 9, 13].map(v => v * (1 - dim * .7) | 0)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (warm > 0) {
    const g2 = ctx.createRadialGradient(W / 2, H * .95, 10, W / 2, H * .95, 1300);
    g2.addColorStop(0, `rgba(255,190,110,${.35 * warm})`); g2.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
  // perspective grid room
  const vx = W / 2, vy = H * .44, ga = (o.grid ?? 1) * (1 - dim * .8);
  if (ga > 0) {
    ctx.save(); ctx.strokeStyle = CY(1); ctx.lineWidth = 1.2;
    const drift = (t * .25) % 1;
    for (let i = 0; i < 26; i++) {
      const d = 1 + i - drift; if (d <= .15) continue;
      const yy = vy + (H * .62) / d, yc = vy - (H * .5) / d;
      const a = ga * clamp(.22 / Math.sqrt(d));
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.moveTo(0, yc); ctx.lineTo(W, yc); ctx.stroke();
    }
    for (let k = -24; k <= 24; k++) {
      const bx = vx + k * 210;
      ctx.globalAlpha = ga * .13;
      ctx.beginPath(); ctx.moveTo(vx + (bx - vx) * .02, vy + 6); ctx.lineTo(vx + (bx - vx) * 1.0, H + 40);
      ctx.moveTo(vx + (bx - vx) * .02, vy - 5); ctx.lineTo(vx + (bx - vx) * 1.0, -40); ctx.stroke();
    }
    ctx.restore();
    // horizon haze
    const hz = ctx.createLinearGradient(0, vy - 160, 0, vy + 160);
    hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(.5, CY(.10 * ga)); hz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hz; ctx.fillRect(0, vy - 160, W, 320);
  }
  // light rays from above
  const L = o.light ?? .5;
  if (L > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const sw = Math.sin(t * .3 + i * 1.7) * 40;
      const x0 = W / 2 + (i - 3) * 70 + sw;
      const gr = ctx.createLinearGradient(0, -50, 0, H * .8);
      gr.addColorStop(0, `rgba(170,240,255,${.09 * L})`); gr.addColorStop(1, 'rgba(170,240,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 - 10, -50); ctx.lineTo(x0 + 10, -50);
      ctx.lineTo(x0 + (i - 3) * 260 + 160, H * .8); ctx.lineTo(x0 + (i - 3) * 260 - 160, H * .8); ctx.fill();
    }
    const tg = ctx.createRadialGradient(W / 2, -40, 0, W / 2, -40, 520);
    tg.addColorStop(0, `rgba(210,250,255,${.45 * L})`); tg.addColorStop(1, 'rgba(210,250,255,0)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 600);
    ctx.restore();
  }
  // dust
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a, ph] of dust) {
    const yy = (y - t * 12 * r + H * 10) % H, xx = x + Math.sin(t * .4 + ph) * 20;
    ctx.globalAlpha = a * (.6 + .4 * Math.sin(t * 1.3 + ph)) * (1 - dim * .6); ctx.fillStyle = '#bff6ff';
    ctx.beginPath(); ctx.arc(xx, yy, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// chart frame
function chart(box, ax, a) {
  const { x, y, w, h } = box;
  const X = v => x + (v - ax.x0) / (ax.x1 - ax.x0) * w;
  const Y = v => y + h - (v - ax.y0) / (ax.y1 - ax.y0) * h;
  if (a > 0) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = CY(.18); ctx.lineWidth = 1;
    for (const v of ax.yt) { ctx.beginPath(); ctx.moveTo(x, Y(v)); ctx.lineTo(x + w, Y(v)); ctx.stroke(); }
    for (const v of ax.xt) { ctx.beginPath(); ctx.moveTo(X(v), y); ctx.lineTo(X(v), y + h); ctx.stroke(); }
    ctx.strokeStyle = CY(.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
    ctx.restore();
    for (const v of ax.yt) txt((ax.yf ? ax.yf(v) : v.toLocaleString()), x - 16, Y(v), { size: 22, weight: 500, align: 'right', color: '#9fdbe6', alpha: a });
    for (const v of ax.xt) txt(String(v), X(v), y + h + 30, { size: 22, weight: 500, color: '#9fdbe6', alpha: a });
    if (ax.ylabel) txt(ax.ylabel, x, y - 34, { size: 24, weight: 500, align: 'left', color: '#bfeef5', alpha: a });
  }
  return { X, Y };
}
function watermark(s, a) { // placeholder notice
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const w = measure(s, 22, SANS, 700) + 36;
  ctx.fillStyle = 'rgba(255,120,60,.18)'; ctx.strokeStyle = 'rgba(255,150,90,.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(W - w - 60, 60, w, 44, 6); ctx.fill(); ctx.stroke(); ctx.restore();
  txt(s, W - w / 2 - 60, 83, { size: 22, color: '#ffd2b8', alpha: a });
}
function footnote(s, a) { txt(s, W - 60, H - 150, { size: 18, weight: 400, align: 'right', color: '#8cc6d0', alpha: a * .9 }); }

// ---------- Scene 1: 3D population mountain ----------
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
const s1 = (() => {
  const scene = new THREE.Scene();
  const BG = 0x05222c;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 90, 330);
  const cam = new THREE.PerspectiveCamera(34, W / H, .1, 2000);
  const pop = [[1950, 4966], [1955, 5473], [1960, 6047], [1965, 6744], [1970, 7212], [1975, 7581], [1980, 7883], [1985, 8251], [1990, 8590], [1995, 8726], [2000, 8638], [2005, 8442], [2010, 8174], [2015, 7728], [2020, 7509], [2025, 7310], [2030, 7076], [2035, 6722], [2040, 6213], [2045, 5832], [2050, 5540], [2055, 5307], [2060, 5078], [2065, 4809], [2070, 4535]];
  const PX = y => (y - 1950) * 1.6, PY = p => (p - 3800) / 70;
  const sm = smooth(pop.map(([y, p]) => [y, p]), 481);
  const pts = sm.map(([y, p]) => new THREE.Vector3(PX(y), PY(p), 0));
  const surf = yr => { const i = clamp((yr - 1950) / 120) * 480; const a = Math.floor(i), f = i - a; const p0 = pts[a], p1 = pts[Math.min(480, a + 1)]; return lerp(p0.y, p1.y, f); };
  // mountain solid
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, 0); for (const p of pts) shape.lineTo(p.x, p.y); shape.lineTo(pts[480].x, 0); shape.closePath();
  const D = 40;
  const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geo.translate(0, 0, -D / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: .55, metalness: 0, emissive: 0x16404a, emissiveIntensity: .35, transparent: true, opacity: 1 });
  const mountain = new THREE.Mesh(geo, mat); scene.add(mountain);
  // stripes across the top surface
  const sg = []; for (let yr = 1950; yr <= 2070; yr += 2) { const x = PX(yr), y = surf(yr) + .05; sg.push(x, y, -D / 2, x, y, D / 2); }
  const stripeGeo = new THREE.BufferGeometry(); stripeGeo.setAttribute('position', new THREE.Float32BufferAttribute(sg, 3));
  const stripes = new THREE.LineSegments(stripeGeo, new THREE.LineBasicMaterial({ color: 0x9fb8c2, transparent: true, opacity: .55 }));
  scene.add(stripes);
  // glowing line (tube)
  const curve = new THREE.CatmullRomCurve3(pts.filter((_, i) => i % 4 === 0));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, .45, 8), new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true }));
  const tubeG = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0x5fe3f2, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  tube.position.z = tubeG.position.z = D / 2 + .3;
  const rail = new THREE.Mesh(tube.geometry, tube.material); rail.position.z = -D / 2 - .3; rail.visible = false;
  scene.add(tube, tubeG, rail);
  const TUBE_IDX = 600 * 8 * 6;
  // grids
  const mkGrid = (size, div, op) => { const g = new THREE.GridHelper(size, div, 0x58dbe9, 0x58dbe9); g.material.transparent = true; g.material.opacity = op; g.material.depthWrite = false; return g; };
  const floor = mkGrid(900, 90, .22); floor.position.set(100, 0, 0); scene.add(floor);
  const ceil = mkGrid(900, 60, .10); ceil.position.set(100, 170, 0); scene.add(ceil);
  const wall = mkGrid(700, 70, .26); wall.rotation.x = Math.PI / 2; wall.position.set(90, 60, -40); scene.add(wall);
  // lights
  scene.add(new THREE.HemisphereLight(0xd8f7ff, 0x05303a, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(20, 120, 80); scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0x9fefff, .7); dl2.position.set(-60, 40, -40); scene.add(dl2);
  // light beams (additive cones) from above
  const beams = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const cg = new THREE.ConeGeometry(14 + i * 4, 170, 32, 1, true);
    const cm = new THREE.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: .035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(cg, cm); c.position.set(PX(1995) + (i - 2) * 8, 95, -10 + i * 3); c.rotation.z = (i - 2) * .06; beams.add(c);
  }
  scene.add(beams);
  const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };
  return { scene, cam, PX, PY, surf, mountain, mat, stripes, tube, tubeG, rail, TUBE_IDX, D, proj, pop, beams };
})();

function drawS1(t, sc) {
  const L = sc.L, dur = sc.dur;
  const { cam, PX, PY, surf, mountain, mat, stripes, tube, tubeG, TUBE_IDX, D, proj } = s1;
  const tr = 0;
  // phase timings
  const drawEnd = L[1] - .2;                // line grows 1950 -> 1995
  const tA = L[3] - .5, tB = tA + 3.0;      // transition to ride
  const rideEnd = dur - 4.2;                // reach crest
  const k = pr(t, .4, drawEnd - .4);        // line growth (to 1995)
  const extrude = ease(pr(t, tA, 2.2));
  // line progress: to 1995 (=45/120) in phase A, rest after transition
  const lp = lerp(0, 45 / 120, ease(k)) + (1 - 45 / 120) * ease(pr(t, tA + 1.0, 2.0));
  tube.geometry.setDrawRange(0, Math.floor(TUBE_IDX * lp / 6) * 6);
  tubeG.geometry.setDrawRange(0, Math.floor(TUBE_IDX * lp / 6) * 6);
  tube.material.opacity = 1 - extrude * .6; tubeG.material.opacity = .22 * (1 - extrude * .5);
  tube.position.z = tubeG.position.z = lerp(0, D / 2 + .3, extrude);
  mountain.scale.z = Math.max(.002, extrude); mat.opacity = extrude; mountain.visible = extrude > 0.001;
  stripes.scale.z = Math.max(.002, extrude); stripes.material.opacity = .55 * extrude; stripes.visible = extrude > .001;
  // camera
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const front = { p: V(PX(1976), PY(6550), 168), l: V(PX(1976), PY(6550), 0) };
  const peak = V(PX(1995), surf(1995) + 6, 0);
  const startP = V(-55, surf(1950) + 26, 0);
  const bez = (a, b, c, d, u) => { const v = 1 - u; return V(0, 0, 0).addScaledVector(a, v * v * v).addScaledVector(b, 3 * v * v * u).addScaledVector(c, 3 * v * u * u).addScaledVector(d, u * u * u); };
  let p, l, fov;
  if (t < tA) { p = front.p.clone(); p.x += Math.sin(t * .25) * 3; l = front.l.clone(); fov = 34; }
  else if (t < tB) {
    const u = ease(pr(t, tA, tB - tA));
    p = bez(front.p, V(front.p.x - 30, front.p.y + 45, front.p.z - 10), V(-90, startP.y + 40, 70), startP, u);
    l = V().lerpVectors(front.l, peak, u); fov = lerp(34, 55, u);
  } else if (t < rideEnd) {
    const u = ease(pr(t, tB, rideEnd - tB));
    const x = lerp(-55, PX(1992), u);
    const yr = 1950 + Math.max(0, x) / 1.6;
    p = V(x, surf(yr) + lerp(26, 18, u), 0);
    l = V().lerpVectors(peak, V(PX(2012), surf(2012) - 2, 0), pr(u, .75, .25)); fov = 55;
  } else {
    const u = eo(pr(t, rideEnd, dur - rideEnd));
    const x = lerp(PX(1992), PX(2012), u), yr = 1950 + x / 1.6;
    p = V(x, surf(yr) + 14 + u * 4, 0);
    l = V().lerpVectors(V(PX(2012), surf(2012) - 2, 0), V(PX(2058), surf(2058) - 8, 0), u); fov = lerp(55, 62, u);
  }
  cam.position.copy(p); cam.lookAt(l);
  cam.fov = fov; cam.updateProjectionMatrix();
  s1.rail.visible = extrude > .5;
  s1.beams.visible = t > tA + 1;
  renderer.render(s1.scene, cam);

  // ---- 2D overlay ----
  ctx.clearRect(0, 0, W, H);
  const aA = 1 - pr(t, tA - .2, .8); // phase A overlay alpha
  if (aA > 0) {
    // axis labels by projection
    for (let y = 1950; y <= 2070; y += 10) {
      const [sx, sy] = proj(PX(y), PY(4300), 0);
      const vis = y <= 1995 ? 1 : 0;
      txt(String(y), sx, sy + 28, { size: 22, weight: 500, color: '#9fdbe6', alpha: aA * vis * pr(t, .3, .8) });
    }
    for (const v of [5000, 6000, 7000, 8000]) {
      const [sx, sy] = proj(PX(1950), PY(v), 0);
      txt(v.toLocaleString() + '万', sx - 18, sy, { size: 20, weight: 500, color: '#9fdbe6', align: 'right', alpha: aA * pr(t, .3, .8) });
    }
    txt('生産年齢人口（15〜64歳）', 160, 150, { size: 30, align: 'left', alpha: aA * pr(t, .6, .8), glow: 10 });
    // peak marker
    const pa = pr(t, L[1] - .1, .7) * aA;
    if (pa > 0) {
      const [px, py] = proj(PX(1995), PY(8726), 0);
      const [x0, y0] = proj(PX(1950), PY(8726), 0);
      const [bx, by] = proj(PX(1995), PY(4300), 0);
      line(x0, py, lerp(x0, px, eo(pa)), py, '#e8fbff', 2, pa);
      line(px, by, px, lerp(by, py, eo(pa)), '#e8fbff', 2, pa);
      dot(px, py, 8, '#fff', CY(1), pa);
      txt('1995年', px - 26, py - 100, { size: 34, align: 'right', alpha: pa, glow: 14 });
      txt('約8,700万人', px - 26, py - 50, { size: 54, align: 'right', alpha: pa, glow: 18, spacing: 2 });
      keyTag('ピーク', px + 30, py - 30, pr(t, L[2], .6) * aA, { size: 44 });
    }
  }
  // ride captions
  keyTag('1995年 ピーク', W * .5 - 180, H * .28, fadeIO(t, rideEnd - 2.4, rideEnd + .6, .5), { size: 50 });
  const bigA = pr(t, rideEnd + .6, .8) * (1 - pr(t, dur - .5, .5));
  if (bigA > 0) {
    txt('人口減少の時代へ', W / 2, H * .46, { size: 118, font: SERIF, weight: 900, alpha: bigA, glow: 30, stroke: 10, spacing: 6 });
  }
  footnote('出典：総務省「人口推計」、国立社会保障・人口問題研究所（2023年推計・中位）をもとに作成（概数）', pr(t, .5, 1) * (1 - pr(t, tA, 1)));
}

// ---------- Scene 2: shrinking domestic demand ----------
const s2data = (() => {
  const yrs = [1995, 1998, 2001, 2004, 2007, 2010, 2013, 2016, 2019, 2022, 2024];
  const mk = arr => smooth(yrs.map((y, i) => [y, arr[i]]), 160);
  return [
    { name: '国内需要', s: mk([100, 98, 97, 96, 95, 93, 93, 92, 91, 90, 90]) },
    { name: '平均給与', s: mk([100, 99, 95, 92, 91, 87, 87, 89, 90, 89, 90]) },
    { name: '設備投資', s: mk([100, 97, 88, 84, 89, 76, 80, 84, 86, 84, 85]) },
    { name: '税収', s: mk([100, 94, 90, 82, 88, 74, 81, 86, 88, 89, 88]) },
  ];
})();
function drawS2(t, sc) {
  const L = sc.L, dur = sc.dur;
  bg(t, { light: .35 });
  const box = { x: 300, y: 190, w: 1260, h: 600 };
  const fut = pr(t, L[4] - .2, 2.5);
  const { X, Y } = chart(box, { x0: 1995, x1: lerp(2024, 2040, ease(fut)), y0: 50, y1: 110, xt: [1995, 2000, 2005, 2010, 2015, 2020].concat(fut > .5 ? [2030, 2040] : []), yt: [60, 70, 80, 90, 100, 110], ylabel: '1995年＝100' }, pr(t, .2, .8));
  // baseline 100
  line(X(1995), Y(100), X(2024), Y(100), '#ffffff', 1.5, .5 * pr(t, .6, .6), [8, 8]);
  const ends = s2data.map((d, i) => [i, Y(d.s[d.s.length - 1][1])]).sort((a, b) => a[1] - b[1]);
  const ly = {}; let last = -1e9; for (const [i, y] of ends) { const yy = Math.max(y, last + 40); ly[i] = yy; last = yy; }
  const st = L[1];
  const span = Math.max(.6, (sc.Le[1] - st) / 4);
  s2data.forEach((d, i) => {
    const a0 = st + i * span * .95;
    const k = ease(pr(t, a0, 1.6));
    const pts = d.s.map(([x, y]) => [X(x), Y(y)]);
    const dim = 1 - .45 * pr(t, L[3] - .2, .6) * (i ? 1 : 1);
    const end = glowPath(pts, k, '#eafcff', 3.5, CY(.9), { alpha: dim });
    if (k >= 1) keyTag(d.name, X(2024) + 4, ly[i], pr(t, a0 + 1.4, .5) * dim, { size: 30 });
  });
  // future decline (dashed)
  if (fut > 0) {
    const fpts = smooth([[2024, 89], [2028, 86], [2032, 80], [2036, 72], [2040, 62]], 60).map(([x, y]) => [X(x), Y(y)]);
    glowPath(fpts, ease(fut), '#ffb08a', 4, 'rgba(255,120,80,.8)', { dash: [14, 12] });
    txt('人口減少で さらに加速', X(2032), Y(60), { size: 40, color: '#ffd0b8', alpha: pr(t, L[5], .6), glow: 16, glowColor: 'rgba(255,110,70,.9)' });
  }
  const ca = pr(t, L[3], .7) * (1 - pr(t, L[4] + .4, .6));
  if (ca > 0) txt('縮みゆく内需', W / 2, H * .44, { size: 110, font: SERIF, weight: 900, alpha: ca, glow: 26, stroke: 10, spacing: 8 });
  watermark('仮グラフ：鶴原さん作成のグラフに差し替え', pr(t, .3, .6));
}

// ---------- Scene 3: world grows ----------
const globePts = (() => { const n = 1500, out = []; for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; out.push([Math.cos(th) * r, y, Math.sin(th) * r]); } return out; })();
const worldPop = [[1950, 25.4], [1960, 30.2], [1970, 37.0], [1980, 44.4], [1990, 53.3], [1995, 57.4], [2000, 61.5], [2010, 69.9], [2020, 78.4], [2025, 82.3]];
function globe(cx, cy, R, t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const rot = t * .25, tilt = .35;
  for (const [x, y, z] of globePts) {
    const x1 = x * Math.cos(rot) + z * Math.sin(rot), z1 = -x * Math.sin(rot) + z * Math.cos(rot);
    const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
    const f = (z2 + 1) / 2;
    ctx.globalAlpha = a * (.15 + .85 * f) * .9; ctx.fillStyle = f > .5 ? '#bff7ff' : '#4fb8c8';
    ctx.beginPath(); ctx.arc(cx + x1 * R, cy - y2 * R, 1.2 + 2 * f, 0, 7); ctx.fill();
  }
  const g = ctx.createRadialGradient(cx, cy, R * .7, cx, cy, R * 1.35);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.75, CY(.12 * a)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 7); ctx.fill();
  ctx.restore();
}
function drawS3(t, sc) {
  const L = sc.L, dur = sc.dur;
  const open = pr(t, L[1] - .3, 1.6);
  bg(t, { dim: 1 - open, light: .2 + open * .8 });
  // a single beam of light
  const beam = pr(t, .3, 1.2);
  if (beam > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const x = lerp(W * .2, W * .5, ease(beam));
    const g = ctx.createLinearGradient(x - 200, 0, x + 200, H);
    g.addColorStop(0, `rgba(220,250,255,${.55 * beam * (1 - open * .7)})`); g.addColorStop(1, 'rgba(220,250,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 6, -20); ctx.lineTo(x + 6, -20); ctx.lineTo(x + 220, H); ctx.lineTo(x - 120, H); ctx.fill(); ctx.restore();
  }
  txt('しかし——', W / 2, H * .45, { size: 100, font: SERIF, weight: 900, alpha: pr(t, .2, .6) * (1 - pr(t, L[1] - .2, .5)), glow: 24, spacing: 10 });
  // globe zoom
  const gz = ease(pr(t, L[1] - .2, 2.4));
  const gx = lerp(W / 2, 520, ease(pr(t, L[2] - .3, 1.4)));
  globe(gx, H * .47, lerp(80, 330, gz), t, gz);
  // world population chart
  const ca = pr(t, L[2] - .2, .8);
  const box = { x: 1000, y: 250, w: 760, h: 480 };
  const { X, Y } = chart(box, { x0: 1950, x1: 2025, y0: 0, y1: 90, xt: [1950, 1975, 2000, 2025], yt: [0, 30, 60, 90], ylabel: '世界の人口（億人）' }, ca);
  const pts = smooth(worldPop, 160).map(([x, y]) => [X(x), Y(y)]);
  const k = ease(pr(t, L[2], 2.4));
  glowPath(pts, k, '#fff4d8', 4.5, GOLD(.9));
  if (k > .3) {
    const [x95, y95] = [X(1995), Y(57.4)];
    dot(x95, y95, 6, '#fff', CY(1), pr(t, L[2] + .8, .4));
    txt('1995年 約57億人', x95 - 20, y95 - 40, { size: 28, align: 'right', alpha: pr(t, L[2] + .8, .5), glow: 10 });
  }
  if (k >= .98) {
    const [xe, ye] = [X(2025), Y(82.3)];
    txt('約82億人', xe, ye - 52, { size: 46, align: 'right', alpha: pr(t, L[2] + 2.3, .5), glow: 18, glowColor: GOLD(1) });
    txt('2025年', xe, ye - 100, { size: 26, align: 'right', alpha: pr(t, L[2] + 2.3, .5) });
  }
  const ma = pr(t, L[3], .7);
  if (ma > 0) txt('世界の市場は、拡大を続けている', W / 2, 150, { size: 56, font: SERIF, weight: 900, alpha: ma, glow: 22, glowColor: GOLD(.8), spacing: 4 });
  footnote('出典：国連「World Population Prospects」をもとに作成（概数）', ca);
}

// ---------- Scene 4: foreign earnings ----------
const EXP = [[1995, 41.5], [1997, 50.9], [2000, 51.7], [2003, 54.5], [2005, 65.7], [2007, 83.9], [2008, 81.0], [2009, 54.2], [2010, 67.4], [2012, 63.7], [2014, 73.1], [2016, 70.0], [2018, 81.5], [2020, 68.4], [2021, 83.1], [2022, 98.2], [2024, 107.1]];
const GDP = [[1995, 521.6], [1997, 533.4], [2000, 528.4], [2003, 515.4], [2005, 525.0], [2007, 530.9], [2009, 491.9], [2012, 494.4], [2015, 538.0], [2018, 556.6], [2020, 539.1], [2022, 566.5], [2024, 609.3]];
function drawS4(t, sc) {
  const L = sc.L, dur = sc.dur;
  const out = pr(t, L[5] - .3, 1.0);
  bg(t, { light: .35, dim: out * .5 });
  const box = { x: 300, y: 200, w: 1220, h: 580 };
  const ca = pr(t, .2, .8) * (1 - out * .75);
  const { X, Y } = chart(box, { x0: 1995, x1: 2024, y0: 0, y1: 280, xt: [1995, 2000, 2005, 2010, 2015, 2020], yt: [0, 50, 100, 150, 200, 250], ylabel: '1995年＝100' }, ca);
  // ghost of S2 lines
  s2data.forEach(d => glowPath(d.s.map(([x, y]) => [X(x), Y(y)]), 1, '#6c98a3', 2, CY(.2), { alpha: .35 * ca, head: false }));
  const ek = ease(pr(t, L[1] + .2, 3.2));
  const ep = smooth(EXP.map(([y, v]) => [y, v / 41.5 * 100]), 200).map(([x, y]) => [X(x), Y(y)]);
  glowPath(ep, ek, '#fff1cc', 5, GOLD(1), { alpha: 1 - out * .7 });
  if (ek > .97) keyTag('外貨獲得（輸出額）約2.6倍', X(2024) - 520, Y(258) - 10, pr(t, L[1] + 3.3, .5) * (1 - out), { size: 34, glowC: GOLD(1), lineC: GOLD(.8), glowColor: GOLD(.8) });
  const gk = ease(pr(t, L[3] + .1, 2.4));
  const gp = smooth(GDP.map(([y, v]) => [y, v / 521.6 * 100]), 200).map(([x, y]) => [X(x), Y(y)]);
  glowPath(gp, gk, '#ffffff', 5, CY(1), { alpha: 1 - out * .7 });
  if (gk > .97) keyTag('GDP　ほぼ横ばい', X(2024) - 420, Y(117) + 60, pr(t, L[4], .5) * (1 - out), { size: 38 });
  const eqA = fadeIO(t, L[3] + .3, L[5] - .1, .5);
  if (eqA > 0) {
    ctx.save(); ctx.globalAlpha = eqA; ctx.fillStyle = 'rgba(2,20,28,.75)'; ctx.strokeStyle = CY(.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(W / 2 - 400, 100, 800, 76, 8); ctx.fill(); ctx.stroke(); ctx.restore();
    txt('GDP ＝ 内需 ＋ 投資 ＋ 外需', W / 2, 139, { size: 40, alpha: eqA, spacing: 3 });
  }
  const fa = pr(t, L[7] - .1, .8);
  if (fa > 0) {
    txt('30年以上、日本を支えてきたもの', W / 2, H * .36, { size: 44, alpha: pr(t, L[5], .8), glow: 12 });
    txt('外貨獲得', W / 2, H * .52, { size: 170, font: SERIF, weight: 900, alpha: fa, glow: 40, glowColor: GOLD(.9), stroke: 12, spacing: 16 });
  } else {
    txt('30年以上、日本を支えてきたもの', W / 2, H * .36, { size: 44, alpha: pr(t, L[5], .8), glow: 12 });
  }
  footnote('出典：財務省「貿易統計」、内閣府「国民経済計算」をもとに作成（名目・概数）　※使用する指標は要確認', ca);
  watermark('仮グラフ：指標（純輸出／経常収支など）要確認', pr(t, .3, .6));
}

// ---------- Scene 5: 2009 founding ----------
function drawS5(t, sc) {
  const L = sc.L, dur = sc.dur;
  const br = ease(pr(t, 0, 2.0));
  bg(t, { bright: br * .7, warm: br, light: .9 });
  const yr = Math.round(lerp(1995, 2009, ease(pr(t, .2, 1.6))));
  const ya = pr(t, .1, .4) * (1 - pr(t, L[3] - .5, .5));
  const yy = lerp(H * .45, H * .3, ease(pr(t, L[1] - .3, 1)));
  const ys = lerp(260, 170, ease(pr(t, L[1] - .3, 1)));
  txt(String(yr), W / 2, yy, { size: ys, font: SERIF, weight: 900, alpha: ya, glow: 40, glowColor: GOLD(.9), spacing: 12 });
  txt('設立', W / 2, yy + ys * .62, { size: 50, alpha: pr(t, 1.9, .5) * (1 - pr(t, L[1] - .4, .4)), spacing: 20 });
  // company logo
  const la = pr(t, L[1] + .2, .8) * (1 - pr(t, L[3] - .4, .5));
  if (la > 0) {
    const lw = 480, lh = lw * LOGO.height / LOGO.width, cw = lw + 120, ch = lh + 80;
    const cx = W / 2, cy = H * .53 + lerp(20, 0, eo(la));
    ctx.save(); ctx.globalAlpha = la;
    ctx.shadowColor = 'rgba(190,240,255,.8)'; ctx.shadowBlur = 50;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 18); ctx.fill();
    ctx.shadowBlur = 0; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, cx - lw / 2, cy - lh / 2, lw, lh); ctx.restore();
    txt('グローバルパートナーズ株式会社', W / 2, cy + ch / 2 + 58, { size: 46, alpha: pr(t, L[1] + .6, .7) * (1 - pr(t, L[3] - .4, .5)), glow: 16, spacing: 4 });
    txt('（2009年 アリババマーケティング株式会社として設立）', W / 2, cy + ch / 2 + 108, { size: 26, weight: 500, color: '#cdeef4', alpha: pr(t, L[1] + 1.0, .7) * (1 - pr(t, L[3] - .4, .5)) });
  }
  const ma = pr(t, L[1] + .4, .8) * (1 - pr(t, L[3] - .4, .5));
  // export arrows
  const ea = pr(t, L[3] - .2, .8);
  if (ea > 0) {
    const cx = W / 2, cy = H * .52;
    dot(cx, cy, 16, '#fff', GOLD(1), ea);
    txt('日本', cx, cy + 56, { size: 34, alpha: ea });
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI * .95 + i * (Math.PI * .9 / 9) + Math.PI * .0;
      const k = ease(pr(t, L[3] + i * .08, 1.2));
      const r1 = 40, r2 = lerp(40, 420 + (i % 3) * 60, k);
      const x2 = cx + Math.cos(ang) * r2 * 1.5, y2 = cy + Math.sin(ang) * r2 * .75;
      line(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * .5, x2, y2, GOLD(.9), 3, ea * .9);
      dot(x2, y2, 5, '#fff', GOLD(1), ea * k);
    }
    txt('日本企業の「輸出」を広げる', W / 2, H * .2, { size: 72, font: SERIF, weight: 900, alpha: pr(t, L[4], .7), glow: 24, glowColor: GOLD(.8), spacing: 4 });
  }
}

// ---------- Scene 6: exports can grow ----------
function gauge(cx, cy, r, val, label, sub, a, k, col) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 26; ctx.strokeStyle = CY(.15); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.max(.02, val * k) * Math.PI * 2); ctx.stroke(); ctx.restore();
  txt(label, cx, cy - r - 60, { size: 40, alpha: a, glow: 10 });
  txt(sub, cx, cy, { size: 72, alpha: a * pr(k, .3, .7), glow: 18, glowColor: col, font: SERIF, weight: 900 });
}
const EXPG = [['中国', 1171], ['アメリカ', 440], ['ドイツ', 236], ['韓国', 72], ['日本', 2]];
const mound = (() => { const r = rng(3); return Array.from({ length: 900 }, () => { const u = r() * 2 - 1, v = r(); return [u, v, r()]; }); })();
function drawS6(t, sc) {
  const L = sc.L, dur = sc.dur;
  bg(t, { bright: .25, light: .5 });
  // phase 1: gauges
  const g1 = pr(t, .1, .7) * (1 - pr(t, L[2] - .2, .6));
  gauge(W * .32, H * .5, 190, .022, '日本', '約2%', g1, ease(pr(t, .4, 1.5)), 'rgba(120,230,245,1)');
  gauge(W * .68, H * .5, 190, .65, 'ヨーロッパなど', '6〜7割', pr(t, L[1] - .1, .7) * (1 - pr(t, L[2] - .2, .6)), ease(pr(t, L[1], 1.8)), GOLD(1));
  txt('輸出に取り組む企業の割合', W / 2, 140, { size: 44, alpha: g1, glow: 10 });
  const p2 = pr(t, L[2] - .1, .7) * (1 - pr(t, L[3] - .3, .5));
  if (p2 > 0) txt('輸出は、まだまだ伸ばせる', W / 2, H * .46, { size: 96, font: SERIF, weight: 900, alpha: p2, glow: 30, glowColor: GOLD(.8), stroke: 10, spacing: 6 });
  // phase 2: bars
  const b = pr(t, L[3] - .2, .7) * (1 - pr(t, L[7] - .3, .6));
  if (b > 0) {
    txt('10年間の輸出額の伸び（2013→2023年）', W / 2, 150, { size: 40, alpha: b, glow: 10 });
    const x0 = 520, maxW = 1100;
    EXPG.forEach(([n, v], i) => {
      const y = 280 + i * 130;
      const k = ease(pr(t, L[3] + i * .25, 1.4));
      const isJ = n === '日本', isC = n === '中国';
      txt(n, x0 - 30, y, { size: 44, align: 'right', alpha: b, color: isJ ? '#ffe6a8' : '#fff' });
      ctx.save(); ctx.globalAlpha = b; ctx.fillStyle = CY(.12); ctx.fillRect(x0, y - 30, maxW, 60);
      const col = isC ? GOLD(1) : isJ ? 'rgba(255,140,100,1)' : CY(.95);
      ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.fillStyle = col; ctx.fillRect(x0, y - 30, Math.max(4, maxW * v / 1171 * k), 60); ctx.restore();
      if (isJ) keyTag('ほとんど伸びていない', x0 + 30, y, pr(t, L[5] - .4, .6) * b, { size: 34, glowC: 'rgba(255,140,100,1)', lineC: 'rgba(255,160,120,.9)', color: '#ffd9c8' });
    });
    const ca = pr(t, L[6] - .1, .6) * b;
    txt('約200兆円', x0 + maxW - 20, 280, { size: 50, align: 'right', alpha: ca, color: '#2a1a00', weight: 900 });
  }
  // phase 3: dust becomes a mountain (chiri-tsumo)
  const m = pr(t, L[7] - .2, .8);
  if (m > 0) {
    const grow = ease(pr(t, L[7], (sc.Le[8] - L[7]) * .9));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [u, v, r] of mound) {
      const hmax = 420 * Math.exp(-u * u * 3.2);
      const fall = clamp((grow * 1.25 - r * .25));
      const tx = W / 2 + u * 760, ty = H * .8 - v * hmax * grow;
      const sy = lerp(-30 - r * 400, ty, ease(fall));
      ctx.globalAlpha = m * (.35 + .65 * fall); ctx.fillStyle = r > .7 ? '#ffe3a3' : '#c8f6ff';
      ctx.beginPath(); ctx.arc(tx, sy, 2.4 + r * 1.6, 0, 7); ctx.fill();
    }
    ctx.restore();
    keyTag('ブランドを持たない中小企業', 180, 200, pr(t, L[7], .6), { size: 44 });
    txt('塵も積もれば、数百兆円', W / 2, H * .36, { size: 80, font: SERIF, weight: 900, alpha: pr(t, L[8] + .2, .7), glow: 28, glowColor: GOLD(.9), stroke: 10, spacing: 4 });
  }
  watermark('仮グラフ：社長共有のグラフに差し替え　※数値は要確認', pr(t, .3, .6));
  footnote('輸出企業の割合は社長談（要確認）／輸出額：WTO統計をもとに作成（ドル建て・概数）', pr(t, .3, .6));
}

// ---------- Scene 7: exports change Japan ----------
function node(x, y, r, label, a, col = CY(1), size = 40) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(4,30,40,.85)'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.arc(x, y, r * eo(a), 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
  txt(label, x, y, { size, alpha: a });
}
function arrow(x1, y1, x2, y2, a, col = CY(.9)) {
  if (a <= 0) return;
  const k = eo(a), xe = lerp(x1, x2, k), ye = lerp(y1, y2, k);
  line(x1, y1, xe, ye, col, 4, a);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(xe, ye);
  ctx.lineTo(xe - 18 * Math.cos(ang - .45), ye - 18 * Math.sin(ang - .45)); ctx.lineTo(xe - 18 * Math.cos(ang + .45), ye - 18 * Math.sin(ang + .45)); ctx.fill(); ctx.restore();
}
function drawS7(t, sc) {
  const L = sc.L, dur = sc.dur;
  bg(t, { bright: .35, warm: .4, light: .7 });
  const endA = pr(t, L[8] - .3, .8);
  const fa = 1 - endA;
  txt('世界に誇れる、製品と技術', W / 2, 140, { size: 50, alpha: pr(t, 0, .6) * (1 - pr(t, L[1] - .3, .5)), glow: 14 });
  const cy = H * .34;
  const xs = [W * .2, W * .5, W * .8];
  node(xs[0], cy, 110, '輸出', pr(t, L[1], .6) * fa, GOLD(1), 52);
  txt('＋数十兆〜数百兆円', xs[0], cy + 150, { size: 32, alpha: pr(t, L[1] + .6, .6) * fa, color: '#ffe6b0' });
  arrow(xs[0] + 125, cy, xs[1] - 125, cy, pr(t, L[2], .8) * fa);
  node(xs[1], cy, 110, 'GDP', pr(t, L[2] + .3, .6) * fa, CY(1), 52);
  arrow(xs[1] + 125, cy, xs[2] - 125, cy, pr(t, L[3], .8) * fa);
  node(xs[2], cy, 110, '所得', pr(t, L[3] + .3, .6) * fa, CY(1), 52);
  const items = ['育児', '介護', '医療', '設備投資', 'インフラ'];
  const cue = [L[4], L[4] + .35, L[4] + .7, L[5], L[5] + .5];
  items.forEach((s, i) => {
    const x = W * (.18 + i * .16), y = H * .66;
    node(x, y, 82, s, pr(t, cue[i], .5) * fa, 'rgba(160,240,220,1)', s.length > 3 ? 30 : 38);
  });
  const ta = pr(t, L[7] - .1, .6) * fa;
  if (ta > 0) {
    ctx.save(); ctx.globalAlpha = ta; ctx.fillStyle = 'rgba(4,30,40,.8)'; ctx.strokeStyle = GOLD(.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(W / 2 - 430, H * .8 - 40, 860, 80, 10); ctx.fill(); ctx.stroke(); ctx.restore();
    txt('消費税・社会保険料の負担を軽く', W / 2, H * .8, { size: 42, alpha: ta });
  }
  if (endA > 0) {
    txt('輸出を伸ばすこと。', W / 2, H * .42, { size: 120, font: SERIF, weight: 900, alpha: endA, glow: 34, glowColor: GOLD(.9), stroke: 10, spacing: 8 });
    txt('いま日本が、最も目指すべき道', W / 2, H * .6, { size: 54, alpha: pr(t, L[9], .7), glow: 14 });
  }
}

// ---------- Scene 8: it takes 20-30 years ----------
const city = (() => { const r = rng(11); return Array.from({ length: 520 }, () => { const a = r() * 6.283, d = Math.sqrt(r()); return [Math.cos(a) * d, Math.sin(a) * d, r()]; }); })();
function drawS8(t, sc) {
  const L = sc.L, dur = sc.dur;
  bg(t, { bright: .15, light: .4 });
  const yrs = 30 * ease(pr(t, L[1], (L[5] - L[1]) + .5));
  const cx = W / 2, cy = H * .47;
  // adoption: dots light up with distance as years pass
  const reach = yrs / 30;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r] of city) {
    const d = Math.hypot(x, y);
    const lit = clamp((reach * 1.15 - d) * 4) * (r < .85 ? 1 : .4);
    ctx.globalAlpha = (.18 + .8 * lit) * pr(t, 0, .8);
    ctx.fillStyle = lit > .5 ? '#ffe2a0' : '#3e8f9c';
    ctx.beginPath(); ctx.arc(cx + x * 560, cy + y * 260, 2.5 + lit * 2.5, 0, 7); ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    const ph = ((t * .35 + i / 4) % 1);
    ctx.save(); ctx.globalAlpha = (1 - ph) * .5 * pr(t, L[1], .5); ctx.strokeStyle = GOLD(1); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, 560 * reach * ph + 10, 260 * reach * ph + 5, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  dot(cx, cy, 12, '#fff', GOLD(1), pr(t, L[1], .5));
  txt('ブランド', cx, cy - 46, { size: 34, alpha: pr(t, L[1], .5), glow: 10 });
  // timeline
  const tx0 = 360, tx1 = W - 360, ty = H * .84;
  const ta = pr(t, L[1], .6);
  line(tx0, ty, tx1, ty, CY(.4), 3, ta);
  line(tx0, ty, lerp(tx0, tx1, yrs / 30), ty, GOLD(1), 6, ta);
  for (const y of [0, 10, 20, 30]) { const x = lerp(tx0, tx1, y / 30); dot(x, ty, 5, '#fff', CY(1), ta); txt(y + '年', x, ty + 40, { size: 28, alpha: ta }); }
  const hl = pr(t, L[4] - .2, .6);
  if (hl > 0) {
    ctx.save(); ctx.globalAlpha = hl * .35; ctx.fillStyle = GOLD(1); ctx.fillRect(lerp(tx0, tx1, 2 / 3), ty - 26, (tx1 - tx0) / 3, 52); ctx.restore();
    txt('ブランドが根づくまで 20〜30年', W / 2, 140, { size: 60, font: SERIF, weight: 900, alpha: hl, glow: 22, glowColor: GOLD(.8), spacing: 3 });
  }
  txt('輸出の成功は、簡単ではない', W / 2, 140, { size: 56, alpha: pr(t, .1, .6) * (1 - pr(t, L[4] - .4, .4)), glow: 12 });
  const la = pr(t, L[5], .7);
  if (la > 0) {
    ctx.save(); ctx.globalAlpha = la * .75; ctx.fillStyle = 'rgba(2,16,22,.85)'; ctx.fillRect(0, H * .36, W, H * .22); ctx.restore();
    txt('時間がかかっても、現地に溶け込むように', W / 2, H * .47, { size: 70, font: SERIF, weight: 900, alpha: la, glow: 24, spacing: 3 });
  }
}

// ---------- Scene 9: earn overseas ----------
const flow = (() => { const r = rng(5); return Array.from({ length: 70 }, () => [r(), r() * 2 - 1, r()]); })();
function factory(x, y, s, a, col) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x - s, y + s * .6); ctx.lineTo(x - s, y - s * .2); ctx.lineTo(x - s * .5, y + s * .1); ctx.lineTo(x - s * .5, y - s * .2); ctx.lineTo(x, y + s * .1); ctx.lineTo(x, y - s * .2);
  ctx.lineTo(x + s * .5, y + s * .1); ctx.lineTo(x + s * .5, y - s * .9); ctx.lineTo(x + s * .8, y - s * .9); ctx.lineTo(x + s * .8, y + s * .1); ctx.lineTo(x + s, y + s * .1); ctx.lineTo(x + s, y + s * .6); ctx.fill(); ctx.restore();
}
function drawS9(t, sc) {
  const L = sc.L, dur = sc.dur;
  const flip = ease(pr(t, L[5] - .2, 1.2));
  bg(t, { bright: .2 * flip, warm: .6 * flip, light: .3 + .5 * flip });
  const ya = 1 - flip;
  const J = [W * .28, H * .5], A = [W * .72, H * .5];
  // --- the old way ---
  if (ya > 0) {
    txt('当時の海外進出支援', W / 2, 130, { size: 50, alpha: pr(t, 0, .6) * ya, glow: 10 });
    node(J[0], J[1], 130, '日本', pr(t, .2, .6) * ya, CY(1), 56);
    node(A[0], A[1], 130, '', pr(t, L[1] - .2, .6) * ya, 'rgba(255,140,100,1)', 40);
    txt('中国・ASEAN', A[0], A[1], { size: 34, alpha: pr(t, L[1] - .2, .6) * ya });
    // factories move
    for (let i = 0; i < 3; i++) {
      const k = ease(pr(t, L[1] + i * .4, 2.2));
      const x = lerp(J[0] - 40 + i * 40, A[0] - 40 + i * 40, k), y = lerp(J[1] - 170, A[1] - 170, k) - Math.sin(k * Math.PI) * 80;
      factory(x, y, 34, pr(t, L[0] + .2, .5) * ya, '#cfefff');
    }
    keyTag('安い人件費で、ものをつくる', W * .5 - 300, H * .78, pr(t, L[2], .6) * ya * (1 - pr(t, L[4] - .5, .4)), { size: 40 });
    const out = pr(t, L[4] - .2, .6) * ya;
    if (out > 0) {
      for (const [p, o, s] of flow) {
        const ph = (p + t * (.25 + s * .2)) % 1;
        const x = lerp(J[0] + 120, A[0] - 120, ph), y = J[1] + o * 70 + Math.sin(ph * 6 + s * 9) * 10;
        dot(x, y, 4, '#ffd0c0', 'rgba(255,110,80,1)', out * Math.sin(ph * Math.PI));
      }
      txt('お金と雇用が、海外へ流出', W / 2, H * .72, { size: 54, color: '#ffd5c4', alpha: out, glow: 18, glowColor: 'rgba(255,100,70,.9)' });
    }
  }
  // --- our way ---
  if (flip > 0) {
    txt('私たちの考える「海外進出」', W / 2, 130, { size: 50, alpha: flip, glow: 14, glowColor: GOLD(.8) });
    node(J[0], J[1], 130, '日本', flip, GOLD(1), 56);
    node(A[0], A[1], 130, '', flip, CY(1), 40);
    txt('世界の市場', A[0], A[1] - 18, { size: 44, alpha: flip });
    txt('現地の企業・人々', A[0], A[1] + 30, { size: 26, alpha: flip, color: '#cdf3f8' });
    const sell = pr(t, L[6] - .2, .8);
    // products out (upper lane), money back (lower lane)
    for (const [p, o, s] of flow) {
      const ph = (p + t * (.22 + s * .15)) % 1;
      const xo = lerp(J[0] + 140, A[0] - 140, ph), yo = J[1] - 60 + o * 30;
      ctx.save(); ctx.globalAlpha = sell * Math.sin(ph * Math.PI); ctx.fillStyle = '#d8f8ff'; ctx.fillRect(xo - 6, yo - 6, 12, 12); ctx.restore();
      const back = pr(t, L[7] - .2, .8);
      const xb = lerp(A[0] - 140, J[0] + 140, ph), yb = J[1] + 60 + o * 30;
      dot(xb, yb, 4.5, '#fff3cf', GOLD(1), back * Math.sin(ph * Math.PI));
    }
    txt('販売の仕組みを築く →', W / 2, J[1] - 130, { size: 34, alpha: sell, color: '#d8f8ff' });
    txt('← 現地から対価を得る', W / 2, J[1] + 140, { size: 34, alpha: pr(t, L[7] - .2, .8), color: '#ffe6b0' });
  }
  const end = pr(t, L[8] - .2, .8);
  if (end > 0) {
    ctx.save(); ctx.globalAlpha = end * .8; ctx.fillStyle = 'rgba(2,14,20,.9)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    bg(t, { bright: .2, warm: .7, light: 1, grid: end * .8 });
    ctx.save(); ctx.globalAlpha = 1 - end; ctx.restore();
    txt('海外で売り、海外で稼ぐ。', W / 2, H * .44, { size: 124, font: SERIF, weight: 900, alpha: end, glow: 40, glowColor: GOLD(.9), stroke: 10, spacing: 8 });
    txt('それが、私たちの考える「海外進出」', W / 2, H * .6, { size: 50, alpha: pr(t, L[9], .7), glow: 14 });
  }
}

const DRAW = { S1: drawS1, S2: drawS2, S3: drawS3, S4: drawS4, S5: drawS5, S6: drawS6, S7: drawS7, S8: drawS8, S9: drawS9 };

// ---------- subtitles & frame ----------
function subtitles(T) {
  for (const sc of TL.scenes) for (const ln of sc.lines) {
    if (T >= ln.start - .05 && T < ln.end + .25) {
      const a = Math.min(pr(T, ln.start - .05, .15), 1 - pr(T, ln.end + .1, .15));
      const g = ctx.createLinearGradient(0, H - 170, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.55 * a})`);
      ctx.fillStyle = g; ctx.fillRect(0, H - 170, W, 170);
      txt(ln.text, W / 2, H - 70, { size: 44, weight: 700, alpha: a, stroke: 8, spacing: 2 });
      return;
    }
  }
}
function badge() {
  txt('DRAFT v1｜仮ナレーション（合成音声）', 60, 60, { size: 20, weight: 500, align: 'left', color: '#9fd0d8', alpha: .8 });
}
window.renderAt = T => {
  let sc = TL.scenes.find(s => T >= s.start && T < s.end) || TL.scenes[TL.scenes.length - 1];
  const t = T - sc.start;
  const scObj = { dur: sc.end - sc.start, L: sc.lines.map(l => l.start - sc.start), Le: sc.lines.map(l => l.end - sc.start) };
  const is3D = sc.id === 'S1';
  glc.style.visibility = is3D ? 'visible' : 'hidden';
  if (!is3D) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); }
  DRAW[sc.id](t, scObj);
  if (!is3D) vignette();
  subtitles(T);
  badge();
  // scene fade
  const f = Math.max(1 - pr(t, 0, .45), pr(t, scObj.dur - .45, .45));
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
};
await document.fonts.load(`700 40px ${SANS}`); await document.fonts.load(`900 40px ${SERIF}`); await document.fonts.load(`500 40px ${SANS}`);
window.TOTAL = TL.total;
window.ready = true;
