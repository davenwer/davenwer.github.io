/* ==========================================================================
   Project-Kreer Master Script Engine (W3C EDV & Smart Intent Engine v2.2)
   ========================================================================== */

/* --------------------------------------------------------------------------
   0. Core Data Vault Class (W3C EDV Standard Implementation)
   -------------------------------------------------------------------------- */
class CoreDataVault {
  constructor() {
    this.dbName = "kreer_core_vault_db";
    this.storeName = "encrypted_records";
    this.db = null;
    this.vaultKey = null;
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = (e) => reject("DB Initialization Error: " + e.target.error);
    });
  }

  async deriveVaultKey(secretPassphrase, saltString = "kreer_vault_salt") {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(secretPassphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    this.vaultKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(saltString),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    return this.vaultKey;
  }

  async storeEncryptedRecord(payloadText) {
    if (!this.vaultKey) throw new Error("Vault unlocked key missing!");

    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.vaultKey,
      enc.encode(payloadText)
    );

    const edvDocument = {
      id: "edv_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertextBuffer))
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(edvDocument);

      request.onsuccess = () => resolve(edvDocument);
      request.onerror = (e) => reject("Failed to save record: " + e.target.error);
    });
  }

  async decryptRecord(edvDocument) {
    if (!this.vaultKey) throw new Error("Vault unlocked key missing!");

    const iv = new Uint8Array(edvDocument.iv);
    const ciphertext = new Uint8Array(edvDocument.ciphertext);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      this.vaultKey,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  async getAllRecords() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject("Failed to fetch records: " + e.target.error);
    });
  }

  async deleteRecord(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject("Delete operation failed: " + e.target.error);
    });
  }
}

window.coreVault = new CoreDataVault();

/* --------------------------------------------------------------------------
   1. Global UI & Vault Event Handlers
   -------------------------------------------------------------------------- */
async function unlockCoreVault() {
  const pass = document.getElementById("vaultPassphrase").value.trim();
  if (!pass) return alert("Please enter a passphrase.");

  await window.coreVault.deriveVaultKey(pass);
  
  const badge = document.getElementById("vault-status-badge");
  if (badge) {
    badge.textContent = "🔓 UNLOCKED";
    badge.style.background = "rgba(46,160,79,0.15)";
    badge.style.color = "#3fb950";
    badge.style.borderColor = "rgba(63,185,80,0.3)";
  }

  renderVaultUI();
}

async function saveToCoreVault() {
  const input = document.getElementById("vaultInput");
  const text = input.value.trim();
  if (!text) return;

  try {
    await window.coreVault.storeEncryptedRecord(text);
    input.value = "";
    renderVaultUI();
  } catch (err) {
    alert("Save Error: Unlock vault master passphrase first!");
  }
}

async function renderVaultUI() {
  const display = document.getElementById("vaultDisplay");
  if (!display) return;

  const records = await window.coreVault.getAllRecords();

  if (records.length === 0) {
    display.innerHTML = '<div style="color: #8b949e; font-size: 0.85rem;">No encrypted records stored.</div>';
    return;
  }

  let html = "";
  for (const doc of records) {
    let decryptedText = "🔒 [Encrypted Ciphertext Blob]";
    
    if (window.coreVault.vaultKey) {
      try {
        decryptedText = await window.coreVault.decryptRecord(doc);
      } catch (err) {
        decryptedText = "⚠️ [Decryption Failed - Invalid Key]";
      }
    }

    html += `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid #30363d; border-radius: 6px; margin-bottom: 6px;">
        <div style="flex: 1; padding-right: 8px;">
          <div style="font-size: 0.85rem; color: #c9d1d9; word-break: break-all;">${decryptedText}</div>
          <div style="color: #8b949e; font-size: 0.7rem; margin-top: 6px;">${new Date(doc.timestamp).toLocaleString()} | ID: ${doc.id}</div>
        </div>
        <button onclick="deleteVaultRecord('${doc.id}')" style="background: none; border: none; color: #f85149; font-size: 0.9rem; cursor: pointer;" title="Delete Record">🗑️</button>
      </div>
    `;
  }

  display.innerHTML = html;
}

