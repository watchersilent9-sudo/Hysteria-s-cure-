
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
    if (VALID_FACTIONS.includes(faction)) {
        document.documentElement.dataset.faction = faction;
        return faction;
    }

    delete document.documentElement.dataset.faction;
    return null;
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
                console.warn(
                    "No saved faction was found for this account."
                );
                applyFactionTheme(null);
                return;
            }

            const faction = applyFactionTheme(snapshot.val());

            if (!faction) {
                console.warn(
                    "The saved faction value is invalid."
                );
            }
        },
        (error) => {
            if (currentUserId !== user.uid) return;

            console.error(
                "Could not load the faction theme:",
                error
            );

            applyFactionTheme(null);
        }
    );
}

onAuthStateChanged(auth, (user) => {
    loadFaction(user);
});

export { applyFactionTheme };
