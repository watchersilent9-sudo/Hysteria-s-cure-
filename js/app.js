"use strict";

document.addEventListener("DOMContentLoaded", () => {
    initializeSmoothScrolling();
    initializeAccountButtons();
    updateCopyrightYear();
});

// Smooth scrolling for links pointing to sections on this page.
function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
        link.addEventListener("click", (event) => {
            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") return;

            // Account pages do not exist yet.
            if (targetId === "#login") return;

            const target = document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            target.scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: "start"
            });
        });
    });
}

// Show a notice when students try to access unfinished account features.
function initializeAccountButtons() {
    const loginLinks = document.querySelectorAll('a[href="#login"]');

    loginLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            showNotice("Student accounts are coming soon!");
        });
    });
}

// Keep the footer's copyright year current.
function updateCopyrightYear() {
    const yearElement = document.getElementById("current-year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Display a temporary notification.
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
            textAlign: "center",
            fontSize: "14px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)"
        });

        document.body.appendChild(notice);
    }

    notice.textContent = message;
    notice.hidden = false;

    clearTimeout(showNotice.timeout);

    showNotice.timeout = setTimeout(() => {
        notice.hidden = true;
    }, 3000);
              }
