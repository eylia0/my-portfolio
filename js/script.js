/* =========================================================
  CONFIG (EDIT THIS)
========================================================= */
const MY_EMAIL = "eylia@example.com"; // <-- change to your real email

/* =========================================================
  CONTACT: Copy email (no popups)
========================================================= */
function copyEmail() {
  const btn = document.querySelector('[onclick="copyEmail()"]');
  const original = btn ? btn.textContent : "";

  const done = () => {
    if (btn) {
      btn.textContent = "Copied ✓";
      setTimeout(() => (btn.textContent = original || "Copy my email"), 1400);
    }
  };

  navigator.clipboard.writeText(MY_EMAIL).then(done).catch(() => {
    // Fallback: show prompt so user can copy manually
    window.prompt("Copy email:", MY_EMAIL);
    done();
  });
}

/* Keep the visible email link in sync with MY_EMAIL */
(function syncEmailLink(){
  const a = document.querySelector(".contact__emailLink");
  if (!a) return;
  a.textContent = MY_EMAIL;
  a.setAttribute("href", `mailto:${MY_EMAIL}`);
})();

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
