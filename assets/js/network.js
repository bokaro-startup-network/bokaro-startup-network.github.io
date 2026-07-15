/* Bokaro Startup & Business Network — canvas network engine (ambient background + interactive member graph) */
(function (window) {
  "use strict";

  function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  /* ---------------- Ambient drifting particle network (hero / join sections) ---------------- */
  class AmbientNetwork {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = Object.assign({
        density: 0.00009,
        maxLinkDist: 140,
        speed: 0.18,
        colorA: "245,166,35",
        colorB: "111,146,179",
      }, opts || {});
      this.particles = [];
      this.running = false;
      this._resize = this._resize.bind(this);
      this._tick = this._tick.bind(this);
      this._resize();
      window.addEventListener("resize", this._resize);
      this._observe();
    }

    _observe() {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) this.start(); else this.stop();
        });
      }, { threshold: 0.01 });
      io.observe(this.canvas);
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = this.w * dpr();
      this.canvas.height = this.h * dpr();
      this.ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
      const count = Math.max(24, Math.round(this.w * this.h * this.opts.density));
      this.particles = new Array(count).fill(0).map(() => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * this.opts.speed,
        vy: (Math.random() - 0.5) * this.opts.speed,
        r: Math.random() * 1.6 + 0.6,
        hot: Math.random() > 0.82,
      }));
    }

    start() {
      if (this.running) return;
      this.running = true;
      this._raf = requestAnimationFrame(this._tick);
    }

    stop() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    _tick() {
      if (!this.running) return;
      const { ctx, w, h, particles, opts } = this;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < opts.maxLinkDist) {
            const alpha = (1 - dist / opts.maxLinkDist) * 0.35;
            ctx.strokeStyle = `rgba(${opts.colorB},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = p.hot ? `rgba(${opts.colorA},0.9)` : `rgba(${opts.colorB},0.7)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.hot) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${opts.colorA},0.15)`;
          ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      this._raf = requestAnimationFrame(this._tick);
    }
  }

  /* ---------------- Interactive member-type network (the "Who You'll Meet" graph) ---------------- */
  class MemberNetwork {
    constructor(canvas, tooltipEl, nodesData) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.tooltip = tooltipEl;
      this.data = nodesData;
      this.filter = "all";
      this.hovered = null;
      this.pinned = null;
      this.mouse = { x: -9999, y: -9999 };
      this.t = 0;

      this._resize = this._resize.bind(this);
      this._tick = this._tick.bind(this);
      this._onMove = this._onMove.bind(this);
      this._onLeave = this._onLeave.bind(this);
      this._onClick = this._onClick.bind(this);

      this._resize();
      this._layout();
      window.addEventListener("resize", () => { this._resize(); this._layout(); });
      canvas.addEventListener("mousemove", this._onMove);
      canvas.addEventListener("mouseleave", this._onLeave);
      canvas.addEventListener("click", this._onClick);
      canvas.addEventListener("touchstart", (e) => {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        this._onMove({ clientX: t.clientX, clientY: t.clientY });
        this.mouse.x = t.clientX - rect.left;
        this.mouse.y = t.clientY - rect.top;
        this._onClick({ clientX: t.clientX, clientY: t.clientY });
      }, { passive: true });

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) this.start(); else this.stop(); });
      }, { threshold: 0.01 });
      io.observe(canvas);
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = this.w * dpr();
      this.canvas.height = this.h * dpr();
      this.ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    }

    _layout() {
      const cx = this.w / 2, cy = this.h / 2;
      const n = this.data.length;
      const radius = Math.min(this.w, this.h) * 0.36;
      this.nodes = this.data.map((d, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const jitter = (i % 2 === 0 ? 0.86 : 1.08);
        return Object.assign({}, d, {
          baseX: cx + Math.cos(angle) * radius * jitter,
          baseY: cy + Math.sin(angle) * radius * jitter,
          x: cx + Math.cos(angle) * radius * jitter,
          y: cy + Math.sin(angle) * radius * jitter,
          angle,
          phase: Math.random() * Math.PI * 2,
          r: 10 + d.weight * 2.1,
        });
      });
      // centerpiece "community" node
      this.center = { x: cx, y: cy, r: 22, label: "You" };
    }

    setFilter(id) { this.filter = id; }

    start() { if (this._raf) return; this._raf = requestAnimationFrame(this._tick); }
    stop() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } }

    _onMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this._updateHover();
    }
    _onLeave() {
      this.mouse.x = -9999; this.mouse.y = -9999;
      this.hovered = null;
      this._hideTooltip();
    }
    _onClick(e) {
      if (this.hovered) {
        this.pinned = this.pinned === this.hovered ? null : this.hovered;
      } else {
        this.pinned = null;
        this._hideTooltip();
      }
    }

    _updateHover() {
      let found = null;
      for (const node of this.nodes) {
        const dx = node.x - this.mouse.x, dy = node.y - this.mouse.y;
        if (Math.sqrt(dx * dx + dy * dy) <= node.r + 4) { found = node; break; }
      }
      this.hovered = found;
      const active = this.pinned || this.hovered;
      if (active) this._showTooltip(active); else this._hideTooltip();
      this.canvas.style.cursor = found ? "pointer" : "grab";
    }

    _showTooltip(node) {
      this.tooltip.innerHTML = `<strong>${node.label}</strong>${node.desc}`;
      this.tooltip.style.left = node.x + "px";
      this.tooltip.style.top = (node.y - node.r) + "px";
      this.tooltip.classList.add("is-visible");
    }
    _hideTooltip() {
      if (!this.pinned) this.tooltip.classList.remove("is-visible");
    }

    _tick() {
      this.t += 0.008;
      const { ctx, w, h, nodes, center } = this;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((n, i) => {
        n.x = n.baseX + Math.cos(this.t + n.phase) * 10;
        n.y = n.baseY + Math.sin(this.t * 1.2 + n.phase) * 10;
      });

      const active = this.pinned || this.hovered;
      const isDimmed = (n) => {
        if (this.filter !== "all" && n.id !== this.filter) return true;
        if (active && active !== n && active !== center) return true;
        return false;
      };

      // links: center to every node, plus a light web between neighbors
      ctx.lineWidth = 1;
      nodes.forEach((n) => {
        const dim = isDimmed(n) || (active && active !== center && active !== n);
        const highlight = active === n;
        ctx.strokeStyle = highlight
          ? "rgba(245,166,35,0.75)"
          : dim ? "rgba(111,146,179,0.08)" : "rgba(111,146,179,0.28)";
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < Math.min(w, h) * 0.34) {
            const dim = isDimmed(a) || isDimmed(b);
            ctx.strokeStyle = dim ? "rgba(111,146,179,0.03)" : "rgba(111,146,179,0.09)";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // traveling sparks along a couple of edges for life
      const sparkCount = 3;
      for (let s = 0; s < sparkCount; s++) {
        const n = nodes[(Math.floor(this.t * 6) + s * 3) % nodes.length];
        const prog = (this.t * 0.6 + s / sparkCount) % 1;
        const sx = center.x + (n.x - center.x) * prog;
        const sy = center.y + (n.y - center.y) * prog;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,150,60,0.9)";
        ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // center node
      const grd = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, center.r);
      grd.addColorStop(0, "#ffd98a");
      grd.addColorStop(1, "#f5a623");
      ctx.beginPath();
      ctx.fillStyle = grd;
      ctx.arc(center.x, center.y, center.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(245,166,35,0.25)";
      ctx.lineWidth = 8;
      ctx.arc(center.x, center.y, center.r + 6, 0, Math.PI * 2);
      ctx.stroke();

      // member nodes
      nodes.forEach((n) => {
        const dim = isDimmed(n);
        const highlight = active === n;
        const r = highlight ? n.r * 1.12 : n.r;
        ctx.beginPath();
        ctx.fillStyle = dim ? "rgba(111,146,179,0.18)" : "rgba(111,146,179,0.9)";
        if (highlight) ctx.fillStyle = "#f5a623";
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (highlight) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(245,166,35,0.35)";
          ctx.lineWidth = 6;
          ctx.arc(n.x, n.y, r + 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (!dim) {
          ctx.font = "600 12px Sora, sans-serif";
          ctx.fillStyle = highlight ? "#f5a623" : "rgba(238,241,244,0.82)";
          ctx.textAlign = "center";
          ctx.fillText(n.short, n.x, n.y + r + 18);
        }
      });

      if (active && active !== center) {
        this._showTooltip(active);
      }

      this._raf = requestAnimationFrame(this._tick);
    }
  }

  window.BokaroNetwork = { AmbientNetwork, MemberNetwork };
})(window);
