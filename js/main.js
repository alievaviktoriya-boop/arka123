// Общие мелочи страницы: год, появление блоков без сцен, меню, 3D по требованию, форма.
(function () {
  "use strict";

  const root = document.documentElement;
  const scenesOn = () => root.classList.contains("scenes-on");

  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Без движка сцен (нет JS-сцен) блоки проявляются при прокрутке; со сценами — их включает scenes.js
  if (!scenesOn() && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: .2 });
    document.querySelectorAll(".reveal, .reveal-self").forEach((s) => io.observe(s));
  }

  // Мобильное меню
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    const set = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      root.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", () => set(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
    // меню — полоса слева: касание мимо неё закрывает
    document.addEventListener("pointerdown", (e) => {
      if (root.classList.contains("nav-open") && !nav.contains(e.target) && !toggle.contains(e.target)) set(false);
    });
  }

  // 3D-зал грузится, только когда до него дошли: three.js тяжёлый
  const frame = document.querySelector("[data-room3d]");
  if (frame) {
    const load = () => { if (!frame.src) frame.src = frame.dataset.room3d; };
    // 3D забирает фокус: переходы по сценам с клавиатуры пробрасываем наружу
    frame.addEventListener("load", () => {
      try {
        frame.contentWindow.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && root.classList.contains("room-full")) { setFull(false); return; }
          if (!window.arkaScenes || root.classList.contains("room-full")) return;
          if (e.key === "PageDown" || e.key === "ArrowDown") { e.preventDefault(); window.arkaScenes.step(1); }
          if (e.key === "PageUp" || e.key === "ArrowUp") { e.preventDefault(); window.arkaScenes.step(-1); }
        });
      } catch (err) { /* другой домен — пропускаем */ }
    });
    // «Открыть на весь экран»: зал разворачивается здесь же (без новой вкладки), «Свернуть ✕» и Esc возвращают на сайт
    const box = frame.closest(".room3d");
    const openBtn = document.querySelector("[data-room-full]");
    const closeBtn = box.querySelector("[data-room-close]");
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
    function setFull(on) {
      if (on === root.classList.contains("room-full")) return;
      root.classList.toggle("room-full", on);
      if (on) {
        load();
        const req = box.requestFullscreen || box.webkitRequestFullscreen;
        if (req) try { const p = req.call(box); if (p && p.catch) p.catch(() => {}); } catch (err) { /* остаётся режим поверх сайта */ }
        closeBtn.focus();
      } else {
        if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        openBtn.focus();
      }
    }
    // из настоящего полноэкранного режима вышли сами (Esc браузера) — сворачиваем и наш режим
    ["fullscreenchange", "webkitfullscreenchange"].forEach((t) => document.addEventListener(t, () => { if (!fsEl()) setFull(false); }));
    openBtn.addEventListener("click", (e) => { e.preventDefault(); setFull(true); });
    closeBtn.addEventListener("click", () => setFull(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setFull(false); });

    const scene = frame.closest(".scene");
    if (scenesOn() && scene) {
      scene.addEventListener("scene:enter", load, { once: true });
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { load(); o.disconnect(); } }, { rootMargin: "400px" }).observe(frame);
    } else {
      load();
    }
  }

  // Форма бронирования: сервера нет — показываем подтверждение
  const form = document.getElementById("book-form");
  if (form) {
    // телефон: форма раскрывается по кнопке «Оставить заявку»
    const bookToggle = document.querySelector(".book-toggle");
    // на телефоне форма открывается вместо контактов (плашка не длиннее экрана), «← Контакты» возвращает их
    const panel = form.closest(".scene__panel");
    if (bookToggle) bookToggle.addEventListener("click", () => {
      form.classList.add("is-open");
      panel.classList.add("is-form");
      panel.scrollTop = 0;
      bookToggle.setAttribute("aria-expanded", "true");
      bookToggle.parentElement.hidden = true;
      form.querySelector("input").focus({ preventScroll: true });
    });
    const back = form.querySelector(".book-back");
    if (back && bookToggle) back.addEventListener("click", () => {
      form.classList.remove("is-open");
      panel.classList.remove("is-form");
      bookToggle.setAttribute("aria-expanded", "false");
      bookToggle.parentElement.hidden = false;
      bookToggle.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      form.classList.add("is-sent");
      const msg = form.querySelector(".form-done");
      msg.hidden = false;
      msg.focus();
    });
  }
})();
