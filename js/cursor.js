// След курсора (референс Belgrade Arbor): мягкая голубая кисть поверх видео-фона —
// будто Аркадий колдует курсором. Только мышь, без prefers-reduced-motion.
// Рисуется, пока след не растаял; в покое кадры не считаются.
(function () {
  "use strict";

  const stage = document.querySelector(".stage");
  if (!stage) return;
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const LIFE = 650;   // мс — за столько точка следа гаснет
  const R = 80;       // радиус кисти, px
  const MAX = 140;    // точек в следе

  const cv = document.createElement("canvas");
  cv.className = "stage__trail";
  stage.appendChild(cv);
  const g = cv.getContext("2d");
  let w = 0, h = 0;

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", size);

  // кисть рисуется один раз и дальше только штампуется
  const brush = document.createElement("canvas");
  brush.width = brush.height = 128;
  const b = brush.getContext("2d");
  const grad = b.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(127, 211, 255, .5)");
  grad.addColorStop(.45, "rgba(127, 211, 255, .16)");
  grad.addColorStop(1, "rgba(127, 211, 255, 0)");
  b.fillStyle = grad;
  b.fillRect(0, 0, 128, 128);

  const pts = [];
  let last = null, raf = 0;

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const t = performance.now(), x = e.clientX, y = e.clientY;
    // быстрые рывки заполняются промежуточными точками — след без пропусков
    if (last) {
      const dx = x - last.x, dy = y - last.y, n = Math.min(10, Math.floor(Math.hypot(dx, dy) / 14));
      for (let i = 1; i < n; i++) pts.push({ x: last.x + dx * i / n, y: last.y + dy * i / n, t });
    }
    pts.push({ x, y, t });
    last = { x, y };
    if (pts.length > MAX) pts.splice(0, pts.length - MAX);
    if (!raf) raf = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener("pointerleave", () => { last = null; });

  function draw(now) {
    g.clearRect(0, 0, w, h);
    while (pts.length && now - pts[0].t > LIFE) pts.shift();
    for (const p of pts) {
      const k = 1 - (now - p.t) / LIFE, r = R * (.45 + .55 * k);
      g.globalAlpha = k * k * .35;
      g.drawImage(brush, p.x - r, p.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    raf = pts.length ? requestAnimationFrame(draw) : 0;
  }
})();
