/* Boardly landing — tiny, dependency-free interactions. */
(() => {
  "use strict";

  const root = document.documentElement;
  // Signals JS is active so reveal-on-scroll can hide elements first (content
  // stays visible if JS is disabled or fails to load).
  root.classList.add("js");

  /* ---- Mobile menu ---- */
  const nav = document.querySelector(".nav");
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobile-menu");
  burger?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    if (menu) menu.hidden = !open;
  });
  menu?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      burger?.setAttribute("aria-expanded", "false");
      if (menu) menu.hidden = true;
    }),
  );

  /* ---- Copy-to-clipboard for code windows ---- */
  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = document.querySelector(btn.getAttribute("data-copy"));
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.innerText.trim());
        const original = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1600);
      } catch {
        btn.textContent = "Press ⌘C";
      }
    });
  });

  /* ---- Reveal on scroll ---- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---- Footer year ---- */
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
