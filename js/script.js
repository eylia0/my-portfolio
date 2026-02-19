/* =========================================================
  FOOTER: Current year
========================================================= */
(function setYear(){
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();

/* =========================================================
  MICRO-INTERACTION: Tilt effect
  - Subtle “couture” feel on elements with [data-tilt]
========================================================= */
(function tilt(){
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "none";
    });
  });
})();

/* =========================================================
  HERO: Background slideshow (image behind, effects on top)
  - Add images via index.html: data-hero="img1,img2,img3"
========================================================= */
(function heroSlideshow(){
  const el = document.querySelector(".media--hero");
  if (!el) return;

  const raw = el.getAttribute("data-hero");
  if (!raw) return;

  const imgs = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (imgs.length === 0) return;

  let i = 0;
  const intervalMs = 3800; // slide timing
  const fadeMs = 650;      // must match CSS transition

  // set first image immediately
  el.style.setProperty("--hero-img", `url("${imgs[i]}")`);

  // if only one image, stop here
  if (imgs.length < 2) return;

  let timer = null;

  const next = () => {
    el.classList.add("is-fading");

    window.setTimeout(() => {
      i = (i + 1) % imgs.length;
      el.style.setProperty("--hero-img", `url("${imgs[i]}")`);
      el.classList.remove("is-fading");
    }, fadeMs);
  };

  const start = () => {
    if (timer) return;
    timer = window.setInterval(next, intervalMs);
  };

  const stop = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  };

  // start + pause on hover (nice for reading labels)
  start();
  el.addEventListener("mouseenter", stop);
  el.addEventListener("mouseleave", start);
})();

/* =========================================================
  WORK IN PROGRESS POPUP (show once)
========================================================= */
(function workInProgressNotice(){
  const KEY = "wip_seen";
  const el = document.getElementById("wip");
  const btn = document.getElementById("wipClose");

  if (!el || !btn) return;

  // already seen → don’t show
  if (localStorage.getItem(KEY)) {
    el.classList.add("is-hidden");
    return;
  }

  btn.addEventListener("click", () => {
    localStorage.setItem(KEY, "1");
    el.classList.add("is-hidden");
  });
})();
/* =========================================================
  TERMS / IP ACKNOWLEDGEMENT (show once)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const KEY = "terms_accepted";
  const notice = document.getElementById("termsNotice");
  const btn = document.getElementById("termsAccept");

  if (!notice || !btn) return;

  if (localStorage.getItem(KEY)) {
    notice.classList.add("is-hidden");
    return;
  }

  btn.addEventListener("click", () => {
    localStorage.setItem(KEY, "1");
    notice.classList.add("is-hidden");
  });
});
/* =========================================================
  EARTHLIGHT HERO: crossfade + tilt
  Runs only if the Earthlight hero exists on the page
========================================================= */
(function(){
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const base = document.getElementById("heroImgBase");
  const overlay = document.getElementById("heroImgOverlay");
  const card = document.getElementById("heroCard");
  if(!base || !overlay || !card) return;

  // Crossfade rhythm
  let on = false;
  const cycleMs = 9000; // change to 7000 for faster, 11000 for slower

  function toggle(){
    on = !on;
    overlay.style.opacity = on ? "1" : "0";
  }

  // Start once page fully loads (prevents first-fade glitch)
  window.addEventListener("load", () => {
    toggle();
    setInterval(toggle, cycleMs);
  });

  // Tilt (applies to both layers)
  function onMove(e){
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const cy = r.top + r.height/2;

    const dx = (e.clientX - cx) / r.width;
    const dy = (e.clientY - cy) / r.height;

    const rotY = dx * 8;
    const rotX = -dy * 6;

    const t = `scale(1.06) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    base.style.transform = t;
    overlay.style.transform = t;
  }

  function onLeave(){
    base.style.transform = "scale(1.03)";
    overlay.style.transform = "scale(1.03)";
  }

  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseleave", onLeave);
})();



