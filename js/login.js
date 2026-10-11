"use strict";

document.addEventListener("DOMContentLoaded", () => {
const loginForm = document.getElementById("login-form");

if (!loginForm) return;

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const messageElement = document.getElementById("login-message");

function showMessage(message) {
    messageElement.textContent = message;
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient.auth
    ) {
        showMessage(
            "The login service could not load. Please refresh the page."
        );
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    showMessage("");

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        if (data.session) {
            showMessage(
                "Login successful! Your account is now signed in."
            );
        } else {
            showMessage(
                "Login could not be completed. Please try again."
            );
        }

    } catch (error) {
        console.error("Login error:", error);

        if (
            error.message &&
            error.message.toLowerCase().includes("email not confirmed")
        ) {
            showMessage(
                "Please confirm your email address before logging in."
            );
        } else {
            showMessage(
                "Login failed. Check your email and password, then try again."
            );
        }

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log In";
    }
});

});