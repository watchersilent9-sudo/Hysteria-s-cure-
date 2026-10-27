import { auth, database } from "./firebase-client.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
ref,
onValue
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const VALID_FACTIONS = [
"readers",
"gamers",
"movie-lovers",
"independent"
];

let factionListener = null;
let currentUserId = null;

function applyFactionTheme(faction) {
if (!VALID_FACTIONS.includes(faction)) {
delete document.documentElement.dataset.faction;
return null;
}

document.documentElement.dataset.faction = faction;
console.info("Faction theme applied:", faction);
return faction;

}

function stopFactionListener() {
if (typeof factionListener === "function") {
factionListener();
}

factionListener = null;
currentUserId = null;

}

function loadFaction(user) {
stopFactionListener();

if (!user) {
    applyFactionTheme(null);
    return;
}

currentUserId = user.uid;

const factionRef = ref(
    database,
    `users/${user.uid}/faction`
);

factionListener = onValue(
    factionRef,
    (snapshot) => {
        if (currentUserId !== user.uid) return;

        if (!snapshot.exists()) {
            console.error(
                "No faction saved for this user. Check signup.js and Firebase Database."
            );
            applyFactionTheme(null);
            return;
        }

        const faction = applyFactionTheme(snapshot.val());

        if (!faction) {
            console.error(
                "Invalid faction stored in Firebase:",
                snapshot.val()
            );
        }
    },
    (error) => {
        if (currentUserId !== user.uid) return;

        console.error(
            "Could not load faction. Check Firebase Database rules:",
            error
        );

        applyFactionTheme(null);
    }
);

}

onAuthStateChanged(auth, loadFaction);

export { applyFactionTheme };
