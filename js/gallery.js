// Фотогалерея «Дорожка»: лента кадров на canvas, кадр у бегунка крупнее соседей.
// Перенесено из «5 Сайт/gallery-tracks.html»; фото — из «Фото обработанные».
(function () {
  "use strict";

  const track = document.getElementById("gallery-track");
  if (!track) return;
  const items = [...track.querySelectorAll("img")];
  const SRC = items.map((i) => i.getAttribute("src"));
  const CAPS = items.map((i) => i.getAttribute("alt"));
  const N = SRC.length;
  // <img> внутри — запасной вариант без JS; при работающем скрипте рисуем на canvas.
  // Фото начинают грузиться, только когда галерея близко к экрану.
  const imgs = items.map(() => new Image());
  const loadImages = () => imgs.forEach((im, i) => { if (!im.src) { im.decoding = "async"; im.onload = draw; im.src = SRC[i]; } });
  track.classList.add("is-canvas");

  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  track.appendChild(cv);
  const ctx = cv.getContext("2d");
  const capEl = document.getElementById("gallery-cap"), numEl = document.getElementById("gallery-num");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lineColor = getComputedStyle(document.documentElement).getPropertyValue("--line").trim();

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    const r = track.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    draw();
  }

  // p — плавная позиция «бегунка» в индексах кадров, target — куда он стремится
  let p = 0, target = 0, vel = 0, lastInput = -1e9, cur = -1, lastItems = [];

  function layout(pos) {
    const gap = Math.max(10, W * .012), sig = .72;
    const maxH = Math.min(H * .88, W * .42), minH = Math.max(80, maxH * .38), ar = 4 / 3;
    const out = []; let x = 0;
    for (let i = 0; i < N; i++) {
      const d = (i - pos) / sig, g = Math.exp(-d * d);
      const h = minH + (maxH - minH) * g, w = h * ar;
      out.push({ i, x, w, h }); x += w + gap;
    }
    const fi = Math.max(0, Math.min(N - 1, Math.floor(pos))), fr = pos - fi, a = out[fi], b = out[Math.min(N - 1, fi + 1)];
    const cxp = (a.x + a.w / 2) * (1 - fr) + (b.x + b.w / 2) * fr, shift = W / 2 - cxp;
    for (const o of out) o.x += shift;
    return out;
  }

  function drawCover(im, x, y, w, h) {
    if (!im.complete || !im.naturalWidth) { ctx.fillStyle = lineColor; ctx.fillRect(x, y, w, h); return; }
    const ir = im.naturalWidth / im.naturalHeight, r = w / h; let sw, sh, sx, sy;
    if (ir > r) { sh = im.naturalHeight; sw = sh * r; sx = (im.naturalWidth - sw) / 2; sy = 0; }
    else { sw = im.naturalWidth; sh = sw / r; sx = 0; sy = (im.naturalHeight - sh) / 2; }
    ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
  }

  function draw() {
    if (!W) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    const cy = H / 2;
    lastItems = layout(p);
    for (const it of lastItems) {
      if (it.x > W || it.x + it.w < 0) continue;
      drawCover(imgs[it.i], it.x, cy - it.h / 2, it.w, it.h);
    }
    const c = Math.round(p);
    if (c !== cur) {
      cur = c;
      capEl.style.opacity = 0;
      setTimeout(() => { capEl.textContent = CAPS[c] || ""; capEl.style.opacity = 1; }, 160);
      numEl.textContent = String(c + 1).padStart(2, "0") + " / " + String(N).padStart(2, "0");
    }
  }

  // Курсор у краёв ленты прокручивает её, клик выводит фото в центр, свайп — на одно фото, стрелки — с клавиатуры
  let hoverX = null, downX = null;
  const now0 = () => performance.now();
  track.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { hoverX = e.clientX - track.getBoundingClientRect().left; lastInput = now0(); } });
  track.addEventListener("pointerleave", () => { hoverX = null; });
  track.addEventListener("pointerdown", (e) => { downX = e.clientX; lastInput = now0(); });
  track.addEventListener("pointerup", (e) => {
    lastInput = now0();
    if (downX === null) return;
    const dx = e.clientX - downX; downX = null;
    if (Math.abs(dx) > 40) { target = Math.max(0, Math.min(N - 1, Math.round(target) + (dx < 0 ? 1 : -1))); return; }
    const x = e.clientX - track.getBoundingClientRect().left;
    const hit = lastItems.find((it) => x >= it.x && x <= it.x + it.w);
    if (hit) target = hit.i;
  });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { target = Math.min(N - 1, Math.round(target) + 1); lastInput = now0(); e.preventDefault(); }
    if (e.key === "ArrowLeft") { target = Math.max(0, Math.round(target) - 1); lastInput = now0(); e.preventDefault(); }
  });

  // Анимация идёт только пока галерея на экране
  let visible = false, raf = 0, dir = 1, prev = performance.now();
  function tick(now) {
    const dt = Math.min(50, now - prev) / 1000; prev = now;
    if (hoverX !== null) {
      const u = (hoverX - W / 2) / (W / 2), dead = .3, a = Math.max(0, (Math.abs(u) - dead) / (1 - dead));
      if (a > 0) { target = Math.max(0, Math.min(N - 1, target + Math.sign(u) * Math.pow(a, 1.4) * 1.6 * dt)); lastInput = now; }
      else if (Math.abs(target - Math.round(target)) > .001) { target += (Math.round(target) - target) * Math.min(1, dt * 2); }
    } else if (now - lastInput > 4000) {
      // без действий пользователя дорожка медленно «проигрывается» туда и обратно
      target += dir * dt * .4;
      if (target >= N - 1) { target = N - 1; dir = -1; } else if (target <= 0) { target = 0; dir = 1; }
    }
    const k = 9, d = 2 * Math.sqrt(k), VMAX = 2.4;
    vel += ((target - p) * k - vel * d) * dt; vel = Math.max(-VMAX, Math.min(VMAX, vel)); p += vel * dt;
    draw();
    raf = visible ? requestAnimationFrame(tick) : 0;
  }

  addEventListener("resize", resize);
  resize();

  const setVisible = (v) => {
    visible = v;
    if (v) { loadImages(); resize(); }
    if (v && !raf && !reduce) { prev = performance.now(); raf = requestAnimationFrame(tick); }
  };

  if (reduce) {
    const step = () => { p = target; draw(); };
    track.addEventListener("pointerup", step); track.addEventListener("keydown", step);
  }

  // В режиме сцен галерея живёт, пока открыта её сцена; иначе — пока видна на экране
  const scene = track.closest(".scene");
  if (document.documentElement.classList.contains("scenes-on") && scene) {
    scene.addEventListener("scene:enter", () => setVisible(true));
    scene.addEventListener("scene:leave", () => setVisible(false));
  } else {
    new IntersectionObserver((es) => setVisible(es[0].isIntersecting), { rootMargin: "300px" }).observe(track);
  }
})();
