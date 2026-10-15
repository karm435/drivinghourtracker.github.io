/* Driving Hour Tracker website. No dependencies. Every effect degrades to a finished static state when
   prefers-reduced-motion is on or JavaScript is unavailable. */
(() => {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const seg = (t, a, b) => ease(clamp((t - a) / (b - a)));
  const smooth = (t, a, b) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
  const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const fmtHours = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  /* ---------- nav shadow ---------- */
  const nav = $("#nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", scrollY > 24);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- email reveal (support, privacy) ---------- */
  for (const button of $$("[data-mail-user]")) {
    button.addEventListener("click", () => {
      const reverse = (value) => [...value].reverse().join("");
      const address = `${reverse(button.dataset.mailUser)}@${reverse(button.dataset.mailHost)}`;
      const link = document.createElement("a");
      link.href = `mailto:${address}?subject=${encodeURIComponent("Driving Hour Tracker support")}`;
      link.textContent = address;
      button.replaceWith(link);
      link.focus();
    });
  }

  /* ---------- reveal on scroll ---------- */
  for (const group of $$("[data-stagger]")) {
    Array.from(group.children).forEach((child, i) => child.style.setProperty("--i", i));
  }
  const revealTargets = $$("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------- count-ups ("62h 50m") ---------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const run = (el) => {
      const target = parseInt(el.dataset.count, 10);
      if (reduce) { el.textContent = fmtHours(target); return; }
      const t0 = performance.now();
      const tick = (now) => {
        const p = ease(clamp((now - t0) / 1600));
        el.textContent = fmtHours(Math.round(target * p));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (reduce || !("IntersectionObserver" in window)) counters.forEach(run);
    else {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      }, { threshold: 0.4 });
      counters.forEach((el) => io.observe(el));
    }
  }

  /* ---------- hero: live timer and pointer parallax ---------- */
  const heroTimer = $("#heroTimer");
  if (heroTimer && !reduce) {
    let seconds = 4;
    setInterval(() => { seconds += 1; heroTimer.textContent = fmtClock(seconds); }, 1000);
  }
  const heroStage = $("#heroStage");
  if (heroStage && finePointer && !reduce) {
    const hero = $(".hero");
    let targetX = 0, targetY = 0, x = 0, y = 0, raf = 0;
    const layers = $$("[data-depth]", heroStage);
    layers.forEach((l) => l.style.setProperty("--d", l.dataset.depth));
    const paint = () => {
      x += (targetX - x) * 0.08; y += (targetY - y) * 0.08;
      heroStage.style.setProperty("--mx", x.toFixed(3));
      heroStage.style.setProperty("--my", y.toFixed(3));
      if (Math.abs(targetX - x) > 0.001 || Math.abs(targetY - y) > 0.001) raf = requestAnimationFrame(paint); else raf = 0;
    };
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      targetY = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(paint);
    });
    hero.addEventListener("pointerleave", () => { targetX = 0; targetY = 0; if (!raf) raf = requestAnimationFrame(paint); });
  }

  /* ---------- the drive: scroll-driven road ---------- */
  const drive = $("#how");
  const stage = $("#driveStage");
  const roadPath = $("#roadPath");
  if (drive && stage && roadPath && !reduce) {
    const car = $("#car");
    const trailDay = $("#trailDay");
    const trailNight = $("#trailNight");
    const nightLayer = $("#nightLayer");
    const sun = $("#sun");
    const moon = $("#moon");
    const liveTimer = $("#liveTimer");
    const liveBar = $("#liveBar");
    const liveCap = $("#liveCap");
    const hint = $("#scrollHint");
    const steps = $$("#steps .step");
    const stops = $$(".stop", stage);
    const roadSvg = $("#roadSvg");
    const roadPaths = $$("path", roadSvg);
    const GEOMETRY = {
      landscape: { box: "0 0 1440 900", w: 1440, h: 900, d: "M -60 720 C 220 720, 300 470, 520 470 S 760 650, 960 560 S 1180 330, 1300 270 S 1440 200, 1520 160" },
      portrait: { box: "0 0 900 1440", w: 900, h: 1440, d: "M 300 -60 C 300 160, 120 260, 150 440 S 760 560, 760 760 S 160 960, 180 1160 S 600 1320, 640 1500" },
    };
    let vb = GEOMETRY.landscape, length = roadPath.getTotalLength();
    const SUNSET = 0.5;
    const DRIVE_SECONDS = 45 * 60;
    const BASE_MINUTES = 62 * 60 + 50, GOAL_MINUTES = 100 * 60;

    // Portrait viewports get a road that winds top to bottom; the stop cards sit at their point on it.
    function applyGeometry() {
      const g = innerWidth < innerHeight ? GEOMETRY.portrait : GEOMETRY.landscape;
      if (g !== vb) {
        vb = g;
        roadSvg.setAttribute("viewBox", g.box);
        roadPaths.forEach((p) => p.setAttribute("d", g.d));
        length = roadPath.getTotalLength();
      }
      for (const stop of stops) {
        const pt = roadPath.getPointAtLength(length * parseFloat(stop.dataset.at));
        stop.dataset.x = pt.x; stop.dataset.y = pt.y;
      }
      placeStops();
    }
    function placeStops() {
      // The SVG uses "slice", so work out the uniform scale and offset it actually drew with.
      const r = stage.getBoundingClientRect();
      const scale = Math.max(r.width / vb.w, r.height / vb.h);
      const ox = (r.width - vb.w * scale) / 2, oy = (r.height - vb.h * scale) / 2;
      for (const stop of stops) {
        stop.style.left = `${ox + parseFloat(stop.dataset.x) * scale}px`;
        stop.style.top = `${oy + parseFloat(stop.dataset.y) * scale}px`;
      }
    }
    applyGeometry();

    let active = false, raf = 0, last = -1;
    const render = () => {
      raf = 0;
      const r = drive.getBoundingClientRect();
      const total = drive.offsetHeight - innerHeight;
      const p = clamp(-r.top / total);
      if (p === last) return;
      last = p;

      // car and trails
      const at = length * p;
      const pt = roadPath.getPointAtLength(at);
      const ahead = roadPath.getPointAtLength(Math.min(length, at + 2));
      const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
      car.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(1.15)`);
      const dayLen = length * Math.min(p, SUNSET);
      trailDay.setAttribute("stroke-dasharray", `${dayLen} ${length}`);
      const nightLen = length * Math.max(0, p - SUNSET);
      trailNight.setAttribute("stroke-dasharray", `0 ${length * SUNSET} ${nightLen} ${length}`);

      // day to night
      const dusk = smooth(p, SUNSET - 0.1, SUNSET + 0.14);
      nightLayer.style.opacity = dusk.toFixed(3);
      sun.style.transform = `translate3d(${(p * 40).toFixed(1)}vw, ${(smooth(p, 0.2, SUNSET + 0.1) * 70).toFixed(1)}vh, 0)`;
      sun.style.opacity = (1 - smooth(p, SUNSET - 0.02, SUNSET + 0.12)).toFixed(3);
      moon.style.opacity = dusk.toFixed(3);
      moon.style.transform = `translate3d(0, ${((1 - dusk) * 120).toFixed(1)}px, 0)`;
      stage.classList.toggle("dark", dusk > 0.5);

      // the Live Activity at the top
      const elapsed = Math.round(DRIVE_SECONDS * p);
      liveTimer.textContent = fmtClock(elapsed);
      const pct = (BASE_MINUTES + elapsed / 60) / GOAL_MINUTES;
      liveBar.style.width = `${(pct * 100).toFixed(2)}%`;
      liveCap.textContent = `${Math.round(pct * 100)}% of 100h goal`;

      // captions and cards
      let current = 0;
      steps.forEach((s, i) => { if (p >= parseFloat(s.dataset.at) - 0.03) current = i; });
      steps.forEach((s, i) => s.classList.toggle("on", i === current));
      stops.forEach((s) => {
        const a = parseFloat(s.dataset.at);
        s.classList.toggle("on", p >= a - 0.03 && p < a + 0.19);
      });
      hint.classList.toggle("on", p < 0.03);
    };
    const schedule = () => { if (active && !raf) raf = requestAnimationFrame(render); };
    const io = new IntersectionObserver((entries) => {
      active = entries[0].isIntersecting;
      if (active) schedule();
    }, { rootMargin: "20% 0px 20% 0px" });
    io.observe(drive);
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", () => { applyGeometry(); last = -1; schedule(); });
    render();
  } else if (trailDayFallback()) { /* reduced motion: the CSS shows the whole road and every step */ }
  function trailDayFallback() {
    const car = $("#car"), path = $("#roadPath");
    if (!car || !path) return false;
    const pt = path.getPointAtLength(path.getTotalLength() * 0.5);
    car.setAttribute("transform", `translate(${pt.x} ${pt.y}) rotate(-20) scale(1.15)`);
    return true;
  }

  /* ---------- feature tiles ---------- */
  // Notification tile reveals its notification; the horizon tile sets the sun; both ride the reveal observer.
  const horizon = $(".horizon");
  if (horizon && !reduce) {
    const tile = horizon.closest(".tile");
    let toggled = false;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !toggled) {
        toggled = true;
        setTimeout(() => horizon.classList.add("dusk"), 700);
        setInterval(() => horizon.classList.toggle("dusk"), 6000);
        io.unobserve(tile);
      }
    }, { threshold: 0.5 });
    io.observe(tile);
  }

  // Route clip: play only while on screen.
  const clip = $(".t-map .clip");
  if (clip && !reduce) {
    clip.addEventListener("canplay", () => clip.classList.add("ready"), { once: true });
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { clip.play().catch(() => {}); } else { clip.pause(); }
    }, { threshold: 0.35 });
    io.observe(clip);
  }

  // Siri tile: cycle through two real phrases and their replies.
  const siriAsk = $("#siriAsk"), siriReply = $("#siriReply");
  if (siriAsk && siriReply && !reduce) {
    const lines = [
      ["“Start practice with Driving Hour Tracker”", "Practice drive started."],
      ["“Get my progress with Driving Hour Tracker”", "You have 62 hours, 50 minutes of practice, including 14 hours, 26 minutes at night."],
    ];
    let i = 0, timer = 0;
    const type = (text, el, done) => {
      el.textContent = "";
      let n = 0;
      const step = () => {
        n += 1; el.textContent = text.slice(0, n);
        if (n < text.length) timer = setTimeout(step, 28); else done();
      };
      step();
    };
    const cycle = () => {
      const [ask, reply] = lines[i % lines.length];
      siriReply.classList.add("hide");
      type(ask, siriAsk, () => {
        setTimeout(() => { siriReply.textContent = reply; siriReply.classList.remove("hide"); }, 500);
        timer = setTimeout(() => { i += 1; cycle(); }, 5200);
      });
    };
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { i = 0; cycle(); } else { clearTimeout(timer); }
    }, { threshold: 0.4 });
    io.observe(siriAsk.closest(".tile"));
  }

  // Dynamic Island tile: the island morphs idle -> compact -> expanded, like the real one.
  const di = $("#di");
  if (di && !reduce) {
    const stageEl = $("#islandStage");
    const compact = $("#diCompact"), expanded = $("#diExpanded");
    const arc = $("#diArc"), bar = $("#diBar"), cTime = $("#diCTime"), eTime = $("#diETime");
    const S = { idle: { w: 126, h: 37, r: 18.5 }, compact: { w: 250, h: 37, r: 18.5 }, expanded: { w: 404, h: 140, r: 46 } };
    const LOOP = 8, TIMER0 = 12 * 60 + 45 - 5, BASE = (62 * 60 + 50) * 60, GOAL = 100 * 3600, circ = 2 * Math.PI * 9.4;
    const mix = (p, q, f) => ({ w: p.w + (q.w - p.w) * f, h: p.h + (q.h - p.h) * f, r: p.r + (q.r - p.r) * f });
    let K = 1, running = false, t0 = 0, raf = 0;
    const fit = () => { K = Math.min(1, (stageEl.clientWidth - 16) / S.expanded.w); };
    const render = (t) => {
      t = ((t % LOOP) + LOOP) % LOOP;
      let shape;
      if (t < 0.5) shape = S.idle;
      else if (t < 1.3) shape = mix(S.idle, S.compact, seg(t, 0.5, 1.3));
      else if (t < 2.9) shape = S.compact;
      else if (t < 3.8) shape = mix(S.compact, S.expanded, seg(t, 2.9, 3.8));
      else if (t < 6.0) shape = S.expanded;
      else if (t < 6.8) shape = mix(S.expanded, S.compact, seg(t, 6.0, 6.8));
      else if (t < 6.9) shape = S.compact;
      else if (t < 7.7) shape = mix(S.compact, S.idle, seg(t, 6.9, 7.7));
      else shape = S.idle;
      di.style.width = `${shape.w * K}px`; di.style.height = `${shape.h * K}px`; di.style.borderRadius = `${shape.r * K}px`;
      const compactIn = seg(t, 0.9, 1.4) * (1 - seg(t, 2.9, 3.3)) + seg(t, 6.5, 6.9) * (1 - seg(t, 7.0, 7.4));
      const expandedIn = seg(t, 3.4, 3.9) * (1 - seg(t, 5.9, 6.3));
      compact.style.opacity = compactIn.toFixed(3); expanded.style.opacity = expandedIn.toFixed(3);
      compact.style.transform = `scale(${K})`; compact.style.transformOrigin = "0 0"; compact.style.left = `${(shape.w - S.compact.w) * K / 2}px`;
      expanded.style.transform = `scale(${K})`; expanded.style.transformOrigin = "0 0"; expanded.style.left = `${(shape.w - S.expanded.w) * K / 2}px`;
      const elapsed = TIMER0 + Math.floor(t);
      cTime.textContent = fmtClock(elapsed); eTime.textContent = fmtClock(elapsed);
      const fraction = (BASE + elapsed) / GOAL;
      const draw = seg(t, 0.9, 2.3) * (1 - seg(t, 7.0, 7.4));
      arc.setAttribute("stroke-dasharray", `${(circ * fraction * draw).toFixed(3)} ${circ.toFixed(3)}`);
      bar.style.width = `${(fraction * 100).toFixed(2)}%`;
    };
    const loop = (now) => { if (!running) return; render((now - t0) / 1000); raf = requestAnimationFrame(loop); };
    fit(); addEventListener("resize", fit);
    render(5);
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !running) { running = true; t0 = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!entries[0].isIntersecting) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.3 });
    io.observe(stageEl);
  } else if (di) {
    const expanded = $("#diExpanded");
    di.style.width = "404px"; di.style.height = "140px"; di.style.borderRadius = "46px";
    expanded.style.opacity = "1";
  }

  // Watch tile: cycle the screens.
  const watchScreen = $("#watchScreen");
  if (watchScreen) {
    const shots = $$("img", watchScreen);
    shots[1].classList.add("show");
    if (!reduce) {
      let i = 1, timer = 0;
      const next = () => { shots[i].classList.remove("show"); i = (i + 1) % shots.length; shots[i].classList.add("show"); };
      const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { timer = setInterval(next, 2600); } else { clearInterval(timer); }
      }, { threshold: 0.4 });
      io.observe(watchScreen);
    }
  }

  // Report tile: the page tilts toward the pointer.
  const paper = $("#paper");
  if (paper && finePointer && !reduce) {
    const art = paper.parentElement;
    art.addEventListener("pointermove", (e) => {
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      paper.style.setProperty("--ry", `${(x * 24).toFixed(1)}deg`);
      paper.style.setProperty("--rx", `${(-y * 24).toFixed(1)}deg`);
    });
    art.addEventListener("pointerleave", () => { paper.style.setProperty("--ry", "0deg"); paper.style.setProperty("--rx", "0deg"); });
  }

  /* ---------- FAQ: one open at a time ---------- */
  const items = $$(".faq-item");
  for (const item of items) {
    item.addEventListener("toggle", () => {
      if (item.open) for (const other of items) if (other !== item) other.open = false;
    });
  }
})();
