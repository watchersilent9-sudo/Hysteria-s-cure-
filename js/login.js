import { auth } from "./firebase-client.js";
import {
signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");

form.addEventListener("submit", async (event) => {
event.preventDefault();

const email = emailInput.value.trim();
const password = passwordInput.value;

loginButton.disabled = true;
message.textContent = "Signing in...";

try {
await signInWithEmailAndPassword(auth, email, password);

message.textContent = "Login successful! Redirecting...";

window.location.href = "index.html";

} catch (error) {
const messages = {
"auth/invalid-credential":
"Incorrect email or password. Please try again.",
"auth/invalid-email":
"Please enter a valid email address.",
"auth/too-many-requests":
"Too many attempts. Please wait and try again.",
"auth/network-request-failed":
"Network error. Check your connection and try again.",
"auth/user-disabled":
"This account has been disabled."
};

message.textContent =
  messages[error.code] || "Login failed. Please try again.";

} finally {
loginButton.disabled = false;
}
});
