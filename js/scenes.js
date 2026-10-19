// Сайт-«фильм» по образцу референса Porsche:
//  • фон всего сайта — видео с Аркадием на весь экран (сделано в Kling);
//  • каждая сцена стоит на своей секунде видео (data-t); шаг колеса / свайп / стрелка — переход:
//    блок сцены гаснет, видео доигрывает до следующей паузы (назад — перематывается), проявляется новый блок;
//  • после конца ролика сцены сменяют фото поверх видео (data-bg);
//  • стоп-кадры (data-still) закрывают фон, пока видео грузится или если оно недоступно.
(function () {
  "use strict";

  const root = document.documentElement;
  const stage = document.querySelector(".stage");
  const scenes = [...document.querySelectorAll(".scene")];
  if (!stage || !scenes.length) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  root.classList.add("scenes-on");

  // ========================================================================
  // Фон: видео + слои с фото
  // ========================================================================
  // видимая часть кадра по X: data-mx — на телефоне (кадр вокруг героя),
  // data-mx-wide — в окнах шире 1,1:1, но уже 16:9 (чтобы не срезать, например, библиотеку слева)
  const mxOf = (i) => {
    const d = scenes[i].dataset;
    if (d.mxWide !== undefined && innerWidth / innerHeight >= 1.1) return +d.mxWide;
    return d.mx !== undefined ? +d.mx : 50;
  };

  // слои: фото поверх видео (bg) и стоп-кадры на случай, когда видео нет (still)
  const layers = [];
  scenes.forEach((s, i) => {
    for (const kind of ["still", "bg"]) {
      const src = s.dataset[kind];
      if (!src) continue;
      const el = document.createElement("div");
      el.className = "stage__layer stage__layer--" + kind;
      stage.insertBefore(el, stage.firstChild);
      layers.push({ i, kind, el, src });
    }
  });
  // стоп-кадр сцены — её собственный или ближайший предыдущий
  const stillFor = (i) => { for (let j = i; j >= 0; j--) if (scenes[j].dataset.still) return j; return -1; };
  // картинки слоёв грузятся по мере надобности: текущая сцена, соседние и стоп-кадр, в который растворяемся
  const loadLayer = (l) => { if (!l.on) { l.on = true; l.el.style.backgroundImage = `url(${l.src})`; } };
  function want(i) {
    const bg = scenes[i] && scenes[i].dataset.bg, st = stillFor(i);
    layers.forEach((l) => { if (Math.abs(l.i - i) <= 1 || l.i === st || (bg && l.src === bg)) loadLayer(l); });
  }

  let video = null, videoReady = false;
  // на телефоне — лёгкая версия ролика (960px, вдвое меньше по весу): кадр всё равно обрезан по ширине
  const src = (innerWidth <= 720 && stage.dataset.videoMobile) || stage.dataset.video;
  if (src) {
    video = document.createElement("video");
    video.className = "stage__video";
    video.muted = true; video.playsInline = true; video.preload = "auto";
    video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
    video.src = src;
    video.addEventListener("loadeddata", () => {
      videoReady = true;
      video.currentTime = timeOf(Math.max(0, cur));
      placeVideo();
      stage.classList.add("has-video");
      showLayers(Math.max(0, cur), .4);
    }, { once: true });
    video.addEventListener("error", () => { video.remove(); video = null; }, { once: true });
    stage.insertBefore(video, stage.firstChild);
    // iPhone (и Android с экономией трафика) не грузят видео заранее, пока его не запустили:
    // будим — запуск без звука и сразу пауза. Сразу после заставки и ещё раз при первом касании
    ["touchstart", "pointerdown", "keydown", "wheel"].forEach((t) => addEventListener(t, wakeVideo, { once: true, passive: true }));
  }
  function wakeVideo() {
    if (!video || videoReady) return;
    try {
      const p = video.play();
      if (p) p.then(() => { if (!busy) { video.pause(); if (cur >= 0) video.currentTime = timeOf(cur); } }).catch(() => {});
    } catch (e) { /* без видео остаются стоп-кадры */ }
  }
  const hasVideo = () => !!(video && videoReady);
  const timeOf = (i) => Math.min(+scenes[Math.max(0, i)].dataset.t || 0, video && video.duration ? video.duration - .05 : Infinity);

  // Сцена стоит (не переход): поверх видео — её собственный стоп-кадр. Он чётче паузы видео
  // (ролик из Kling 720p, а кадр 0 с — из исходной картинки 2752px), на переходе растворяется в видео.
  let resting = false;

  // какие слои видны в сцене i; dur — длительность смены
  function showLayers(i, dur) {
    want(i);
    // фото сцены; у соседних сцен с одним фото (Контакты → Футер) слой не гаснет — иначе сквозь него мелькает видео
    const bgSrc = scenes[i].dataset.bg;
    const bg = !!bgSrc;
    const st = stillFor(i);
    // видео стоит на паузе ровно на кадре сцены (запуск сайта, прелоадер) — это тоже покой: стоп-кадр не снимаем,
    // иначе на миг видно лицо из видео без ретуши
    const still = resting || (hasVideo() && video.paused && Math.abs(video.currentTime - timeOf(i)) < .04);
    layers.forEach((l) => {
      const on = l.kind === "bg" ? l.src === bgSrc : (!bg && l.i === st && (!hasVideo() || (still && l.i === i)));
      // стоп-кадр поверх видео уходит быстро — видео уже трогается
      l.el.style.transitionDuration = (l.kind === "still" && hasVideo() && !on ? Math.min(dur, .35) : dur) + "s";
      l.el.classList.toggle("is-on", on);
    });
  }

  // общий вид фона под сцену: затемнение, градиент под текстом, видимая часть кадра на телефоне
  function styleStage(i, dur) {
    const s = scenes[i];
    stage.dataset.dim = s.hasAttribute("data-dim") ? "1" : "";
    stage.dataset.shade = s.classList.contains("scene--hero") ? "hero" : "";
    const pos = mxOf(i) + "% 50%";
    stage.style.setProperty("--mx-dur", dur + "s");
    stage.style.setProperty("--mx", pos);
    placeVideo(mxOf(i));
  }

  // Видео «cover» вручную: размер по пропорциям кадра, сдвиг к точке сцены — transform.
  // object-position при смене сцены анимируется перерисовкой, и на телефоне кадр подрагивал поверх движения камеры.
  let lastMx = 50;
  function placeVideo(mx = lastMx) {
    lastMx = mx;
    if (!video) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    const A = video.videoWidth ? video.videoWidth / video.videoHeight : 1280 / 716;
    let w = W, h = W / A, x = 0, y = (H - h) / 2;
    if (W / H < A) { h = H; w = H * A; x = (W - w) * mx / 100; y = 0; }
    video.style.width = w + "px";
    video.style.height = h + "px";
    video.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  // окно поменяло пропорции — видимая часть кадра пересчитывается без анимации
  addEventListener("resize", () => { if (cur >= 0) styleStage(cur, 0); });

  // Переход фона за dur секунд. Видео вперёд — обычное воспроизведение (плавнее всего),
  // назад — перемотка по кадрам.
  function travel(fromI, toI, dur) {
    resting = false;
    styleStage(toI, dur);
    const part = toI === fromI + 1 && hasVideo() && !reduce && dur > 0 && scenes[toI].dataset.play;
    if (part) return playPart(toI, dur, part);
    // назад и прыжки через сцены идут растворением (backTo): прежний стоп-кадр гаснет,
    // только когда новый уже проявился, — иначе мелькнёт видео со старым лицом
    const dissolve = hasVideo() && !reduce && dur > 0 && Math.abs(timeOf(toI) - video.currentTime) >= .04 &&
      !(timeOf(toI) > video.currentTime && toI === fromI + 1);
    if (!dissolve) showLayers(toI, Math.max(dur * .7, .01));
    if (!hasVideo()) return reduce || dur <= 0 ? Promise.resolve() : sleep(Math.min(dur, 1.2) * 1000);
    const t0 = video.currentTime, t1 = timeOf(toI);
    if (reduce || dur <= 0 || Math.abs(t1 - t0) < .04) {
      video.currentTime = t1;
      return reduce || dur <= 0 ? Promise.resolve() : sleep(Math.min(dur, 1.2) * 1000);
    }
    return new Promise((resolve) => {
      // через несколько сцен вперёд — растворением, как назад: длинный проезд показал бы
      // куски видео, которые заменены фото (data-play)
      if (t1 > t0 && toI === fromI + 1) {
        video.playbackRate = clamp((t1 - t0) / dur, .5, 4);
        const p = video.play();
        if (p) p.catch(() => { video.currentTime = t1; resolve(); });
        (function watch() {
          if (video.currentTime >= t1 - .02 || video.ended) { video.pause(); video.currentTime = t1; resolve(); }
          else requestAnimationFrame(watch);
        })();
        return;
      }
      // Назад: браузеры перематывают видео назад рывками, поэтому растворяемся
      // в стоп-кадр нужной сцены, под ним ставим видео на место и убираем стоп-кадр.
      video.pause();
      backTo(toI, t1, dur).then(resolve);
    });
  }

  const seek = (t) => new Promise((r) => {
    if (Math.abs(video.currentTime - t) < .02) return r();
    const done = () => { clearTimeout(to); video.removeEventListener("seeked", done); r(); };
    const to = setTimeout(done, 1500);
    video.addEventListener("seeked", done);
    video.currentTime = t;
  });

  // Вперёд по отрезку data-play="a-b": видео играет только там, где в кадре нет Аркадия.
  // Кадры с ним — стоп-кадры (отретушированное лицо, в видео его нет), между ними — растворение:
  // под стоп-кадром прежней сцены видео встаёт на a, стоп-кадр растворяется, видео идёт до b,
  // и если сцена стоит позже b — из видео проявляется её стоп-кадр.
  async function playPart(toI, dur, part) {
    const [a, b] = part.split("-").map(Number), t1 = timeOf(toI), fade = .6;
    await seek(a);
    showLayers(toI, fade);
    video.playbackRate = clamp((b - a) / dur, .5, 4);
    await new Promise((r) => {
      const p = video.play();
      if (p) p.catch(r);
      (function watch() {
        if (video.currentTime >= b - .02 || video.ended) r(); else requestAnimationFrame(watch);
      })();
    });
    video.pause();
    if (b < t1 - .04) {
      resting = true;
      showLayers(toI, fade);
      await sleep(fade * 1000);
      await seek(t1);
    } else {
      video.currentTime = t1;
    }
  }

  async function backTo(toI, t1, dur) {
    const j = stillFor(toI);
    const still = layers.find((l) => l.kind === "still" && l.i === j);
    const fade = Math.min(dur, 1.2) * .6;
    if (still) {
      still.el.style.transitionDuration = fade + "s";
      still.el.classList.add("is-on");
      await sleep(fade * 1000);
      // новый стоп-кадр закрыл кадр — прежние слои (стоп-кадр, фото) можно убирать
      layers.forEach((l) => { if (l !== still) { l.el.style.transitionDuration = ".35s"; l.el.classList.remove("is-on"); } });
    } else {
      showLayers(toI, .35);
    }
    await new Promise((r) => {
      const done = () => { clearTimeout(to); video.removeEventListener("seeked", done); r(); };
      const to = setTimeout(done, 1500);
      video.addEventListener("seeked", done);
      video.currentTime = t1;
    });
    // собственный стоп-кадр сцены остаётся — сцена встаёт на паузу
    if (still && still.i !== toI) {
      still.el.style.transitionDuration = ".35s";
      still.el.classList.remove("is-on");
    }
  }

  // ========================================================================
  // Переключение сцен
  // ========================================================================
  const num = document.getElementById("scene-num"), bar = document.getElementById("scene-bar"), nameEl = document.getElementById("scene-name");
  const nextBtn = document.querySelector(".scene-next");
  let cur = -1, busy = false, lockUntil = 0;

  function durationTo(from, to) {
    const k = Math.abs(to - from);
    if (k === 1) {
      const own = to > from ? scenes[to].dataset.dur : scenes[from].dataset.dur;
      if (own) return +own;
      return 1.2;
    }
    return Math.min(2.6, 1.3 + .3 * (k - 1));
  }

  function setUI(i) {
    num.textContent = String(i + 1).padStart(2, "0") + " / " + String(scenes.length).padStart(2, "0");
    nameEl.textContent = scenes[i].dataset.name || "";
    bar.style.width = (i / (scenes.length - 1) * 100) + "%";
    nextBtn.hidden = i === scenes.length - 1;
    // на первом и последнем экране своя кнопка брони — в шапке её прячем
    root.classList.toggle("at-start", i === 0);
    root.classList.toggle("at-end", i === scenes.length - 1);
    // на «Контактах» своя форма, на футере своя кнопка — «Забронировать» в шапке там не дублируем
    root.classList.toggle("at-book", ["contacts", "footer"].includes(scenes[i].id));
    document.querySelectorAll(".site-nav a").forEach((a) => {
      a.classList.toggle("is-current", a.getAttribute("href") === "#" + scenes[i].id);
    });
  }

  async function goTo(i, opts = {}) {
    i = clamp(i, 0, scenes.length - 1);
    want(i);
    if (busy || i === cur) return;
    busy = true;
    const from = cur;
    const old = scenes[from];
    if (old) {
      old.classList.add("is-leaving");
      old.querySelectorAll(".reveal").forEach((r) => r.classList.remove("in"));
      if (!opts.instant && !reduce) await sleep(280);
      old.classList.remove("is-active", "is-leaving");
      old.dispatchEvent(new CustomEvent("scene:leave", { bubbles: true }));
    }
    root.classList.add("is-traveling");
    setUI(i);
    await travel(from, i, opts.instant ? 0 : (opts.dur || durationTo(from, i)));
    root.classList.remove("is-traveling");
    cur = i;
    resting = true;
    showLayers(i, .5);
    const sc = scenes[i];
    sc.classList.add("is-active");
    const panel = sc.querySelector(".scene__panel");
    if (panel) panel.scrollTop = 0;
    requestAnimationFrame(() => sc.querySelectorAll(".reveal").forEach((r) => r.classList.add("in")));
    sc.dispatchEvent(new CustomEvent("scene:enter", { bubbles: true }));
    if (history.replaceState) history.replaceState(null, "", i === 0 ? location.pathname + location.search : "#" + sc.id);
    lockUntil = performance.now() + 450;
    busy = false;
  }
  const step = (d) => goTo(cur + d);
  // для встроенных страниц (3D-зал перехватывает фокус и клавиши)
  window.arkaScenes = { step, goTo };

  // ---------- ввод ----------
  const activePanel = () => (cur >= 0 ? scenes[cur].querySelector(".scene__panel") : null);
  // Может ли блок сам прокрутиться в эту сторону (длинные блоки листаются внутри, потом — переход)
  function panelScrolls(el, dir) {
    if (!el || el.scrollHeight <= el.clientHeight + 2 || getComputedStyle(el).overflowY === "visible") return false;
    return dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 2;
  }

  let acc = 0, accT = 0;
  addEventListener("wheel", (e) => {
    if (root.classList.contains("nav-open") || root.classList.contains("is-loading") || root.classList.contains("room-full")) return;
    const dir = Math.sign(e.deltaY);
    if (!dir || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const panel = activePanel();
    if (panel && e.target instanceof Node && panel.contains(e.target) && panelScrolls(panel, dir)) return;
    e.preventDefault();
    const now = performance.now();
    // инерция тачпада: пока идут события — ждём новый жест
    if (busy || now < lockUntil) { lockUntil = Math.max(lockUntil, now + 180); acc = 0; return; }
    if (now - accT > 250) acc = 0;
    accT = now; acc += e.deltaY;
    if (Math.abs(acc) > 30) { acc = 0; step(dir); }
  }, { passive: false });

  let ty = null, tTop = 0;
  addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { ty = null; return; }
    ty = e.touches[0].clientY;
    const panel = activePanel();
    tTop = panel ? panel.scrollTop : 0;
  }, { passive: true });
  addEventListener("touchend", (e) => {
    if (ty === null || root.classList.contains("nav-open") || root.classList.contains("room-full")) return;
    if (e.target.closest(".gallery__track, .room3d, input, select, textarea")) { ty = null; return; }
    const dy = ty - e.changedTouches[0].clientY;
    ty = null;
    const panel = activePanel();
    // если внутри блока прокручивался текст — это не переход
    if (panel && Math.abs(panel.scrollTop - tTop) > 2) return;
    if (Math.abs(dy) > 50 && !panelScrolls(panel, Math.sign(dy))) step(Math.sign(dy));
  }, { passive: true });
  // нативную прокрутку страницы отключаем, кроме блоков с длинным содержимым
  addEventListener("touchmove", (e) => {
    if (root.classList.contains("nav-open")) return;
    if (!e.target.closest(".scene__panel, .gallery__track")) e.preventDefault();
  }, { passive: false });

  addEventListener("keydown", (e) => {
    if (e.target.closest("input, select, textarea, [contenteditable]") || root.classList.contains("nav-open") || root.classList.contains("room-full")) return;
    if (e.target.closest("#gallery-track") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    const down = ["ArrowDown", "PageDown", " "].includes(e.key), up = ["ArrowUp", "PageUp"].includes(e.key);
    if (!down && !up && e.key !== "Home" && e.key !== "End") return;
    const panel = activePanel();
    e.preventDefault();
    // длинный блок сначала листается сам, у края — переход к следующей сцене
    if ((down || up) && panelScrolls(panel, down ? 1 : -1)) {
      panel.scrollBy({ top: (down ? 1 : -1) * panel.clientHeight * .8, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    if (e.key === "Home") goTo(0); else if (e.key === "End") goTo(scenes.length - 1); else step(down ? 1 : -1);
  });

  // ссылки на сцены (меню, кнопки) — переход вместо прыжка по якорю
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const i = scenes.findIndex((s) => "#" + s.id === a.getAttribute("href"));
    if (i < 0) return;
    e.preventDefault();
    goTo(i);
  });
  nextBtn.addEventListener("click", () => step(1));

  // ---------- старт ----------
  // Фон сразу показывает стоп-кадр первой сцены, после прелоадера проявляется из темноты.
  // По ссылке с якорем — сразу нужная сцена.
  const startAt = scenes.findIndex((s) => "#" + s.id === location.hash);
  styleStage(Math.max(0, startAt), 0);
  showLayers(Math.max(0, startAt), 0);
  function start() {
    stage.classList.add("is-on");
    wakeVideo();
    // остальные фоны и стоп-кадры — фоном, когда первый экран уже показан (переходы через меню без ожидания)
    setTimeout(() => layers.forEach(loadLayer), 5000);
    if (startAt > 0) goTo(startAt, { instant: true });
    else goTo(0, { dur: .6 });
  }
  if (root.classList.contains("is-loading")) {
    // первый кадр проявляется уже в окне прелоадера, до его раскрытия
    document.addEventListener("arka:opening", () => stage.classList.add("is-on"), { once: true });
    document.addEventListener("arka:loaded", start, { once: true });
  }
  else start();
})();
