/* =========================================================
   main.js — theme, scroll progress, cursor ring, portrait
   reveal, publication filters, scroll reveals, year stamp.
   No dependencies.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- theme ---------- */
  var THEME_KEY = "portfolio-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.querySelector(".theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", String(theme === "light"));
      btn.setAttribute("aria-label", "Switch to " + (theme === "light" ? "dark" : "light") + " theme");
    }
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
    var theme = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    applyTheme(theme);

    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------- scroll progress bar in the header ---------- */
  function initProgress() {
    var bar = document.querySelector(".header__progress");
    if (!bar) return;
    var max = 0;

    /* the only layout read happens here, not on every scroll tick */
    function measure() {
      max = document.documentElement.scrollHeight - window.innerHeight;
      update();
    }
    function update() {
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.setProperty("--progress", Math.min(100, Math.max(0, pct)).toFixed(2) + "%");
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(document.body);
    window.addEventListener("load", measure);
    measure();
  }

  /* ---------- custom cursor ring ---------- */
  function initCursor() {
    if (!fine || reduceMotion) return;
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    var x = 0, y = 0, rx = 0, ry = 0, raf = null;

    function loop() {
      rx += (x - rx) * 0.22;
      ry += (y - ry) * 0.22;
      ring.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px)";
      raf = requestAnimationFrame(loop);
    }

    document.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      ring.classList.add("is-visible");
      if (!raf) loop();
      var t = e.target.closest("a, button, .card--hover, .pub, .portrait__frame");
      ring.classList.toggle("is-big", !!t);
    }, { passive: true });

    document.addEventListener("mouseleave", function () { ring.classList.remove("is-visible"); });
  }

  /* ---------- portrait: cursor-following circular reveal ---------- */
  function initPortrait() {
    var portrait = document.querySelector("[data-portrait]");
    if (!portrait) return;
    var frame = portrait.querySelector(".portrait__frame");
    if (!frame) return;

    function setVar(name, value) { portrait.style.setProperty(name, value); }

    function move(e) {
      var r = frame.getBoundingClientRect();
      setVar("--mx", (e.clientX - r.left).toFixed(1) + "px");
      setVar("--my", (e.clientY - r.top).toFixed(1) + "px");
    }

    if (fine) {
      frame.addEventListener("mouseenter", function (e) {
        var r = frame.getBoundingClientRect();
        setVar("--rr", Math.max(90, Math.min(r.width, r.height) * 0.33).toFixed(1) + "px");
        move(e);
        setVar("--ring-o", "1");
        portrait.classList.add("is-on");
      });
      frame.addEventListener("mousemove", move);
      frame.addEventListener("mouseleave", function () {
        setVar("--ring-o", "0");
        portrait.classList.remove("is-on");
      });
    }

    /* touch + keyboard fallback: reveal the whole photograph */
    var locked = false;
    function toggle() {
      locked = !locked;
      var r = frame.getBoundingClientRect();
      setVar("--mx", (r.width / 2).toFixed(1) + "px");
      setVar("--my", (r.height / 2).toFixed(1) + "px");
      setVar("--rr", (Math.hypot(r.width, r.height) / 2).toFixed(1) + "px");
      setVar("--ring-o", "0");
      portrait.classList.toggle("is-on", locked);
    }

    frame.addEventListener("click", function () { if (!fine) toggle(); });

    var toggleBtn = portrait.querySelector("[data-portrait-toggle]");
    if (toggleBtn) toggleBtn.addEventListener("click", toggle);
  }

  /* ---------- publication filters ---------- */
  function initFilters() {
    var group = document.querySelector("[data-filters]");
    if (!group) return;
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-kind]"));
    var count = document.querySelector("[data-filter-count]");

    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter");
      if (!btn) return;
      var want = btn.dataset.filter;

      group.querySelectorAll(".filter").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });

      var shown = 0;
      items.forEach(function (item) {
        var match = want === "all" || item.dataset.kind === want;
        item.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? " entry" : " entries");
    });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- sticky-note wall: click a note to expand it ---------- */
  function initNotes() {
    var notes = document.querySelectorAll(".note");
    if (!notes.length) return;

    notes.forEach(function (note) {
      var more = note.querySelector(".note__more");
      var toggle = note.querySelector(".note__toggle");

      /* a note with nothing hidden is not interactive */
      if (!more) {
        note.setAttribute("tabindex", "-1");
        note.style.cursor = "default";
        return;
      }

      note.setAttribute("aria-expanded", "false");
      note.addEventListener("click", function () {
        var open = note.classList.toggle("is-open");
        note.setAttribute("aria-expanded", String(open));
        if (toggle) toggle.textContent = open ? "Click to collapse" : "Click to expand";
      });
    });
  }

  /* ---------- the cat ---------- */
  function initCat() {
    var cat = document.querySelector("[data-cat]");
    if (!cat) return;
    var btn = cat.querySelector(".cat__btn");
    var bubble = cat.querySelector(".cat__bubble");
    var status = cat.querySelector("[data-cat-status]");
    var noises = ["meow!", "mrrp?", "purr\u2026", "mew!", "meowww", "\u2026prrp"];
    var n = 0, hideBubble = null, sleepAgain = null;

    btn.addEventListener("click", function () {
      var noise = noises[n++ % noises.length];
      bubble.textContent = noise;
      cat.classList.add("is-meowing", "is-awake");
      if (status) status.textContent = "The cat says " + noise;

      clearTimeout(hideBubble); clearTimeout(sleepAgain);
      hideBubble = setTimeout(function () { cat.classList.remove("is-meowing"); }, 1600);
      sleepAgain = setTimeout(function () { cat.classList.remove("is-awake"); }, 4500);
    });
  }

  /* ---------- print / save-as-PDF buttons ---------- */
  function initPrint() {
    document.querySelectorAll("[data-print]").forEach(function (btn) {
      btn.addEventListener("click", function () { window.print(); });
    });
  }

  /* ---------- misc ---------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function init() {
    initTheme();
    initProgress();
    initCursor();
    initPortrait();
    initFilters();
    initReveal();
    initNotes();
    initCat();
    initPrint();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
