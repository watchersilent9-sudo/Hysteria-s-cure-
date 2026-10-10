"use strict";

// Hysteria's Cure — Main Application
// Handles general landing-page interactions.
// Question logic and progression systems belong in separate modules.

document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation();
  initializeSmoothScrolling();
  initializeGetStarted();
});

/**
 * Handles the mobile navigation menu when one exists.
 * The menu button and navigation elements must use the
 * corresponding data attributes.
 */
function initializeNavigation() {
  const menuButton = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-navigation]");

  if (!menuButton || !navigation) return;

  menuButton.addEventListener("click", () => {
    const isExpanded = menuButton.getAttribute("aria-expanded") === "true";

    menuButton.setAttribute("aria-expanded", String(!isExpanded));
    navigation.classList.toggle("is-open", !isExpanded);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    });
  });
}

/**
 * Enables smooth scrolling for links pointing to sections
 * on the current page.
 */
function initializeSmoothScrolling() {
  const sectionLinks = document.querySelectorAll('a[href^="#"]');

  sectionLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);

      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start"
      });
    });
  });
}

/**
 * Handles the landing page's Get Started button.
 * Until registration is implemented, it directs students
 * to the available learning introduction section.
 */
function initializeGetStarted() {
  const buttons = document.querySelectorAll("[data-get-started]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const introduction = document.querySelector("#about");

      if (introduction) {
        introduction.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      } else {
        showNotice("Student accounts are coming soon!");
      }
    });
  });
}

/**
 * Displays a simple notice without requiring a browser alert.
 */
function showNotice(message) {
  let notice = document.querySelector("[data-app-notice]");

  if (!notice) {
    notice = document.createElement("div");
    notice.setAttribute("data-app-notice", "");
    notice.setAttribute("role", "status");

    Object.assign(notice.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "90%",
      padding: "12px 18px",
      borderRadius: "10px",
      background: "#1b1b2a",
      color: "#ffffff",
      border: "1px solid #a78bfa",
      zIndex: "1000",
      textAlign: "center"
    });

    document.body.appendChild(notice);
  }

  notice.textContent = message;
  notice.hidden = false;

  window.clearTimeout(showNotice.timeout);

  showNotice.timeout = window.setTimeout(() => {
    notice.hidden = true;
  }, 3000);
}