async function deleteVaultRecord(id) {
  await window.coreVault.deleteRecord(id);
  renderVaultUI();
}

async function copyAllVaultEntries() {
  const records = await window.coreVault.getAllRecords();
  if (records.length === 0) {
    alert("Vault is currently empty.");
    return;
  }

  let formattedText = "";
  for (const doc of records) {
    let content = "🔒 [Encrypted Ciphertext Blob]";
    if (window.coreVault.vaultKey) {
      try {
        content = await window.coreVault.decryptRecord(doc);
      } catch (err) {
        content = "[Decryption Error]";
      }
    }
    formattedText += `[${doc.timestamp}]\n${content}\n\n---\n\n`;
  }

  navigator.clipboard.writeText(formattedText).then(() => {
    alert("Vault entries copied to clipboard!");
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
}
/* --------------------------------------------------------------------------
   2. DOM Initialization Engine
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  initLiveClock();
  initTagFilter();
  initScrollSpy();
  initProjectModals();
  initGitHubTelemetry();
  initCommandTerminal();

  if (window.coreVault) {
    await window.coreVault.initDB();
    renderVaultUI();
  }
});

/* --------------------------------------------------------------------------
   3. Live System Clock
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   4. Interactive Tag Filtering
   -------------------------------------------------------------------------- */
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
          t.style.backgroundColor = "var(--accent-color, #58a6ff)";
          t.style.color = "var(--bg-primary, #0d1117)";
        } else {
          t.style.backgroundColor = "var(--bg-hover, #21262d)";
          t.style.color = "var(--accent-color, #58a6ff)";
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   5. ScrollSpy Navigation
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   6. Interactive Project Modals
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   7. Live GitHub Telemetry Fetcher
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   8. Command Terminal & Voice Engine
   -------------------------------------------------------------------------- */
function initCommandTerminal() {
  const triggerBtn = document.getElementById("cli-trigger");
  const drawer = document.getElementById("cli-drawer");
  const closeBtn = document.getElementById("cli-close");
  const form = document.getElementById("cli-form");
  const input = document.getElementById("cli-input");
  const output = document.getElementById("cli-output");
  const pills = document.querySelectorAll(".cli-pill");

  if (!triggerBtn || !drawer || !closeBtn || !form || !input || !output) return;

  const openDrawer = (e) => {
    if (e) e.preventDefault();
    drawer.setAttribute("aria-hidden", "false");
    drawer.classList.add("active");
  };

  const closeDrawer = (e) => {
    if (e) e.preventDefault();
    drawer.setAttribute("aria-hidden", "true");
    drawer.classList.remove("active");
  };

  triggerBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    let micBtn = document.getElementById("cli-mic-btn");
    if (!micBtn) {
      micBtn = document.createElement("button");
      micBtn.id = "cli-mic-btn";
      micBtn.type = "button";
      micBtn.innerHTML = "🎙️";
      micBtn.setAttribute("aria-label", "Activate Voice Input");
      micBtn.style.cssText = "background:none; border:none; font-size:1.1rem; cursor:pointer; margin-left:6px; padding:2px;";
      form.appendChild(micBtn);
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isListening = false;

    micBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isListening) {
        try {
          recognition.start();
          micBtn.innerHTML = "🔴";
          isListening = true;
        } catch (err) {
          console.warn("Speech recognition error:", err);
        }
      } else {
        recognition.stop();
        micBtn.innerHTML = "🎙️";
        isListening = false;
      }
    });

    recognition.onresult = (event) => {
      input.value = event.results[0][0].transcript;
      micBtn.innerHTML = "🎙️";
      isListening = false;
    };

    recognition.onerror = () => {
      micBtn.innerHTML = "🎙️";
      isListening = false;
    };

    recognition.onend = () => {
      micBtn.innerHTML = "🎙️";
      isListening = false;
    };
  }

  const getBotResponse = (query) => {
    const q = query.toLowerCase();

    if (q === "help") {
      return "Commands: <strong>status</strong>, <strong>theme</strong>, <strong>goto [section]</strong>, <strong>clear</strong>. Or ask about my <strong>skills</strong>, <strong>code</strong>, <strong>marketing</strong>, or <strong>projects</strong>!";
    }
    if (q === "status") {
      return "SYSTEM STATUS: All systems operational | Telemetry: Live via GitHub API";
    }

    if (q.includes("theme")) {
      let styleTag = document.getElementById("theme-override");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "theme-override";
        document.head.appendChild(styleTag);
      }

      const isEmerald = document.body.classList.toggle("emerald-mode");

      if (isEmerald) {
        styleTag.textContent = `
          :root, body {
            --accent-color: #3fb950 !important;
            --bg-hover: rgba(63, 185, 80, 0.15) !important;
            --text-primary: #3fb950 !important;
          }
          a, .repo-title, .tag, h1, h2, h3, h4, .user-msg, #cli-trigger, #cli-mic-btn {
            color: #3fb950 !important;
          }
          .tag, button, input, .card, #cli-drawer {
            border-color: rgba(63, 185, 80, 0.4) !important;
          }
        `;
        return "🎨 Theme switched: **Terminal Emerald**";
      } else {
        styleTag.textContent = "";
        return "🎨 Theme restored: **Slate Dark Default**";
      }
    }

    if (q.startsWith("goto ")) {
      const target = q.replace("goto ", "").trim();
      const targetEl = document.getElementById(target);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
        closeDrawer();
        return `Navigated to #${target}`;
      }
      return `Section #${target} not found. Try: about, experience, projects, telemetry, contact, vault-section`;
    }

    if (q === "clear") {
      output.innerHTML = "";
      return null;
    }

    if (q.includes("code") || q.includes("build") || q.includes("develop")) {
      return "I write modern code for web platforms, automated deployment pipelines, and responsive systems using JavaScript, Python, and robust web standards.";
    }

    if (q.includes("who") || q.includes("about") || q.includes("intro")) {
      return "I'm Okennachukwu—a technology specialist focused on scalable web architecture, systems engineering, data testing, and performance growth analytics.";
    }

    if (q.includes("olist") || q.includes("marketing") || q.includes("e-commerce")) {
      return "E-Commerce & Marketing background:<br>• <strong>Marketing Team Lead @ Olist</strong> (2019–2021): Directed growth strategy, analytics, and business systems testing.<br>• <strong>Yahands Infrastructure</strong>: Amazon Seller Central integrations, automated product listings, and web systems.";
    }

    if (q.includes("skill") || q.includes("stack") || q.includes("python") || q.includes("js")) {
      return "Core Stack:<br>• <strong>Languages & Web</strong>: JavaScript (ES6+), Python, HTML5, CSS3<br>• <strong>AI & Automation</strong>: DeepSeek Models, Alpaca API, Multi-Agent Workflows<br>• <strong>Operations</strong>: Systems Testing & Data Accuracy Verification";
    }

    if (q.includes("project") || q.includes("agent") || q.includes("trading") || q.includes("ai")) {
      return "Key Technical Projects:<br>1. <strong>Algorithmic Trading Agent</strong> (DeepSeek + Alpaca REST/WebSocket API)<br>2. <strong>Multi-Agent Workflow Engine</strong><br>3. <strong>Yahands E-Commerce & Web Infrastructure</strong><br>Tap any project card on the page to view detailed system specs!";
    }

    return `I'm programmed to assist with inquiries about my <strong>coding experience</strong>, <strong>AI projects</strong>, <strong>marketing leadership at Olist</strong>, or <strong>skills</strong>. Type <strong>help</strong> for system commands!`;
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
