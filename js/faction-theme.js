
import { auth, database } from "./firebase-client.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    get,
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const VALID_FACTIONS = [
    "readers",
    "gamers",
    "movie-lovers",
    "independent"
];

const DEFAULT_FACTION = null;

let factionListener = null;
let currentUserId = null;

function applyFactionTheme(faction) {
    const validFaction = VALID_FACTIONS.includes(faction)
        ? faction
        : DEFAULT_FACTION;

    if (validFaction) {
        document.documentElement.dataset.faction = validFaction;
    } else {
        delete document.documentElement.dataset.faction;
    }

    return validFaction;
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
            // Ignore results if another account has signed in.
            if (currentUserId !== user.uid) return;

            if (snapshot.exists()) {
                const faction = applyFactionTheme(snapshot.val());

                if (faction) return;
            }

            applyFactionTheme(null);
        },
        (error) => {
            console.error("Could not load faction theme:", error);
            applyFactionTheme(null);
        }
    );
}

onAuthStateChanged(auth, (user) => {
    loadFaction(user);
});

export { applyFactionTheme };
