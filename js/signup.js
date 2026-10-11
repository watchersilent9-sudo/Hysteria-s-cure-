"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signup-form");
    const displayNameInput = document.getElementById("display-name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");
    const signupButton = document.getElementById("signup-button");
    const messageElement = document.getElementById("signup-message");

    if (!signupForm) {
        return;
    }

    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const displayName = displayNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (displayName.length < 2) {
            showMessage("Your display name must contain at least 2 characters.");
            return;
        }

        if (password.length < 8) {
            showMessage("Your password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Your passwords do not match.");
            confirmPasswordInput.focus();
            return;
        }

        if (typeof supabaseClient === "undefined") {
            showMessage("The registration service could not load. Please refresh the page.");
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
                    emailRedirectTo: window.location.origin +
                        window.location.pathname.replace(/signup\.html$/, "")
                }
            });

            if (error) {
                throw error;
            }

            if (data.user && data.user.identities &&
                data.user.identities.length === 0) {
                showMessage(
                    "An account may already exist with this email. Try logging in instead."
                );
                return;
            }

            if (data.session) {
                showMessage(
                    "Your account has been created successfully! You can now continue to the learning platform."
                );
            } else {
                showMessage(
                    "Registration received! Check your email for the confirmation link before logging in."
                );
            }

            signupForm.reset();

        } catch (error) {
            console.error("Signup error:", error);

            if (error.message && error.message.toLowerCase().includes("already registered")) {
                showMessage("This email may already be registered. Try logging in.");
            } else if (error.message && error.message.toLowerCase().includes("password")) {
                showMessage("Please choose a valid password that meets the requirements.");
            } else {
                showMessage(
                    error.message || "We couldn't create your account. Please try again."
                );
            }

        } finally {
            signupButton.disabled = false;
            signupButton.textContent = "Create Account";
        }
    });

    function showMessage(message) {
        messageElement.textContent = message;
    }
});
