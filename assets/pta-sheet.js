/* A pulsar timing array on a rippling sheet of spacetime.
   Used by the PTA card on projects.html and by the first figure of projects/fourier-pta.html.
   The sheet is a cartoon of spacetime. Its ripples are a stochastic gravitational-wave background,
   drawn as three plane waves crossing in different directions, with the strain exaggerated enormously.
   Each pulsar spins like a lighthouse and sends a pulse whenever its beam sweeps past the Earth. */
(function () {
  "use strict";
  const TAU = 2 * Math.PI, DEG = Math.PI / 180;
  const RS = 1.75, CAM_R = 4.6, GRID = 0.1, SPEED = 0.45, RING_LIFE = 0.9, LEVELS = 14;
  const R_PSR = 0.042, R_EARTH = 0.09, BEAM = 0.34;
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* stochastic background: amplitude, wavelength, direction (deg), phase speed, phase */
  const WAVES = [[0.10, 2.7, 25, 0.20, 0.3], [0.072, 1.8, 145, 0.16, 1.9], [0.054, 1.25, 255, 0.13, 4.2]]
    .map(([A, lam, dir, v, ph]) => { const k = TAU / lam; return {A, kx: k * Math.cos(dir * DEG), ky: k * Math.sin(dir * DEG), om: k * v, ph}; });
  function height(x, y, t) {
    let z = 0;
    for (const w of WAVES) z += w.A * Math.sin(w.kx * x + w.ky * y - w.om * t + w.ph);
    return z;
  }
  function slope(x, y, t) {
    let gx = 0, gy = 0;
    for (const w of WAVES) { const c = w.A * Math.cos(w.kx * x + w.ky * y - w.om * t + w.ph); gx += c * w.kx; gy += c * w.ky; }
    return [gx, gy];
  }

  /* pulsars: position on the sheet, spin-axis tilt and azimuth (deg), magnetic inclination (deg), spin period (s) */
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const PSR = [[-1.05, 0.45, 28, 200, 64, 2.9], [-0.45, 1.05, 35, 120, 70, 2.4], [0.40, 1.20, 22, 300, 60, 3.4], [1.05, 0.62, 30, 40, 68, 2.7],
               [1.00, -0.32, 38, 250, 62, 3.2], [0.42, -0.88, 25, 90, 72, 2.5], [-0.80, -0.62, 33, 330, 66, 3.0]]
    .map(([x, y, tilt, az, psi, P], i) => {
      const a = [Math.sin(tilt * DEG) * Math.cos(az * DEG), Math.sin(tilt * DEG) * Math.sin(az * DEG), Math.cos(tilt * DEG)];
      const n1 = Math.hypot(a[0], a[1]), e1 = [a[1] / n1, -a[0] / n1, 0];
      const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
      const L = Math.hypot(x, y), d = [-x / L, -y / L, 0];
      return {x, y, a, e1, e2, cp: Math.cos(psi * DEG), sp: Math.sin(psi * DEG), P, L, phi0: 1.7 * i, phiStar: Math.atan2(dot(e2, d), dot(e1, d))};
    });

  const LIGHT = (() => { const l = [-0.55, 0.35, 0.75], n = Math.hypot(...l); return l.map(c => c / n); })();
  const SHADE = Array.from({length: LEVELS}, (_, l) => {
    const s = l / (LEVELS - 1), lo = [184, 195, 176], hi = [251, 248, 240];
    return `rgb(${lo.map((c, k) => Math.round(c + (hi[k] - c) * s)).join(",")})`;
  });

  window.PTASheet = function (cv, opt) {
    const o = Object.assign({aspect: null, elev: 30, fit: "width", zoom: 1, dy: 0, labels: false, sway: 7, line: 0.7}, opt || {});
    const ctx = cv.getContext("2d"), off = document.createElement("canvas"), octx = off.getContext("2d");
    const N = Math.round(2 * RS / GRID) + 1, SX = new Float32Array(N * N), SY = new Float32Array(N * N);
    const ce = Math.cos(o.elev * DEG), se = Math.sin(o.elev * DEG);
    let W = 0, H = 0, F = 1, cx = 0, cy = 0, ca = 1, sa = 0, t = 0, tg = -1;   // tg: time of the sheet on screen
    const P3 = [0, 0, 0];

    function proj(x, y, z, out) {
      const xr = x * ca - y * sa, yr = x * sa + y * ca, dep = CAM_R + yr * ce - z * se;
      out[0] = cx + F * xr / dep; out[1] = cy - F * (yr * se + z * ce) / dep; out[2] = dep;
      return out;
    }
    function rim() {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let k = 0; k < 72; k++) {
        proj(RS * Math.cos(TAU * k / 72), RS * Math.sin(TAU * k / 72), 0, P3);
        x0 = Math.min(x0, P3[0]); x1 = Math.max(x1, P3[0]); y0 = Math.min(y0, P3[1]); y1 = Math.max(y1, P3[1]);
      }
      return [x0, x1, y0, y1];
    }
    function fit() {
      const w = cv.clientWidth; if (!w) return false;
      const h = o.aspect ? Math.round(w * o.aspect) : cv.clientHeight;
      if (o.aspect) cv.style.height = h + "px";
      const dpr = window.devicePixelRatio || 1; W = w; H = h;
      cv.width = off.width = Math.round(w * dpr); cv.height = off.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ca = 1; sa = 0; F = 1; cx = 0; cy = 0;
      const [x0, x1, y0, y1] = rim();
      F = o.fit === "height" ? o.zoom * H / (y1 - y0) : o.zoom * W / (x1 - x0);
      cx = W / 2 - F * (x0 + x1) / 2; cy = H / 2 - F * (y0 + y1) / 2 + o.dy * H;
      tg = -1;
      return true;
    }

    /* ---- state: pulses in flight and arrival rings at the Earth ---- */
    const pulses = [], rings = [];
    const turns = PSR.map(p => Math.floor((p.phi0 - p.phiStar) / TAU));
    function step(dt) {
      t += dt;
      PSR.forEach((p, i) => {
        const c = Math.floor((p.phi0 + TAU * t / p.P - p.phiStar) / TAU);
        if (c > turns[i]) { turns[i] = c; pulses.push({i, s: 0}); }
      });
      for (let k = pulses.length - 1; k >= 0; k--) {
        const q = pulses[k]; q.s += dt * SPEED / PSR[q.i].L;
        if (q.s >= 1) { pulses.splice(k, 1); rings.push(0); }
      }
      for (let k = rings.length - 1; k >= 0; k--) { rings[k] += dt; if (rings[k] > RING_LIFE) rings.splice(k, 1); }
    }

    function sheet() {
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = -RS + i * GRID, y = -RS + j * GRID, k = j * N + i;
        proj(x, y, height(x, y, tg), P3); SX[k] = P3[0]; SY[k] = P3[1];
      }
      octx.clearRect(0, 0, W, H);
      const fills = Array.from({length: LEVELS}, () => new Path2D());
      for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
        const x = -RS + (i + 0.5) * GRID, y = -RS + (j + 0.5) * GRID;
        if (x * x + y * y > RS * RS) continue;
        const [gx, gy] = slope(x, y, tg), nl = (-gx * LIGHT[0] - gy * LIGHT[1] + LIGHT[2]) / Math.sqrt(1 + gx * gx + gy * gy);
        const l = Math.max(0, Math.min(LEVELS - 1, Math.round((nl - 0.5) / 0.45 * (LEVELS - 1))));
        const k = j * N + i, P = fills[l];
        P.moveTo(SX[k], SY[k]); P.lineTo(SX[k + 1], SY[k + 1]); P.lineTo(SX[k + N + 1], SY[k + N + 1]); P.lineTo(SX[k + N], SY[k + N]); P.closePath();
      }
      for (let l = 0; l < LEVELS; l++) { octx.fillStyle = SHADE[l]; octx.fill(fills[l]); }
      const mesh = new Path2D(), R2 = (RS + GRID) * (RS + GRID);
      for (let a = 0; a < N; a++) for (const along of [0, 1]) {
        let pen = false;
        for (let b = 0; b < N; b++) {
          const i = along ? b : a, j = along ? a : b, x = -RS + i * GRID, y = -RS + j * GRID, k = j * N + i;
          if (x * x + y * y > R2) { pen = false; continue; }
          if (pen) mesh.lineTo(SX[k], SY[k]); else { mesh.moveTo(SX[k], SY[k]); pen = true; }
        }
      }
      octx.strokeStyle = "rgba(52,92,70,0.6)"; octx.lineWidth = o.line; octx.stroke(mesh);
      /* fade the rim, then the far side */
      const [x0, x1, y0, y1] = rim(), mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ax = (x1 - x0) / 2, ay = (y1 - y0) / 2;
      octx.save(); octx.globalCompositeOperation = "destination-in";
      octx.translate(mx, my); octx.scale(1, ay / ax);
      const g = octx.createRadialGradient(0, 0, 0, 0, 0, ax);
      g.addColorStop(0, "#000"); g.addColorStop(0.6, "#000"); g.addColorStop(0.98, "rgba(0,0,0,0)");
      octx.fillStyle = g; octx.fillRect(-4 * ax, -4 * ax, 8 * ax, 8 * ax); octx.restore();
      octx.save(); octx.globalCompositeOperation = "destination-in";
      const g2 = octx.createLinearGradient(0, y0, 0, my);
      g2.addColorStop(0, "rgba(0,0,0,0.3)"); g2.addColorStop(1, "#000");
      octx.fillStyle = g2; octx.fillRect(0, 0, W, H); octx.restore();
    }

    function sphere(sx, sy, r, inner, mid, outer) {
      const g = ctx.createRadialGradient(sx - 0.38 * r, sy - 0.42 * r, 0.08 * r, sx, sy, 1.02 * r);
      g.addColorStop(0, inner); g.addColorStop(0.55, mid); g.addColorStop(1, outer);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
    }
    function beam(p, sign, phi, c, r) {
      const b = [0, 1, 2].map(m => sign * (p.cp * p.a[m] + p.sp * (Math.cos(phi) * p.e1[m] + Math.sin(phi) * p.e2[m])));
      const z0 = height(p.x, p.y, tg) + R_PSR;
      proj(p.x + BEAM * b[0], p.y + BEAM * b[1], z0 + BEAM * b[2], P3);
      const vx = P3[0] - c[0], vy = P3[1] - c[1], len = Math.hypot(vx, vy); if (len < 1) return;
      const nx = -vy / len, ny = vx / len, wb = 0.4 * r, wt = 2.3 * r, alpha = b[2] < -0.12 ? 0.2 : 0.5;
      const g = ctx.createLinearGradient(c[0], c[1], P3[0], P3[1]);
      g.addColorStop(0, `rgba(110,26,31,${alpha})`); g.addColorStop(1, "rgba(110,26,31,0)");
      ctx.beginPath(); ctx.moveTo(c[0] + nx * wb, c[1] + ny * wb); ctx.lineTo(P3[0] + nx * wt, P3[1] + ny * wt);
      ctx.lineTo(P3[0] - nx * wt, P3[1] - ny * wt); ctx.lineTo(c[0] - nx * wb, c[1] - ny * wb); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
    }

    function draw() {
      if (tg < 0 || t - tg >= 1 / 30) {                       // the sheet moves slowly: re-render it at most 30 times a second
        tg = t; const az = o.sway * Math.sin(TAU * tg / 40) * DEG; ca = Math.cos(az); sa = Math.sin(az);
        sheet();
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(off, 0, 0, W, H);
      const unit = F / CAM_R;                                   // px per world unit at the centre
      /* pulse paths over the sheet */
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(138,106,46,0.78)"; ctx.lineWidth = Math.max(1, 0.012 * unit);
      for (const p of PSR) {
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) {
          const x = p.x * (1 - k / 40), y = p.y * (1 - k / 40);
          proj(x, y, height(x, y, tg) + 0.008, P3);
          if (k) ctx.lineTo(P3[0], P3[1]); else ctx.moveTo(P3[0], P3[1]);
        }
        ctx.stroke();
      }
      /* rings where pulses reach the Earth */
      for (const age of rings) {
        const rr = R_EARTH + 0.3 * age / RING_LIFE;
        ctx.beginPath();
        for (let k = 0; k <= 36; k++) {
          const x = rr * Math.cos(TAU * k / 36), y = rr * Math.sin(TAU * k / 36);
          proj(x, y, height(x, y, tg) + 0.004, P3);
          if (k) ctx.lineTo(P3[0], P3[1]); else ctx.moveTo(P3[0], P3[1]);
        }
        ctx.strokeStyle = `rgba(138,106,46,${(0.45 * (1 - age / RING_LIFE)).toFixed(3)})`; ctx.lineWidth = Math.max(1, 0.01 * unit); ctx.stroke();
      }
      /* pulses in flight */
      for (const q of pulses) {
        const p = PSR[q.i], x = p.x * (1 - q.s), y = p.y * (1 - q.s);
        proj(x, y, height(x, y, tg) + 0.012, P3);
        const r = Math.max(1.6, 0.022 * F / P3[2]);
        ctx.beginPath(); ctx.arc(P3[0], P3[1], 2.2 * r, 0, TAU); ctx.fillStyle = "rgba(196,150,62,0.22)"; ctx.fill();
        ctx.beginPath(); ctx.arc(P3[0], P3[1], r, 0, TAU); ctx.fillStyle = "#a27a2c"; ctx.fill();
      }
      /* bodies, far to near: soft shadow on the sheet, beams, sphere */
      const bodies = PSR.map(p => ({p, x: p.x, y: p.y, r: R_PSR})).concat([{p: null, x: 0, y: 0, r: R_EARTH}]);
      for (const B of bodies) {
        const z = height(B.x, B.y, tg);
        B.g = proj(B.x, B.y, z, [0, 0, 0]); B.c = proj(B.x, B.y, z + B.r, [0, 0, 0]); B.rpx = F * B.r / B.c[2];
      }
      bodies.sort((u, v) => v.c[2] - u.c[2]);
      for (const B of bodies) {
        ctx.beginPath(); ctx.ellipse(B.g[0], B.g[1], 1.25 * B.rpx, 1.25 * B.rpx * se, 0, 0, TAU);
        ctx.fillStyle = "rgba(34,44,36,0.16)"; ctx.fill();
        if (B.p) {
          const phi = B.p.phi0 + TAU * t / B.p.P;
          beam(B.p, 1, phi, B.c, B.rpx); beam(B.p, -1, phi, B.c, B.rpx);
          sphere(B.c[0], B.c[1], B.rpx, "#8a8274", "#2e2a24", "#141210");
        } else {
          sphere(B.c[0], B.c[1], B.rpx, "#c4d8e6", "#4d7699", "#1d3550");
          if (o.labels) {
            ctx.font = `italic ${Math.max(12, Math.min(15, W / 46))}px "EB Garamond", Georgia, serif`;
            ctx.fillStyle = "#3a342c"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText("Earth", B.c[0] + B.rpx + 7, B.c[1] + 1);
          }
        }
      }
      if (o.labels) {
        const p = bodies.find(B => B.p === PSR[0]);
        ctx.font = `italic ${Math.max(12, Math.min(15, W / 46))}px "EB Garamond", Georgia, serif`;
        ctx.fillStyle = "#3a342c"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText("pulsar", p.c[0] - p.rpx - 8, p.c[1] + 1);
      }
    }

    if (!fit()) return;
    window.addEventListener("resize", () => { if (fit()) draw(); });
    if (document.fonts && o.labels) document.fonts.ready.then(draw);
    if (reduceMotion) { for (let k = 0; k < 150; k++) step(1 / 30); draw(); return; }
    let visible = true, last = null;
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; last = null; }, {rootMargin: "80px"}).observe(cv);
    for (let k = 0; k < 90; k++) step(1 / 30);
    draw();
    const loop = ts => {
      if (visible) { if (last !== null) { step(Math.min(ts - last, 50) / 1000); draw(); } last = ts; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
})();
