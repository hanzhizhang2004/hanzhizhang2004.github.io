/* Ringdown of a Schwarzschild black hole, drawn like a two-panel matplotlib animation.
   Top: the equatorial plane coloured by r h_+ = Re[exp(-i w u) exp(2 i phi)] for the fundamental l = m = 2
   quasinormal mode, M w = 0.37367 - 0.08896 i, where u = t - r* is retarded time and r* = r + 2M ln(r/2M - 1).
   The mode is switched on behind a causal front u = 0 that leaves the hole at t = 0. Since the mode decays in u,
   the outermost ring, emitted first, is always the loudest. Bottom: h_+ recorded by an observer at r = 20M.
   Used by the QNM essay card on essays.html. */
(function () {
  "use strict";
  const WR = 0.37367, WI = 0.08896;                  // M w of the fundamental l = 2 mode
  const R = 26, ROBS = 20, RISE = 2;                  // half-width of the plane, observer radius, rise time of the front (M)
  const T0 = -4, T1 = 78, SPEED = 12, T_STILL = 38;   // loop range (M), M per second, frame shown under reduced motion
  const N = 200;                                      // field grid
  const FONT = '"DejaVu Sans", Verdana, Geneva, sans-serif';
  const C0 = "#1f77b4", C3 = "#d62728";
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* matplotlib RdBu_r: eleven anchors, linear in between */
  const CMAP = [[5, 48, 97], [33, 102, 172], [67, 147, 195], [146, 197, 222], [209, 229, 240], [247, 247, 247],
                [253, 219, 199], [244, 165, 130], [214, 96, 77], [178, 24, 43], [103, 0, 31]];
  const LUT = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const s = i * 10 / 255, k = Math.min(9, Math.floor(s)), f = s - k;
    for (let c = 0; c < 3; c++) LUT[3 * i + c] = Math.round(CMAP[k][c] + (CMAP[k + 1][c] - CMAP[k][c]) * f);
  }

  const env0 = u => (u <= 0 ? 0 : (1 - Math.exp(-(u / RISE) * (u / RISE))) * Math.exp(-WI * u));
  let EMAX = 0;
  for (let u = 0; u < 30; u += 0.005) EMAX = Math.max(EMAX, env0(u));
  const env = u => env0(u) / EMAX;
  const rstar = r => r + 2 * Math.log(r / 2 - 1);
  const UOBS = rstar(ROBS);
  const strain = t => { const u = t - UOBS; return env(u) * Math.cos(WR * u); };   // h_+ at the observer, phi = 0

  /* per-pixel r* and azimuth on the field grid */
  const RS = new Float32Array(N * N), PH = new Float32Array(N * N), HOLE = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -R + (i + 0.5) * 2 * R / N, y = R - (j + 0.5) * 2 * R / N, r = Math.hypot(x, y), k = j * N + i;
    if (r <= 2.02) { HOLE[k] = 1; continue; }
    RS[k] = rstar(r); PH[k] = Math.atan2(y, x);
  }
  const NW = 900, HW = new Float32Array(NW + 1);
  for (let k = 0; k <= NW; k++) HW[k] = strain(T0 + (T1 - T0) * k / NW);
  const HMAX = 1.15 * HW.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

  window.Ringdown = function (cv) {
    const ctx = cv.getContext("2d");
    const off = document.createElement("canvas"); off.width = off.height = N;
    const octx = off.getContext("2d"), img = octx.createImageData(N, N), px = img.data;
    for (let k = 0; k < N * N; k++) px[4 * k + 3] = 255;
    let W = 0, H = 0, S = 0, ox = 0, oy = 0, t = T0;

    function fit() {
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return false;
      const dpr = window.devicePixelRatio || 1; W = w; H = h; S = Math.min(w, h); ox = (w - S) / 2; oy = (h - S) / 2;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    /* text runs: [string, italic?, scale, baseline shift in em] */
    function runs(list, x, y, size, align) {
      let total = 0;
      for (const [s, it, sc] of list) { ctx.font = `${it ? "italic " : ""}${size * (sc || 1)}px ${FONT}`; total += ctx.measureText(s).width; }
      let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
      ctx.textAlign = "left";
      for (const [s, it, sc, dy] of list) {
        ctx.font = `${it ? "italic " : ""}${size * (sc || 1)}px ${FONT}`;
        ctx.fillText(s, cx, y + (dy || 0) * size);
        cx += ctx.measureText(s).width;
      }
      return total;
    }

    function draw() {
      const f = 0.036 * S, fl = 0.042 * S, tl = 0.0145 * S, lw = Math.max(0.75, 0.0034 * S);
      const A = {x: ox + 0.15 * S, y: oy + 0.04 * S, w: 0.58 * S, h: 0.58 * S};
      const CB = {x: ox + 0.76 * S, y: A.y, w: 0.03 * S, h: A.h};
      const B = {x: ox + 0.15 * S, y: oy + 0.735 * S, w: 0.80 * S, h: 0.15 * S};
      const X = xm => A.x + (xm + R) / (2 * R) * A.w, Y = ym => A.y + (R - ym) / (2 * R) * A.h;
      const BX = tm => B.x + (tm - T0) / (T1 - T0) * B.w, BY = hv => B.y + B.h / 2 - hv / HMAX * B.h / 2;

      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);

      /* field */
      for (let k = 0, n = N * N; k < n; k++) {
        let v = 0;
        if (!HOLE[k]) { const u = t - RS[k]; if (u > 0) v = env(u) * Math.cos(WR * u - 2 * PH[k]); }
        let q = Math.round((v + 1) * 127.5); q = q < 0 ? 0 : q > 255 ? 255 : q;
        px[4 * k] = LUT[3 * q]; px[4 * k + 1] = LUT[3 * q + 1]; px[4 * k + 2] = LUT[3 * q + 2];
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, A.x, A.y, A.w, A.h);
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(X(0), Y(0), 2 * A.w / (2 * R), 0, 2 * Math.PI); ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = "#000"; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(X(ROBS), Y(0), 0.011 * S, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

      /* time stamp, in a translucent white box */
      ctx.textBaseline = "alphabetic";
      const label = [["t", true], [` = ${t.toFixed(1)} `, false], ["M", true]];
      ctx.save(); ctx.globalAlpha = 0; const tw = runs(label, 0, 0, f); ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillRect(A.x + 0.018 * S, A.y + 0.016 * S, tw + 0.024 * S, f * 1.45);
      ctx.fillStyle = "#000"; runs(label, A.x + 0.03 * S, A.y + 0.016 * S + f * 1.08, f);

      /* axes of the field panel */
      ctx.strokeStyle = "#000"; ctx.lineWidth = lw; ctx.strokeRect(A.x, A.y, A.w, A.h);
      ctx.beginPath();
      for (const v of [-20, 0, 20]) { ctx.moveTo(X(v), A.y + A.h); ctx.lineTo(X(v), A.y + A.h + tl); ctx.moveTo(A.x, Y(v)); ctx.lineTo(A.x - tl, Y(v)); }
      ctx.stroke();
      ctx.fillStyle = "#000"; ctx.font = `${f}px ${FONT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (const v of [-20, 0, 20]) ctx.fillText(String(v).replace("-", "−"), X(v), A.y + A.h + tl + 0.008 * S);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const v of [-20, 0, 20]) ctx.fillText(String(v).replace("-", "−"), A.x - tl - 0.008 * S, Y(v));

      /* colorbar */
      const g = ctx.createLinearGradient(0, CB.y + CB.h, 0, CB.y);
      CMAP.forEach((c, i) => g.addColorStop(i / 10, `rgb(${c[0]},${c[1]},${c[2]})`));
      ctx.fillStyle = g; ctx.fillRect(CB.x, CB.y, CB.w, CB.h);
      ctx.strokeRect(CB.x, CB.y, CB.w, CB.h);
      ctx.beginPath();
      for (const v of [-1, 0, 1]) { const yy = CB.y + (1 - v) / 2 * CB.h; ctx.moveTo(CB.x + CB.w, yy); ctx.lineTo(CB.x + CB.w + tl, yy); }
      ctx.stroke();
      ctx.fillStyle = "#000"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      for (const v of [-1, 0, 1]) ctx.fillText(String(v).replace("-", "−"), CB.x + CB.w + tl + 0.008 * S, CB.y + (1 - v) / 2 * CB.h);

      /* waveform panel */
      const kNow = Math.max(0, Math.min(NW, Math.round((t - T0) / (T1 - T0) * NW)));
      ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
      ctx.strokeStyle = C0; ctx.lineWidth = Math.max(1, 0.0062 * S); ctx.lineJoin = "round";
      ctx.beginPath();
      for (let k = 0; k <= kNow; k++) { const xx = BX(T0 + (T1 - T0) * k / NW), yy = BY(HW[k]); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      ctx.fillStyle = C3; ctx.beginPath(); ctx.arc(BX(t), BY(strain(t)), 0.012 * S, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#000"; ctx.lineWidth = lw; ctx.strokeRect(B.x, B.y, B.w, B.h);
      ctx.beginPath();
      for (const v of [0, 20, 40, 60]) { ctx.moveTo(BX(v), B.y + B.h); ctx.lineTo(BX(v), B.y + B.h + tl); }
      ctx.stroke();
      ctx.fillStyle = "#000"; ctx.font = `${f}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (const v of [0, 20, 40, 60]) ctx.fillText(String(v), BX(v), B.y + B.h + tl + 0.008 * S);
      ctx.textBaseline = "alphabetic";
      runs([["t", true], ["/", false], ["M", true]], B.x + B.w / 2, oy + 0.992 * S, fl, "center");
      ctx.save(); ctx.translate(B.x - 0.028 * S, B.y + B.h / 2); ctx.rotate(-Math.PI / 2);
      runs([["h", true], ["+", false, 0.72, 0.28]], 0, 0, fl, "center");
      ctx.restore();
    }

    if (!fit()) return;
    window.addEventListener("resize", () => { if (fit()) draw(); });
    if (reduceMotion) { t = T_STILL; draw(); return; }
    let visible = true, last = null;
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; last = null; }, {rootMargin: "80px"}).observe(cv);
    draw();
    const loop = ts => {
      if (visible && !document.hidden) {
        if (last !== null) { t += Math.min(ts - last, 50) / 1000 * SPEED; if (t > T1) t = T0; draw(); }
        last = ts;
      } else last = null;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
})();
