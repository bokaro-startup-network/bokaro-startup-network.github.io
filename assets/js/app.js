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
    let memberNet = null;
    let nodes = [];
    let nodeById = {};
    if (netCanvas && tooltip && dataEl) {
      nodes = JSON.parse(dataEl.textContent);
      nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
      memberNet = new MemberNetwork(netCanvas, tooltip, nodes);
      memberNet.start();

      // path-finder
      const pathFrom = document.getElementById("path-from");
      const pathTo = document.getElementById("path-to");
      const pathBtn = document.getElementById("path-find");
      const pathCaption = document.getElementById("path-caption");

      const chips = document.querySelectorAll("#network-filters .chip");
      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          chips.forEach((c) => c.classList.remove("is-active"));
          chip.classList.add("is-active");
          memberNet.setFilter(chip.dataset.filter);
          memberNet.clearPath();
          if (pathCaption) pathCaption.textContent = "";
        });
      });

      if (pathBtn) {
        pathBtn.addEventListener("click", () => {
          const a = pathFrom.value, b = pathTo.value;
          if (!a || !b) {
            pathCaption.textContent = "Pick both roles to see how they connect.";
            return;
          }
          if (a === b) {
            pathCaption.textContent = "Pick two different roles to see a connection.";
            return;
          }
          memberNet.setPath(a, b);
          pathCaption.textContent = `${nodeById[a].label} ↔ ${nodeById[b].label} — connected through the network.`;
          netCanvas.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    }

    // "which node are you?" quiz
    const quizCard = document.querySelector(".quiz-card");
    if (quizCard && nodes.length) {
      const QUIZ_STORAGE_KEY = "bokaro_quiz_result";
      const QUIZ_QUESTIONS = [
        {
          title: "What are you mainly focused on right now?",
          options: [
            { text: "Building and launching something new", scores: { founders: 3, entrepreneurs: 2 } },
            { text: "Running and growing an existing business", scores: { owners: 3, entrepreneurs: 1 } },
            { text: "Offering a skill or service to others", scores: { freelancers: 2, professionals: 2 } },
            { text: "Exploring ideas, not fully committed yet", scores: { entrepreneurs: 3, creators: 1 } },
          ],
        },
        {
          title: "Which of these is closest to your craft?",
          options: [
            { text: "Code and products", scores: { developers: 3 } },
            { text: "Design and visuals", scores: { designers: 3, creators: 1 } },
            { text: "Numbers, compliance, and finance", scores: { cas: 3 } },
            { text: "Words, content, and audiences", scores: { creators: 3, marketers: 2 } },
            { text: "Growth, brand, and demand", scores: { marketers: 3 } },
          ],
        },
        {
          title: "What do you need most from a network right now?",
          options: [
            { text: "Customers and visibility", scores: { marketers: 2, owners: 1 } },
            { text: "Talent and collaborators", scores: { founders: 2, developers: 1 } },
            { text: "Advice from people who've done it", scores: { entrepreneurs: 2, professionals: 1 } },
            { text: "Compliance or financial peace of mind", scores: { cas: 2, professionals: 1 } },
          ],
        },
      ];

      const quizIntro = document.getElementById("quiz-intro");
      const quizQuestions = document.getElementById("quiz-questions");
      const quizQuestionEl = document.getElementById("quiz-question");
      const quizProgressEl = document.getElementById("quiz-progress");
      const quizResultEl = document.getElementById("quiz-result");
      const quizStartBtn = document.getElementById("quiz-start");

      let qStep = 0;
      let qScores = {};

      const showPanel = (el) => {
        [quizIntro, quizQuestions, quizResultEl].forEach((p) => { if (p) p.hidden = (p !== el); });
      };

      const renderProgress = () => {
        quizProgressEl.innerHTML = QUIZ_QUESTIONS.map((_, i) =>
          `<span class="${i < qStep ? "is-done" : ""}"></span>`
        ).join("");
      };

      const renderQuestion = () => {
        renderProgress();
        const q = QUIZ_QUESTIONS[qStep];
        quizQuestionEl.innerHTML = `
          <p class="quiz-q-title">${q.title}</p>
          <div class="quiz-options">
            ${q.options.map((o, i) => `<button class="quiz-option" data-i="${i}" type="button">${o.text}</button>`).join("")}
          </div>
          ${qStep > 0 ? '<button class="quiz-back" id="quiz-back" type="button">Back</button>' : ""}
        `;
        quizQuestionEl.querySelectorAll(".quiz-option").forEach((btn) => {
          btn.addEventListener("click", () => {
            const opt = q.options[parseInt(btn.dataset.i, 10)];
            Object.entries(opt.scores).forEach(([id, w]) => { qScores[id] = (qScores[id] || 0) + w; });
            qStep++;
            if (qStep < QUIZ_QUESTIONS.length) renderQuestion(); else finishQuiz();
          });
        });
        const backBtn = document.getElementById("quiz-back");
        if (backBtn) backBtn.addEventListener("click", () => { qStep--; renderQuestion(); });
      };

      const bestMatch = () => {
        let bestId = null, bestScore = -1;
        Object.entries(qScores).forEach(([id, s]) => { if (s > bestScore) { bestScore = s; bestId = id; } });
        return nodeById[bestId] || nodes[0];
      };

      const highlightOnGraph = (node) => {
        if (!memberNet) return;
        memberNet.setFilter("all");
        memberNet.clearPath();
        document.querySelectorAll("#network-filters .chip").forEach((c) => {
          c.classList.toggle("is-active", c.dataset.filter === "all");
        });
        memberNet.focusNode(node.id);
      };

      const renderResult = (node, isReturning) => {
        quizResultEl.innerHTML = `
          <div class="quiz-result-node"></div>
          <h3>${isReturning ? "Welcome back — you're a " + node.label : "You're closest to: " + node.label}</h3>
          <p>${node.desc}</p>
          <div class="quiz-result-actions">
            <a class="btn btn-primary" href="#network">See where you fit</a>
            <button class="btn btn-ghost btn-small" id="quiz-retake" type="button">Retake the quiz</button>
          </div>
        `;
        showPanel(quizResultEl);
        highlightOnGraph(node);
        const retakeBtn = document.getElementById("quiz-retake");
        if (retakeBtn) {
          retakeBtn.addEventListener("click", () => {
            try { localStorage.removeItem(QUIZ_STORAGE_KEY); } catch (e) {}
            qStep = 0; qScores = {};
            if (memberNet) memberNet.pinned = null;
            showPanel(quizIntro);
          });
        }
      };

      const finishQuiz = () => {
        const node = bestMatch();
        try { localStorage.setItem(QUIZ_STORAGE_KEY, node.id); } catch (e) {}
        renderResult(node, false);
      };

      if (quizStartBtn) {
        quizStartBtn.addEventListener("click", () => {
          qStep = 0; qScores = {};
          showPanel(quizQuestions);
          renderQuestion();
        });
      }

      let savedId = null;
      try { savedId = localStorage.getItem(QUIZ_STORAGE_KEY); } catch (e) {}
      if (savedId && nodeById[savedId]) renderResult(nodeById[savedId], true);
    }

    // opportunities board — reads static/data/opportunities.json today.
    // To go live: publish a Google Sheet as JSON (e.g. via a small Apps Script
    // web app or a service like opensheet.elk.sh) and point data-endpoint in
    // board.html at that URL instead. Cards are built with textContent (not
    // innerHTML) so free-text submissions from a public sheet can't inject HTML.
    const boardGrid = document.getElementById("board-grid");
    if (boardGrid && boardGrid.dataset.endpoint) {
      fetch(boardGrid.dataset.endpoint)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((items) => {
          if (!Array.isArray(items) || !items.length) return;
          boardGrid.innerHTML = "";
          items.forEach((o, i) => {
            const card = document.createElement("div");
            card.className = "board-card is-visible";
            card.style.setProperty("--d", i);
            const tag = document.createElement("span");
            tag.className = "board-tag";
            tag.textContent = o.tag || "";
            const title = document.createElement("h3");
            title.textContent = o.title || "";
            const text = document.createElement("p");
            text.textContent = o.text || "";
            card.append(tag, title, text);
            boardGrid.appendChild(card);
          });
        })
        .catch(() => { /* server-rendered fallback already in the DOM stays as-is */ });
    }

    // recent-activity ticker — stays hidden unless static/data/members-feed.json
    // actually has entries (see the comment in members-ticker.html for the format).
    const ticker = document.getElementById("members-ticker");
    const tickerTrack = document.getElementById("members-ticker-track");
    if (ticker && tickerTrack && ticker.dataset.endpoint) {
      fetch(ticker.dataset.endpoint)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((items) => {
          if (!Array.isArray(items) || !items.length) return;
          tickerTrack.innerHTML = "";
          const build = () => {
            items.forEach((entry) => {
              const el = document.createElement("span");
              el.className = "members-ticker-item";
              el.textContent = entry.text || "";
              tickerTrack.appendChild(el);
            });
          };
          build();
          build(); // duplicate once for a seamless scroll loop
          ticker.hidden = false;
        })
        .catch(() => { /* no real data yet — stays hidden, never fake */ });
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
