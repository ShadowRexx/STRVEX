// ============ charts.js : high-performance tactical canvas charts ============

function cssVar(n) {
  return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
}

function hexToRgba(hex, alpha) {
  hex = hex.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }
  if (hex.length === 6) {
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }
  return "rgba(255, 68, 34, " + alpha + ")";
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function smoothPath(ctx, pts) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const t = 0.18;
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * t, p1.y + (p2.y - p0.y) * t,
      p2.x - (p3.x - p1.x) * t, p2.y - (p3.y - p1.y) * t,
      p2.x, p2.y
    );
  }
}

function drawChart(canvas, points, opts, active) {
  opts = opts || {};
  const format = opts.format || function (v) { return String(v); };
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;

  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const FONT = "'JetBrains Mono', monospace";
  const accent = cssVar("--flame") || "#ff4422";
  const brass = cssVar("--brass") || "#d4b483";
  const muted = cssVar("--muted") || "#8c887f";
  const gridColor = cssVar("--metal-edge") || "rgba(255, 255, 255, 0.08)";
  const cardBg = cssVar("--metal") || "#1c1c1a";

  canvas._chart = { points: points, opts: opts, xs: [] };
  bindChart(canvas);

  if (points.length === 0) {
    ctx.fillStyle = muted;
    ctx.font = "11px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NO TELEMETRY DATA RECORDED", w / 2, h / 2);
    return;
  }

  const padL = 42, padR = 14, padT = 24, padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const vals = points.map(function (p) { return p.v; });
  let lo = Math.min.apply(null, vals);
  let hi = Math.max.apply(null, vals);
  const minVal = lo;
  let span = hi - lo;
  if (span === 0) {
    span = Math.abs(hi) * 0.2 || 1;
    lo -= span / 2;
    hi += span / 2;
  } else {
    lo -= span * 0.15;
    hi += span * 0.15;
  }
  if (minVal >= 0 && lo < 0) lo = 0;
  const range = hi - lo;

  function xOf(i) {
    if (points.length === 1) return padL + plotW / 2;
    return padL + i * plotW / (points.length - 1);
  }
  function yOf(v) {
    return padT + (hi - v) / range * plotH;
  }

  // Tactical Dashed Grid Lines + Numerical Y-Axis
  ctx.font = "10px " + FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.setLineDash([3, 3]);
  for (let k = 0; k < 4; k++) {
    const val = hi - k * range / 3;
    const y = padT + k * plotH / 3;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    ctx.fillStyle = muted;
    const shown = range > 20 ? Math.round(val) : Math.round(val * 10) / 10;
    ctx.fillText(String(shown), padL - 8, y);
  }
  ctx.setLineDash([]);

  const pts = points.map(function (p, i) { return { x: xOf(i), y: yOf(p.v) }; });
  canvas._chart.xs = pts.map(function (p) { return p.x; });

  // Gradient under curve (Fixed Hex Parsing Bug)
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, hexToRgba(accent, 0.28));
  grad.addColorStop(1, hexToRgba(accent, 0.0));
  ctx.beginPath();
  smoothPath(ctx, pts);
  ctx.lineTo(pts[pts.length - 1].x, padT + plotH);
  ctx.lineTo(pts[0].x, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Solid Telemetry Line
  ctx.beginPath();
  smoothPath(ctx, pts);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Metric Nodes
  if (pts.length <= 25) {
    pts.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = cardBg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = brass;
      ctx.stroke();
    });
  }

  // Date Labels (First and Last)
  ctx.fillStyle = muted;
  ctx.textBaseline = "alphabetic";
  const labelY = padT + plotH + 18;
  if (points.length === 1) {
    ctx.textAlign = "center";
    ctx.fillText(points[0].label || "", pts[0].x, labelY);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(points[0].label || "", padL, labelY);
    ctx.textAlign = "right";
    ctx.fillText(points[points.length - 1].label || "", w - padR, labelY);
  }

  // Crosshair on Active Node
  const act = (active === null || active === undefined) ? pts.length - 1 : active;
  const ap = pts[act];
  ctx.strokeStyle = brass;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(ap.x, padT);
  ctx.lineTo(ap.x, padT + plotH);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(ap.x, ap.y, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // Callout Badge
  const text = format(points[act].v) + (points[act].label ? " // " + points[act].label : "");
  ctx.font = "700 11px " + FONT;
  const bw = ctx.measureText(text).width + 16;
  const bh = 22;
  let bx = ap.x - bw / 2;
  bx = Math.max(4, Math.min(bx, w - bw - 4));
  let by = ap.y - bh - 10;
  if (by < 2) by = ap.y + 14;
  roundRect(ctx, bx, by, bw, bh, 4);
  ctx.fillStyle = "#ebe6dc";
  ctx.fill();
  ctx.fillStyle = "#121211";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + bw / 2, by + bh / 2);
}

function bindChart(canvas) {
  if (canvas._bound) return;
  canvas._bound = true;

  function nearest(e) {
    const c = canvas._chart;
    if (!c || !c.xs.length) return null;
    const x = e.clientX - canvas.getBoundingClientRect().left;
    let best = 0;
    c.xs.forEach(function (px, i) {
      if (Math.abs(px - x) < Math.abs(c.xs[best] - x)) best = i;
    });
    return best;
  }
  function show(e) {
    const i = nearest(e);
    if (i !== null) drawChart(canvas, canvas._chart.points, canvas._chart.opts, i);
  }

  canvas.addEventListener("pointerdown", show);
  canvas.addEventListener("pointermove", function (e) {
    if (e.pointerType === "mouse" || e.pressure > 0) show(e);
  });
  canvas.addEventListener("pointerleave", function () {
    if (canvas._chart) drawChart(canvas, canvas._chart.points, canvas._chart.opts, null);
  });
}
