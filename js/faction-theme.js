
import { auth, database } from "./firebase-client.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    get,
    ref
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const VALID_FACTIONS = [
    "readers",
    "gamers",
    "movie-lovers",
    "independent"
];

const DEFAULT_FACTION = "readers";

function applyFactionTheme(faction) {
    const selectedFaction = VALID_FACTIONS.includes(faction)
        ? faction
        : null;

    if (selectedFaction) {
        document.documentElement.dataset.faction = selectedFaction;
    } else {
        delete document.documentElement.dataset.faction;
    }

    return selectedFaction;
}

async function loadFaction(user) {
    if (!user) {
        applyFactionTheme(null);
        return;
    }

    try {
        const snapshot = await get(
            ref(database, `users/${user.uid}/faction`)
        );

        if (snapshot.exists()) {
            const faction = applyFactionTheme(snapshot.val());

            if (faction) return;
        }

        // No valid faction saved: keep the default site theme.
        applyFactionTheme(null);

    } catch (error) {
        console.error("Could not load faction theme:", error);
        applyFactionTheme(null);
    }
}

onAuthStateChanged(auth, (user) => {
    loadFaction(user);
});

export { applyFactionTheme };
