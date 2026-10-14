import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyClmzCODBB8DPcjdHIlP05gjVphAjnbpu0",
  authDomain: "hysteria-s-cure.firebaseapp.com",
  databaseURL: "https://hysteria-s-cure-default-rtdb.firebaseio.com",
  projectId: "hysteria-s-cure",
  storageBucket: "hysteria-s-cure.firebasestorage.app",
  messagingSenderId: "997596095696",
  appId: "1:997596095696:web:76507ec3402874c2e5aad5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
