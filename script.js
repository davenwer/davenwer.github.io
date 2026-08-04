/* ==========================================================================
   Project-Kreer: Interactive Engine
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initLiveClock();
  initTagFilter();
  initScrollSpy();
});

/**
 * 1. Live System UTC Clock
 * Updates every second for a real-time system monitoring aesthetic.
 */
function initLiveClock() {
  const clockElement = document.getElementById("live-clock");
  if (!clockElement) return;

  function updateTime() {
    const now = new Date();
    const utcTime = now.toUTCString().split(" ")[4]; // Gets HH:MM:SS
    clockElement.textContent = `SYSTEM ONLINE | ${utcTime} UTC`;
  }

  updateTime();
  setInterval(updateTime, 1000);
}

/**
 * 2. Interactive Tag Filtering
 * Click any tech tag to filter cards. Click again to reset.
 */
function initTagFilter() {
  const tags = document.querySelectorAll(".tag");
  const cards = document.querySelectorAll(".card");
  let activeTag = null;

  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      const selectedText = tag.textContent.trim().toLowerCase();

      // Toggle active tag state
      if (activeTag === selectedText) {
        activeTag = null; // Reset filter
      } else {
        activeTag = selectedText;
      }

      // Filter visible cards
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

      // Style active tag
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

/**
 * 3. ScrollSpy Navigation
 * Highlights navigation items as you scroll past sections.
 */
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
