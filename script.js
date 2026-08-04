/* ==========================================================================
   Project-Kreer Master Script Engine
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initLiveClock();
  initTagFilter();
  initScrollSpy();
  initProjectModals();
  initGitHubTelemetry();
  initCommandTerminal();
});

/* 1. Live System Clock */
function initLiveClock() {
  const clockElement = document.getElementById("live-clock");
  if (!clockElement) return;

  function updateTime() {
    const now = new Date();
    const utcTime = now.toUTCString().split(" ")[4];
    clockElement.textContent = `SYSTEM ONLINE | ${utcTime} UTC`;
  }

  updateTime();
  setInterval(updateTime, 1000);
}

/* 2. Interactive Tag Filtering */
function initTagFilter() {
  const tags = document.querySelectorAll(".tag");
  const cards = document.querySelectorAll(".card");
  let activeTag = null;

  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      const selectedText = tag.textContent.trim().toLowerCase();
      activeTag = activeTag === selectedText ? null : selectedText;

      cards.forEach((card) => {
        const cardTags = Array.from(card.querySelectorAll(".tag")).map((t) =>
          t.textContent.trim().toLowerCase()
        );

        if (!activeTag || cardTags.includes(activeTag)) {
          card.style.display = "block";
          card.style.opacity = "1";
        } else {
          card.style.display = "none";
          card.style.opacity = "0";
        }
      });

      tags.forEach((t) => {
        if (activeTag && t.textContent.trim().toLowerCase() === activeTag) {
          t.style.backgroundColor = "var(--accent-color)";
          t.style.color = "var(--bg-primary)";
        } else {
          t.style.backgroundColor = "var(--bg-hover)";
          t.style.color = "var(--accent-color)";
        }
      });
    });
  });
}

