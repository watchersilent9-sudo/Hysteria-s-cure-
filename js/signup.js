"use strict";

document.addEventListener("DOMContentLoaded", () => {
const signupForm = document.getElementById("signup-form");

if (!signupForm) return;

const displayNameInput = document.getElementById("display-name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const signupButton = document.getElementById("signup-button");
const messageElement = document.getElementById("signup-message");

function showMessage(message) {
    messageElement.textContent = message;
}

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = displayNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (displayName.length < 2) {
        showMessage("Your display name must contain at least 2 characters.");
        displayNameInput.focus();
        return;
    }

    if (password.length < 8) {
        showMessage("Your password must contain at least 8 characters.");
        passwordInput.focus();
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Your passwords do not match.");
        confirmPasswordInput.focus();
        return;
    }

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient.auth
    ) {
        showMessage(
            "The registration service could not load. Please refresh the page."
        );
        return;
    }

    signupButton.disabled = true;
    signupButton.textContent = "Creating account...";
    showMessage("");

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName
                },
                emailRedirectTo: new URL(
                    "./",
                    window.location.href
                ).href
            }
        });

        if (error) throw error;

        if (
            data.user &&
            data.user.identities &&
            data.user.identities.length === 0
        ) {
            showMessage(
                "An account may already exist with this email. Try logging in."
            );
            return;
        }

        signupForm.reset();

        if (data.session) {
            showMessage(
                "Your account has been created successfully! Registration is complete."
            );
        } else {
            showMessage(
                "Registration received! Check your email for a confirmation link before logging in."
            );
        }

    } catch (error) {
        console.error("Signup error:", error);

        showMessage(
            error.message ||
            "We couldn't create your account. Please try again."
        );

    } finally {
        signupButton.disabled = false;
        signupButton.textContent = "Create Account";
    }
});

});