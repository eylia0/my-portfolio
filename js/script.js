// Change this to your real email:
const MY_EMAIL = "eylia@example.com";

function copyEmail() {
  navigator.clipboard.writeText(MY_EMAIL).then(() => {
    alert("Email copied: " + MY_EMAIL);
  }).catch(() => {
    alert("Couldn’t copy. Email: " + MY_EMAIL);
  });
}

// Set year
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// Tiny tilt effect for couture “feel” (subtle, optional)
document.querySelectorAll("[data-tilt]").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y*6).toFixed(2)}deg) rotateY(${(x*8).toFixed(2)}deg)`;
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "none";
  });
});