/* 3. ScrollSpy Navigation */
function initScrollSpy() {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll("nav a");

  window.addEventListener("scroll", () => {
    let currentSection = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        currentSection = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${currentSection}`) {
        link.classList.add("active");
      }
    });
  });
}

/* 4. Interactive Project Modals */
const projectDetails = {
  "Algorithmic Trading Agent": {
    architecture: "Event-driven architecture connecting local DeepSeek reasoning engine to Alpaca REST/WebSocket endpoints.",
    features: [
      "Real-time market order submission and backtesting engine",
      "Dynamic risk-management rules with automated stop-loss execution",
      "Historical data parsing for trade signal generation"
    ]
  },
  "Multi-Agent Workflow Engine": {
    architecture: "Autonomous multi-agent orchestration framework running local simulation environments.",
    features: [
      "Asynchronous message passing across agent nodes",
      "Custom role delegation for task execution and verification",
      "Pipeline logging and automated fallback states"
    ]
  },
  "Yahands E-Commerce & Web Infrastructure": {
    architecture: "Static frontend backed by automated deployment actions and centralized product data management.",
    features: [
      "Automated listing data sync and image optimization pipelines",
      "Mobile-optimized catalog browsing and authorization workflows",
      "CI/CD continuous delivery integration"
    ]
  }
};

function initProjectModals() {
  const modal = document.getElementById("project-modal");
  const modalBody = document.getElementById("modal-body");
  const closeBtn = document.getElementById("modal-close-btn");
  const projectCards = document.querySelectorAll(".project-card, #projects .card");

  if (!modal || !modalBody || !closeBtn) return;

  projectCards.forEach((card) => {
    card.addEventListener("click", () => {
      const title = card.querySelector("h3")?.textContent.trim() || "Project Details";
      const details = projectDetails[title] || {
        architecture: "Modular architecture built with responsive HTML5, custom CSS properties, and client-side JavaScript execution.",
        features: [
          "Deployed automatically via GitHub Actions CI/CD pipeline",
          "Mobile-first responsive design system",
          "Interactive DOM state management"
        ]
      };

      modalBody.innerHTML = `
        <h3>${title}</h3>
        <h4>System Architecture</h4>
        <p>${details.architecture}</p>
        <h4>Key Technical Highlights</h4>
        <ul>
          ${details.features.map(f => `<li>${f}</li>`).join("")}
        </ul>
      `;

      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  });

  const closeModal = () => {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  };

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

/* 5. Live GitHub Telemetry Fetcher */
async function initGitHubTelemetry() {
  const container = document.getElementById("telemetry-feed");
  if (!container) return;

  const username = "davenwer";
  const apiEndpoint = `https://api.github.com/users/${username}/repos?sort=updated&per_page=4`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(apiEndpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

    const repos = await response.json();

    if (!repos || repos.length === 0) {
      container.innerHTML = `<p class="text-muted">No public streams found.</p>`;
      return;
    }

    container.innerHTML = repos.map((repo) => `
      <article class="card telemetry-card">
        <div>
          <div class="repo-header">
            <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-title">
              ⚡ ${repo.name}
            </a>
          </div>
          <p>${repo.description || "Active public repository stream."}</p>
        </div>
        <div class="repo-meta">
          ${repo.language ? `<span class="lang-badge"><span class="lang-dot"></span>${repo.language}</span>` : ""}
          <span>⭐ ${repo.stargazers_count}</span>
          <span>Updated: ${new Date(repo.updated_at).toLocaleDateString()}</span>
        </div>
      </article>
    `).join("");

  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Telemetry fallback active:", error);
    container.innerHTML = `
      <article class="card telemetry-card">
        <div>
          <div class="repo-header">
            <a href="https://github.com/davenwer" target="_blank" rel="noopener" class="repo-title">
              ⚡ davenwer.github.io
            </a>
          </div>
          <p>Primary web platform & deployment pipeline repository.</p>
        </div>
        <div class="repo-meta">
          <span class="lang-badge"><span class="lang-dot"></span>JavaScript</span>
          <span>⭐ 1</span>
          <span>Status: Live</span>
        </div>
      </article>
    `;
  }
}

/* 6. Hybrid AI Chatbot & Command Terminal Handler */
function initCommandTerminal() {
  const triggerBtn = document.getElementById("cli-trigger");
  const drawer = document.getElementById("cli-drawer");
  const closeBtn = document.getElementById("cli-close");
  const form = document.getElementById("cli-form");
  const input = document.getElementById("cli-input");
  const output = document.getElementById("cli-output");
  const pills = document.querySelectorAll(".cli-pill");

  if (!triggerBtn || !drawer || !closeBtn || !form || !input || !output) return;

  // Touch and Click Event Handlers for Mobile Safari
  const openDrawer = (e) => {
    if (e) e.preventDefault();
    drawer.classList.add("active");
  };

  const closeDrawer = (e) => {
    if (e) e.preventDefault();
    drawer.classList.remove("active");
  };

  triggerBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);

  const getBotResponse = (query) => {
    const q = query.toLowerCase();

    if (q === "help") {
      return "Commands: <strong>status</strong>, <strong>theme</strong>, <strong>goto [section]</strong>, <strong>clear</strong>. Or ask about <strong>skills</strong>, <strong>experience</strong>, or <strong>projects</strong>!";
    }
    if (q === "status") {
      return "SYSTEM STATUS: All services operational | Live GitHub Telemetry: Active | Build: GitHub Actions CI/CD";
    }
    if (q === "theme") {
      document.body.classList.toggle("green-theme");
      return "🎨 Interface theme toggled successfully!";
    }
    if (q.startsWith("goto ")) {
      const target = q.replace("goto ", "").trim();
      const targetEl = document.getElementById(target);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
        drawer.classList.remove("active");
        return `Navigated to #${target}`;
      }
      return `Section #${target} not found. Try: about, experience, projects, telemetry, contact`;
    }
    if (q === "clear") {
      output.innerHTML = "";
      return null;
    }

    if (q.includes("who") || q.includes("about") || q.includes("intro")) {
      return "I'm Okennachukwu—a specialist in scalable systems engineering, performance marketing analytics, data workflows, and modern web solutions.";
    }
    if (q.includes("skill") || q.includes("stack") || q.includes("tech")) {
      return "Core Stack: JavaScript (ES6+), Python, GitHub Actions CI/CD, Data Analytics, Systems Testing, E-Commerce Infrastructure, and Multi-Agent AI workflows.";
    }
    if (q.includes("experience") || q.includes("work") || q.includes("olist")) {
      return "Experience highlights:<br>• <strong>E-Commerce Operations &amp; Strategy</strong> (2021–Present): Storefront architecture, listing automation, catalog management.<br>• <strong>Marketing &amp; Systems Lead @ Olist</strong> (2019–2021): Led growth initiatives, data accuracy workflows, and system testing.";
    }
    if (q.includes("project") || q.includes("agent") || q.includes("trading") || q.includes("yahands")) {
      return "Key Projects:<br>1. <strong>Algorithmic Trading Agent</strong> (DeepSeek + Alpaca API)<br>2. <strong>Multi-Agent Workflow Engine</strong><br>3. <strong>Yahands E-Commerce &amp; Web Infrastructure</strong><br>Tap any card in the Projects section for technical architecture deep-dives!";
    }
    if (q.includes("contact") || q.includes("email") || q.includes("reach") || q.includes("hire")) {
      return "You can connect directly via the <strong>Signal &amp; Contact</strong> section or email via the direct message button at the bottom of the page!";
    }

    return `I'm not sure about "${query}" yet. Try asking about <strong>skills</strong>, <strong>experience</strong>, <strong>projects</strong>, or type <strong>help</strong> for system commands!`;
  };

  const processQuery = (userQuery) => {
    const userLine = document.createElement("p");
    userLine.className = "user-msg";
    userLine.textContent = `> ${userQuery}`;
    output.appendChild(userLine);

    const responseText = getBotResponse(userQuery);

    if (responseText !== null) {
      const botLine = document.createElement("p");
      botLine.className = "bot-msg";
      botLine.innerHTML = responseText;
      output.appendChild(botLine);
    }

    output.scrollTop = output.scrollHeight;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim()) {
      processQuery(input.value.trim());
      input.value = "";
    }
  });

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const cmd = pill.getAttribute("data-cmd");
      if (cmd) processQuery(cmd);
    });
  });
}
