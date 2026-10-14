import { auth } from "./firebase-client.js";
import {
createUserWithEmailAndPassword,
updateProfile,
sendEmailVerification
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const form = document.getElementById("signup-form");
const nameInput = document.getElementById("display-name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const message = document.getElementById("signup-message");
const signupButton = document.getElementById("signup-button");

form.addEventListener("submit", async (event) => {
event.preventDefault();

const displayName = nameInput.value.trim();
const email = emailInput.value.trim();
const password = passwordInput.value;
const confirmPassword = confirmPasswordInput.value;

if (!displayName) {
message.textContent = "Please enter your name.";
return;
}

if (password.length < 8) {
message.textContent = "Your password must be at least 8 characters.";
return;
}

if (password !== confirmPassword) {
message.textContent = "Your passwords do not match.";
return;
}

signupButton.disabled = true;
message.textContent = "Creating your account...";

try {
const result = await createUserWithEmailAndPassword(
auth,
email,
password
);

await updateProfile(result.user, {
  displayName: displayName
});

await sendEmailVerification(result.user);

message.textContent =
  "Account created! Check your email for a verification link.";

} catch (error) {
const messages = {
"auth/email-already-in-use": "This email already has an account. Please log in.",
"auth/invalid-email": "Please enter a valid email address.",
"auth/weak-password": "Please choose a stronger password.",
"auth/network-request-failed": "Network error. Check your connection and try again.",
"auth/operation-not-allowed": "Email/password sign-up is not enabled in Firebase."
};

message.textContent =
  messages[error.code] || "Registration failed. Please try again.";

} finally {
signupButton.disabled = false;
}
});
