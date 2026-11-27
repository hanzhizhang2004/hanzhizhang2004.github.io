/* A 200 mg pyrolytic-graphite ring floating around the outer edge of a core + shell magnet and swinging sideways.
   The ring is the surface of revolution of the computed cross-section with the highest horizontal frequency
   (projects/diamagnetic.html, section 4). Lengths in mm. The gap above the magnet (0.25 mm) and the swing
   are drawn larger than life so that they can be seen. Used by projects.html and projects/diamagnetic.html. */
(function () {
  "use strict";
  const TAU = 2 * Math.PI, DEG = Math.PI / 180;
  const R1 = 10, R2 = 20, LM = 10, GAP_TRUE = 0.25, GAP_DRAWN = 1.0;
  const RING = [[20.15, 0.25], [21.65, 0.25], [21.65, 0.26], [21.646, 0.272], [21.626, 0.324], [21.598, 0.386], [21.558, 0.462], [21.506, 0.542], [21.446, 0.62], [21.378, 0.694], [21.302, 0.76], [21.218, 0.818], [21.13, 0.866], [21.042, 0.9], [20.946, 0.924], [20.854, 0.932], [20.758, 0.928], [20.67, 0.908], [20.582, 0.874], [20.498, 0.82], [20.422, 0.75], [20.354, 0.664], [20.294, 0.564], [20.242, 0.458], [20.202, 0.37], [20.174, 0.308], [20.154, 0.264], [20.15, 0.256]];                                   // (s, z) cross-section, counter-clockwise
  const NPHI = 120, CAM = 150, ZT = -3.2;
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const LIGHT = nrm([-0.45, -0.6, 0.7]);
  /* edge normals of the cross-section (outward, in the s-z plane) */
  const SEC = RING.map(([s, z]) => [s, z - GAP_TRUE + GAP_DRAWN]);
  const EDGE = SEC.map((p, j) => { const q = SEC[(j + 1) % SEC.length], ds = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(ds, dz); return [dz / l, -ds / l]; });
  function shade(base, n, view, spec, amb) {
    const d = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    const h = nrm([LIGHT[0] + view[0], LIGHT[1] + view[1], LIGHT[2] + view[2]]);
    const sp = spec * Math.pow(Math.max(0, n[0] * h[0] + n[1] * h[1] + n[2] * h[2]), 24);
    const k = amb + (1 - amb) * d;
    return `rgb(${base.map(c => Math.min(255, Math.round(c * k + 255 * sp))).join(",")})`;
  }
  window.LevitationScene = function (cv, opt) {
    const o = Object.assign({aspect: null, elev: 28, sway: 14, amp: 1.1, period: 1.7, labels: false, margin: 0.06}, opt || {});
    const ctx = cv.getContext("2d");
    const ce = Math.cos(o.elev * DEG), se = Math.sin(o.elev * DEG);
    let W = 0, H = 0, F = 1, cx = 0, cy = 0, ca = 1, sa = 0, t = 0, cam = [0, 0, 0];
    const P = [0, 0, 0];
    function proj(x, y, z, out) {
      const xr = x * ca - y * sa, yr = x * sa + y * ca, zz = z - ZT, dep = CAM + yr * ce - zz * se;
      out[0] = cx + F * xr / dep; out[1] = cy - F * (yr * se + zz * ce) / dep; out[2] = dep; return out;
    }
    function setCam(a) {                                     // camera position in world coordinates (inverse of the azimuthal turn)
      ca = Math.cos(a); sa = Math.sin(a); cam = [-CAM * ce * sa, -CAM * ce * ca, ZT + CAM * se];
    }
    function fit() {
      const w = cv.clientWidth; if (!w) return false;
      const h = o.aspect ? Math.round(w * o.aspect) : cv.clientHeight;
      if (o.aspect) cv.style.height = h + "px";
      const dpr = window.devicePixelRatio || 1; W = w; H = h;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setCam(0); F = 1; cx = 0; cy = 0;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let k = 0; k < 90; k++) {
        const c = Math.cos(TAU * k / 90), s = Math.sin(TAU * k / 90);
        for (const [r, z] of [[21.7 + o.amp, GAP_DRAWN + 0.8], [R2, -LM - 1.5], [25, -LM - 0.3]]) {
          proj(r * c, r * s, z, P); x0 = Math.min(x0, P[0]); x1 = Math.max(x1, P[0]); y0 = Math.min(y0, P[1]); y1 = Math.max(y1, P[1]);
        }
      }
      F = Math.min(W * (1 - 2 * o.margin) / (x1 - x0), H * (1 - 2 * o.margin) / (y1 - y0));
      cx = W / 2 - F * (x0 + x1) / 2; cy = H / 2 - F * (y0 + y1) / 2;
      return true;
    }
    function circle(r, z, n, xo) {
      const pts = [];
      for (let k = 0; k <= n; k++) { proj(xo + r * Math.cos(TAU * k / n), r * Math.sin(TAU * k / n), z, P); pts.push([P[0], P[1]]); }
      return pts;
    }
    function polyPath(pts, rev) {
      const q = rev ? pts.slice().reverse() : pts; ctx.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) ctx.lineTo(q[k][0], q[k][1]);
    }
    const V = [], quads = [];
    function draw() {
      setCam(o.sway * Math.sin(TAU * t / 26) * DEG);
      const xo = o.amp * Math.sin(TAU * t / o.period);
      ctx.clearRect(0, 0, W, H);
      /* soft shadow on the table */
      const sh = circle(25, -LM - 0.3, 64, 0), c0 = proj(0, 0, -LM - 0.3, [0, 0, 0]);
      const rx = Math.max(...sh.map(p => Math.abs(p[0] - c0[0])));
      const g0 = ctx.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], rx);
      g0.addColorStop(0, "rgba(26,24,20,0.22)"); g0.addColorStop(0.75, "rgba(26,24,20,0.10)"); g0.addColorStop(1, "rgba(26,24,20,0)");
      ctx.beginPath(); polyPath(sh); ctx.fillStyle = g0; ctx.fill();
      /* side wall of the shell, strip by strip */
      const N = 96;
      for (let k = 0; k < N; k++) {
        const a0 = TAU * k / N, a1 = TAU * (k + 1) / N, am = (a0 + a1) / 2, n = [Math.cos(am), Math.sin(am), 0];
        const pc = [R2 * n[0], R2 * n[1], -LM / 2];
        if (n[0] * (cam[0] - pc[0]) + n[1] * (cam[1] - pc[1]) + n[2] * (cam[2] - pc[2]) <= 0) continue;
        const view = nrm([cam[0] - pc[0], cam[1] - pc[1], cam[2] - pc[2]]);
        const p = [proj(R2 * Math.cos(a0), R2 * Math.sin(a0), 0, [0, 0, 0]), proj(R2 * Math.cos(a1), R2 * Math.sin(a1), 0, [0, 0, 0]),
                   proj(R2 * Math.cos(a1), R2 * Math.sin(a1), -LM, [0, 0, 0]), proj(R2 * Math.cos(a0), R2 * Math.sin(a0), -LM, [0, 0, 0])];
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let m = 1; m < 4; m++) ctx.lineTo(p[m][0], p[m][1]); ctx.closePath();
        const col = shade([72, 96, 108], n, view, 0.10, 0.42); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.7; ctx.fill(); ctx.stroke();
      }
      /* top face: shell (south up) and core (north up) */
      const up = [0, 0, 1], vtop = nrm([cam[0], cam[1], cam[2]]);
      const outer = circle(R2, 0, 120, 0), inner = circle(R1, 0, 90, 0);
      ctx.beginPath(); polyPath(outer); polyPath(inner, true); ctx.fillStyle = shade([104, 130, 142], up, vtop, 0.06, 0.55); ctx.fill();
      ctx.beginPath(); polyPath(inner); ctx.fillStyle = shade([168, 74, 66], up, vtop, 0.06, 0.55); ctx.fill();
      ctx.lineWidth = Math.max(0.6, W / 700); ctx.strokeStyle = "rgba(26,24,20,0.55)";
      ctx.beginPath(); polyPath(outer); ctx.stroke(); ctx.beginPath(); polyPath(inner); ctx.stroke();
      if (o.labels) {
        ctx.font = `italic ${Math.max(12, Math.min(16, W / 40))}px "EB Garamond", Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(247,242,232,0.85)"; proj(0, 0, 0, P); ctx.fillText("N", P[0], P[1]);
        proj(0, -15, 0, P); ctx.fillText("S", P[0], P[1]);
      }
      /* the ring's shadow where it hangs over the top face */
      ctx.save(); ctx.beginPath(); polyPath(outer); ctx.clip();
      ctx.beginPath(); polyPath(circle(RING[1][0], 0, 120, xo)); polyPath(circle(RING[0][0], 0, 120, xo), true);
      ctx.fillStyle = "rgba(20,18,16,0.32)"; ctx.fill(); ctx.restore();
      /* the ring: quads of the surface of revolution, back-face culled and drawn far to near */
      const n = SEC.length; quads.length = 0;
      for (let i = 0; i <= NPHI; i++) {
        const ph = TAU * i / NPHI, c = Math.cos(ph), s = Math.sin(ph);
        V[i] = SEC.map(([r, z]) => proj(xo + r * c, r * s, z, [0, 0, 0]));
      }
      for (let i = 0; i < NPHI; i++) {
        const ph = TAU * (i + 0.5) / NPHI, c = Math.cos(ph), s = Math.sin(ph);
        for (let j = 0; j < n; j++) {
          const jn = (j + 1) % n, nn = [EDGE[j][0] * c, EDGE[j][0] * s, EDGE[j][1]];
          const r = (SEC[j][0] + SEC[jn][0]) / 2, z = (SEC[j][1] + SEC[jn][1]) / 2, pc = [xo + r * c, r * s, z];
          const vv = [cam[0] - pc[0], cam[1] - pc[1], cam[2] - pc[2]];
          if (nn[0] * vv[0] + nn[1] * vv[1] + nn[2] * vv[2] <= 0) continue;
          const a = V[i][j], b = V[i + 1][j], d = V[i + 1][jn], e = V[i][jn];
          quads.push({p: [a, b, d, e], z: a[2] + b[2] + d[2] + e[2], col: shade([58, 56, 54], nn, nrm(vv), 0.32, 0.30)});
        }
      }
      quads.sort((u, v) => v.z - u.z);
      ctx.lineWidth = 0.6; ctx.lineJoin = "round";
      for (const q of quads) {
        ctx.beginPath(); ctx.moveTo(q.p[0][0], q.p[0][1]); ctx.lineTo(q.p[1][0], q.p[1][1]); ctx.lineTo(q.p[2][0], q.p[2][1]); ctx.lineTo(q.p[3][0], q.p[3][1]); ctx.closePath();
        ctx.fillStyle = q.col; ctx.strokeStyle = q.col; ctx.fill(); ctx.stroke();
      }
    }
    if (!fit()) return;
    window.addEventListener("resize", () => { if (fit()) draw(); });
    if (reduceMotion) { t = 0.3; draw(); return; }
    let visible = true, last = null;
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; last = null; }, {rootMargin: "80px"}).observe(cv);
    draw();
    const loop = ts => { if (visible) { if (last !== null) { t += Math.min(ts - last, 50) / 1000; draw(); } last = ts; } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
})();
