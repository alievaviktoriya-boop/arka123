// Логотип АРКА 123: векторный знак, прелоадер «портал Аркадия» (арку чертит светящаяся линия,
// потом окно раскрывается в сайт) и блик по арке при наведении.
(function () {
  "use strict";

  const ARCH = "M626 1002 H313 V598 A312 312 0 0 1 937 598 V1002 H626";
  let uid = 0;

  // withPortal — для лоадера: светящаяся линия, которой «чертится» арка
  function markSVG(withPortal) {
    const u = "m" + uid++;
    const glowF = withPortal ? `
<filter id="glow-${u}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : "";
    const portal = withPortal ? `
<path class="glow" pathLength="1" d="${ARCH}" filter="url(#glow-${u})"/>
<path class="core" pathLength="1" d="${ARCH}"/>` : "";
    return `<svg viewBox="287 260 676 767" aria-hidden="true" focusable="false">
<defs>${glowF}
<clipPath id="box-${u}"><rect x="280" y="250" width="700" height="726"/></clipPath>
<mask id="k1-${u}" maskUnits="userSpaceOnUse" x="360" y="540" width="150" height="450"><image href="assets/img/logo/digit-1.png" x="368" y="552" width="132" height="426"/></mask>
<mask id="k2-${u}" maskUnits="userSpaceOnUse" x="500" y="540" width="210" height="380"><image href="assets/img/logo/digit-2.png" x="505" y="552" width="195" height="354"/></mask>
<mask id="k3-${u}" maskUnits="userSpaceOnUse" x="690" y="540" width="210" height="380"><image href="assets/img/logo/digit-3.png" x="698" y="552" width="194" height="354"/></mask>
</defs>
<g class="ds" clip-path="url(#box-${u})" fill="currentColor">
  <g class="d d1"><rect x="360" y="540" width="150" height="450" mask="url(#k1-${u})"/><rect x="439" y="960" width="54" height="40"/></g>
  <g class="d d2"><rect x="500" y="540" width="210" height="380" mask="url(#k2-${u})"/></g>
  <g class="d d3"><rect x="690" y="540" width="210" height="380" mask="url(#k3-${u})"/></g>
</g>
<path class="arch" pathLength="1" d="${ARCH}" fill="none" stroke="currentColor" stroke-width="53" stroke-miterlimit="10"/>
${portal}
<path class="gleam" pathLength="1" d="${ARCH}" fill="none" stroke-width="20" stroke-linecap="round"/>
</svg>`;
  }

  function fill(el) {
    el.innerHTML = `<span class="mk">${markSVG(el.hasAttribute("data-logo-portal"))}</span>` +
      `<span class="txt"><span class="wm"></span><span class="sl"></span></span>`;
  }
  document.querySelectorAll("[data-logo]").forEach(fill);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ховер: один блик по арке, даже если курсор ушёл раньше
  document.querySelectorAll("[data-logo-hover]").forEach((el) => {
    let busy = false;
    const run = () => {
      if (busy || reduce) return;
      busy = true;
      el.classList.add("hov");
      setTimeout(() => { el.classList.remove("hov"); busy = false; }, 1550);
    };
    el.addEventListener("pointerenter", run);
    el.addEventListener("focus", run);
  });

  // ===== Прелоадер =====
  const loader = document.getElementById("loader");
  if (!loader) return;
  const lk = loader.querySelector(".lockup");
  const MIN = 3500;   // анимация не обрывается раньше
  const MAX = 8000;   // и не держит гостя дольше
  const hole = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 572 664' preserveAspectRatio='none'%3E%3Cpath d='M0 664V286A286 286 0 0 1 572 286V664Z'/%3E%3C/svg%3E\")";
  let pageLoaded = document.readyState === "complete";
  addEventListener("load", () => { pageLoaded = true; });

  function done() {
    loader.hidden = true;
    document.documentElement.classList.remove("is-loading");
    document.dispatchEvent(new CustomEvent("arka:loaded"));
  }

  function setMask(v, size, pos) {
    loader.style.webkitMaskImage = v; loader.style.maskImage = v;
    loader.style.webkitMaskSize = size; loader.style.maskSize = size;
    loader.style.webkitMaskPosition = pos; loader.style.maskPosition = pos;
  }

  function fadeOut() {
    loader.style.transition = "opacity .4s";
    loader.style.opacity = "0";
    setTimeout(done, 420);
  }

  // Гость «входит через окно»: проём арки расширяется на весь экран
  function exitThroughWindow() {
    loader.classList.add("leaving");
    document.dispatchEvent(new CustomEvent("arka:opening"));   // фон сайта проявляется в проёме окна
    setTimeout(() => {
      const svg = lk.querySelector("svg"), m = svg.getScreenCTM();
      const p = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(m); };
      const a = p(339, 312), b = p(911, 976);
      const w = b.x - a.x, h = b.y - a.y, cx = a.x + w / 2, cy = a.y + h / 2;
      const K = Math.max(innerWidth / w, innerHeight / h) * 2.6;
      const mk = lk.querySelector(".mk"), r = mk.getBoundingClientRect();
      mk.style.transformOrigin = (cx - r.left) + "px " + (cy - r.top) + "px";
      loader.style.webkitMaskComposite = "xor"; loader.style.maskComposite = "exclude";
      const t0 = performance.now(), D = 1400;
      (function f(now) {
        const t = Math.min(1, (now - t0) / D);
        const e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const k = 1 + (K - 1) * e, W = w * k, H = h * k;
        setMask(hole + ", linear-gradient(#000,#000)", W + "px " + H + "px, 100% 100%", (cx - W / 2) + "px " + (cy - H / 2) + "px, 0 0");
        mk.style.transform = "scale(" + k + ")";
        loader.style.opacity = t > .55 ? String(1 - (t - .55) / .45) : "";
        if (t < 1) requestAnimationFrame(f); else done();
      })(t0);
    }, 300);   // выход начинается на пике вспышки портала
  }

  lk.classList.add("play");
  const start = performance.now();
  const min = reduce ? 600 : MIN;   // полная заставка при каждой загрузке (короткую при повторе убрали — казалось, что логотип не раскрывается)
  const count = loader.querySelector(".loader__count");
  (function wait() {
    const el = performance.now() - start;
    // счётчик загрузки: идёт по времени анимации, до 100 — только когда страница загружена
    if (count) count.textContent = String(Math.round(100 * Math.min(el / min, pageLoaded ? 1 : .9))).padStart(3, "0") + " %";
    if ((pageLoaded && el >= min) || el >= MAX) {
      if (reduce) fadeOut(); else exitThroughWindow();
    } else {
      setTimeout(wait, 50);
    }
  })();
})();
