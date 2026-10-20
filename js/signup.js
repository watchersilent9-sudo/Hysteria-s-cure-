
import { auth, database } from "./firebase-client.js";

import {
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    ref,
    update
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const form = document.getElementById("signup-form");
const nameInput = document.getElementById("display-name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const message = document.getElementById("signup-message");
const signupButton = document.getElementById("signup-button");

const VALID_FACTIONS = [
    "readers",
    "gamers",
    "movie-lovers",
    "independent"
];

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    const selectedFaction = form.querySelector(
        'input[name="faction"]:checked'
    );

    if (!displayName || displayName.length < 2) {
        message.textContent =
            "Please enter a name with at least 2 characters.";
        return;
    }

    if (password.length < 8) {
        message.textContent =
            "Your password must be at least 8 characters.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent = "Your passwords do not match.";
        return;
    }

    if (!selectedFaction) {
        message.textContent =
            "Please choose a faction or the Independent path.";
        return;
    }

    const faction = selectedFaction.value;

    if (!VALID_FACTIONS.includes(faction)) {
        message.textContent = "That faction selection is not valid.";
        return;
    }

    signupButton.disabled = true;
    message.textContent = "Creating your account...";

    let accountCreated = false;

    try {
        const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        accountCreated = true;

        await updateProfile(result.user, {
            displayName: displayName
        });

        await update(
            ref(database, `users/${result.user.uid}`),
            {
                displayName: displayName,
                faction: faction,
                createdAt: new Date().toISOString()
            }
        );

        await sendEmailVerification(result.user);

        message.textContent =
            "Account created! Your faction is saved. Check your email for the verification link.";

        form.reset();

    } catch (error) {
        console.error("Registration error:", error);

        if (accountCreated) {
            message.textContent =
                "Your account was created, but a later setup step failed. Do not register again with the same email. Please share this error code with support: " +
                (error.code || "unknown-error");
        } else {
            const messages = {
                "auth/email-already-in-use":
                    "This email already has an account. Please log in.",

                "auth/invalid-email":
                    "Please enter a valid email address.",

                "auth/weak-password":
                    "Please choose a stronger password.",

                "auth/network-request-failed":
                    "Network error. Check your connection and try again.",

                "auth/operation-not-allowed":
                    "Email/password sign-up is not enabled in Firebase."
            };

            message.textContent =
                messages[error.code] ||
                "Registration failed. Please try again.";
        }
    } finally {
        signupButton.disabled = false;
    }
});
