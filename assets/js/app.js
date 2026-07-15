/* Bokaro Startup & Business Network — app bootstrap */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const { AmbientNetwork, MemberNetwork } = window.BokaroNetwork;

    // ambient hero background
    const heroCanvas = document.getElementById("hero-canvas");
    if (heroCanvas) new AmbientNetwork(heroCanvas, { density: 0.00011, maxLinkDist: 150 }).start();

    // ambient join-section background
    const joinCanvas = document.getElementById("join-canvas");
    if (joinCanvas) new AmbientNetwork(joinCanvas, { density: 0.00007, maxLinkDist: 120, speed: 0.12 }).start();

    // interactive member network
    const netCanvas = document.getElementById("network-canvas");
    const tooltip = document.getElementById("network-tooltip");
    const dataEl = document.getElementById("network-data");
    if (netCanvas && tooltip && dataEl) {
      const nodes = JSON.parse(dataEl.textContent);
      const memberNet = new MemberNetwork(netCanvas, tooltip, nodes);
      memberNet.start();

      const chips = document.querySelectorAll("#network-filters .chip");
      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          chips.forEach((c) => c.classList.remove("is-active"));
          chip.classList.add("is-active");
          memberNet.setFilter(chip.dataset.filter);
        });
      });
    }

    // count-up stats
    const statEls = document.querySelectorAll(".stat-value[data-count]");
    if (statEls.length) {
      const animate = (el) => {
        const target = parseInt(el.dataset.count, 10) || 0;
        const dur = 1400;
        const start = performance.now();
        const step = (now) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      statEls.forEach((el) => io.observe(el));
    }

    // scroll reveal
    const revealEls = document.querySelectorAll("[data-reveal]");
    if (revealEls.length) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
        });
      }, { threshold: 0.15 });
      revealEls.forEach((el) => io.observe(el));
    }

    // header shadow/blur intensifies on scroll
    const header = document.querySelector(".site-header");
    if (header) {
      window.addEventListener("scroll", () => {
        header.style.borderBottomColor = window.scrollY > 12
          ? "rgba(245,166,35,0.15)"
          : "rgba(255,255,255,0.05)";
      }, { passive: true });
    }
  });
})();
