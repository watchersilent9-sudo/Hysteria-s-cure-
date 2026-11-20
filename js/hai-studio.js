
/* Hysteria's Cure — HAI Question Studio
 * Generates candidates and stores them as private Firebase drafts.
 * Reviewing/editing/approving drafts happens in Question Bank.
 */

import { auth, database } from "./firebase-client.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  ref,
  push,
  update
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";

const SUPABASE_FUNCTION_URL =
  "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/manage-learning-materials";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_wMSMx1WpGWn7Tk0zBUDAhg_Jlj8RWDO";

const HAI_API_URL =
  "https://hai-api-l7js.onrender.com";

const MAX_TEXT_LENGTH = 300000;

const $ = id => document.getElementById(id);


const el = {
  pageMessage: $("page-message"),
  content: $("studio-content"),
  logout: $("logout-button"),

  apiCheck: $("check-api-button"),
  apiStatus: $("api-status"),

  material: $("hai-material"),
  refresh: $("refresh-materials"),

  subject: $("hai-subject"),
  topic: $("hai-topic"),
  chapter: $("hai-chapter"),

  count: $("hai-count"),
  difficulty: $("hai-difficulty"),

  generate: $("generate-button"),
  generationStatus: $("generation-status"),

  statistics: $("generation-statistics"),

  review: $("review-section"),
  reviewMessage: $("review-message")
};


const missing = Object.entries(el).filter(([, node]) => !node);

if (missing.length) {
  throw new Error(
    `HAI Studio missing elements: ${missing.map(([name]) => name).join(", ")}`
  );
}


let currentAdmin = null;
let materials = [];
let generationInProgress = false;
let apiAvailable = false;


function setMessage(node, message, type = "normal") {
  node.textContent = message;

  node.style.borderColor =
    type === "error"
      ? "#ff7777"
      : type === "success"
        ? "#65c98b"
        : "var(--border)";
}


function busy(button, state, busyText, normalText) {
  button.disabled = state;
  button.textContent = state ? busyText : normalText;
}


function isAdmin() {
  return !!(
    currentAdmin &&
    auth.currentUser &&
    currentAdmin.uid === ADMIN_UID &&
    auth.currentUser.uid === ADMIN_UID
  );
}


function updateGenerateButton() {
  const count = Number(el.count.value);
  const difficulty = Number(el.difficulty.value);

  const ready =
    isAdmin() &&
    !!el.material.value &&
    !!el.subject.value.trim() &&
    !!el.topic.value.trim() &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= 100 &&
    Number.isInteger(difficulty) &&
    difficulty >= 1 &&
    difficulty <= 7;

  el.generate.disabled = !ready || generationInProgress;

  return ready;
}


async function getToken(forceRefresh = false) {
  if (!isAdmin()) {
    throw new Error(
      "Administrator authentication is unavailable. Sign in again."
    );
  }

  const token = await auth.currentUser.getIdToken(forceRefresh);

  if (!token || token.split(".").length !== 3) {
    throw new Error("Invalid Firebase authentication token.");
  }

  return token;
}


async function readResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Unreadable server response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      data?.error ||
      `Request failed (HTTP ${response.status}).`
    );
  }

  return data;
}


async function requestJSON(url, options, service) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(
      `${service} connection failed: ${error.message}`
    );
  }

  return readResponse(response);
}


async function supabaseRequest(method, body = null) {
  const token = await getToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_PUBLISHABLE_KEY
  };

  const options = {
    method,
    headers
  };

  if (body !== null) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  return requestJSON(
    SUPABASE_FUNCTION_URL,
    options,
    "Supabase textbook service"
  );
}


async function loadMaterials() {
  if (!isAdmin()) return;

  busy(el.refresh, true, "Loading...", "Refresh textbooks");

  el.material.disabled = true;

  el.material.replaceChildren(
    new Option("Loading textbooks...", "")
  );

  try {
    const data = await supabaseRequest("GET");

    if (!data.success || !Array.isArray(data.materials)) {
      throw new Error("Invalid textbook list returned.");
    }

    materials = data.materials.filter(
      m =>
        m &&
        m.status === "published" &&
        m.extraction?.extraction_status === "completed"
    );

    el.material.replaceChildren();

    el.material.add(
      new Option(
        materials.length
          ? "Choose a textbook..."
          : "No extracted textbooks available",
        ""
      )
    );

    materials.forEach(m => {
      el.material.add(
        new Option(
          `${m.title || m.original_filename || "Untitled"} — ${m.subject || "Unspecified"}`,
          m.id
        )
      );
    });

    setMessage(
      el.generationStatus,
      `${materials.length} extracted textbook(s) available.`,
      materials.length ? "success" : "normal"
    );

  } catch (error) {
    materials = [];

    el.material.replaceChildren(
      new Option("Could not load textbooks", "")
    );

    setMessage(
      el.generationStatus,
      error.message,
      "error"
    );

  } finally {
    el.material.disabled = false;

    busy(
      el.refresh,
      false,
      "Loading...",
      "Refresh textbooks"
    );

    updateGenerateButton();
  }
}


/* =========================================================
   HAI CONNECTION CHECK
   Accepts the actual HAI health response:
   { status: "healthy", ... }
   Also supports { status: "online", ... }
   ========================================================= */

async function checkHAI(showMessage = true) {
  el.apiCheck.disabled = true;
  el.apiCheck.textContent = "Checking...";

  if (showMessage) {
    setMessage(
      el.apiStatus,
      "Contacting HAI server..."
    );
  }

  try {
    const response = await fetch(
      `${HAI_API_URL}/health`,
      {
        cache: "no-store"
      }
    );

    const data = await readResponse(response);

    // FIX: The HAI health endpoint does not require success:true.
    // A valid healthy/online status is sufficient.
    apiAvailable =
      (
        data.status === "healthy" ||
        data.status === "online"
      ) &&
      data.success !== false;

    if (!apiAvailable) {
      throw new Error(
        "HAI server returned an unexpected health response."
      );
    }

    setMessage(
      el.apiStatus,
      `HAI reachable. API: ${data.api_version || "Unknown"}. Engines loaded: ${data.engines_loaded ? "Yes" : "No"}.`,
      "success"
    );

    return true;

  } catch (error) {
    apiAvailable = false;

    setMessage(
      el.apiStatus,
      `Connection failed: ${error.message}`,
      "error"
    );

    return false;

  } finally {
    el.apiCheck.disabled = false;
    el.apiCheck.textContent = "Check connection";
  }
}


async function retrieveTextbook(materialId) {
  const data = await supabaseRequest(
    "POST",
    { materialId }
  );

  if (!data.success || !data.extraction) {
    throw new Error(
      "Supabase did not return extracted textbook content."
    );
  }

  const text = data.extraction.extracted_text;

  if (
    typeof text !== "string" ||
    text.trim().length < 20
  ) {
    throw new Error(
      "Textbook extraction contains too little text."
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `Textbook exceeds ${MAX_TEXT_LENGTH.toLocaleString()} characters.`
    );
  }

  return {
    text,
    material: data.material
  };
}


function displayStatistics(stats) {
  el.statistics.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = "Generation statistics";

  el.statistics.append(heading);

  const entries = Object.entries(stats || {});

  if (!entries.length) {
    const p = document.createElement("p");

    p.textContent = "No statistics returned.";

    el.statistics.append(p);
  }

  entries.forEach(([key, value]) => {
    const p = document.createElement("p");

    p.textContent =
      `${key.replace(/_/g, " ")}: ${
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
      }`;

    el.statistics.append(p);
  });

  el.statistics.hidden = false;
}


async function persistDrafts(generated, metadata) {
  const patch = {};
  const now = Date.now();

  const batchId =
    push(ref(database, "haiQuestionDraftBatches")).key;

  generated.forEach(question => {
    const id =
      push(ref(database, "haiQuestionDrafts")).key;

    patch[`haiQuestionDrafts/${id}`] = {
      id,
      batchId,

      status: "draft",
      approved: false,

      createdAt: now,
      updatedAt: now,
      createdBy: currentAdmin.uid,

      subject: metadata.subject,
      topic: metadata.topic,

      question: question.question.trim(),

      options: question.options.map(
        v => String(v).trim()
      ),

      answerIndex: question.answerIndex,

      explanation: String(
        question.explanation || ""
      ),

      difficulty: Number(
        question.difficulty || metadata.difficulty
      ),

      sourceDetails: String(
        question.sourceDetails ||
        `Generated from ${metadata.document}`
      ),

      syllabusObjective: String(
        question.syllabusObjective || ""
      ),

      materialId: metadata.materialId,
      document: metadata.document,
      chapter: metadata.chapter,

      requestedDifficulty: metadata.difficulty
    };
  });

  patch[`haiQuestionDraftBatches/${batchId}`] = {
    id: batchId,

    createdAt: now,
    createdBy: currentAdmin.uid,

    materialId: metadata.materialId,
    document: metadata.document,

    subject: metadata.subject,
    topic: metadata.topic,
    chapter: metadata.chapter,

    requestedCount: metadata.count,
    requestedDifficulty: metadata.difficulty,

    savedCount: generated.length,

    status: "drafts_saved"
  };

  await update(
    ref(database),
    patch
  );

  return {
    batchId,
    count: generated.length
  };
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */


el.logout.addEventListener("click", async () => {
  el.logout.disabled = true;

  try {
    await signOut(auth);

    window.location.replace("login.html");

  } catch (e) {
    setMessage(
      el.pageMessage,
      `Logout failed: ${e.message}`,
      "error"
    );

    el.logout.disabled = false;
  }
});


el.apiCheck.addEventListener(
  "click",
  () => checkHAI(true)
);


el.refresh.addEventListener(
  "click",
  loadMaterials
);


[
  el.material,
  el.subject,
  el.topic,
  el.chapter,
  el.count,
  el.difficulty
].forEach(node => {
  node.addEventListener(
    "input",
    updateGenerateButton
  );

  node.addEventListener(
    "change",
    updateGenerateButton
  );
});


el.material.addEventListener("change", () => {
  const m = materials.find(
    x => x.id === el.material.value
  );

  if (!m) {
    updateGenerateButton();
    return;
  }

  el.subject.value =
    String(m.subject || "").slice(0, 100);

  el.topic.value =
    String(m.topic || m.title || "").slice(0, 200);

  el.chapter.value = "";

  setMessage(
    el.generationStatus,
    "Textbook selected. Confirm the subject and topic.",
    "success"
  );

  updateGenerateButton();
});


/* =========================================================
   QUESTION GENERATION
   ========================================================= */


el.generate.addEventListener("click", async () => {
  if (!updateGenerateButton()) {
    setMessage(
      el.generationStatus,
      "Complete all required settings first.",
      "error"
    );

    return;
  }

  generationInProgress = true;

  updateGenerateButton();

  el.refresh.disabled = true;

  el.statistics.hidden = true;
  el.review.hidden = true;

  const meta = {
    materialId: el.material.value,

    subject: el.subject.value.trim(),
    topic: el.topic.value.trim(),

    chapter:
      el.chapter.value.trim() || "Unspecified",

    count: Number(el.count.value),
    difficulty: Number(el.difficulty.value)
  };


  try {
    setMessage(
      el.generationStatus,
      "Checking HAI server..."
    );

    if (!await checkHAI(false)) {
      throw new Error(
        "HAI is not reachable. Check the server first."
      );
    }


    setMessage(
      el.generationStatus,
      "Retrieving extracted textbook content..."
    );

    const textbook =
      await retrieveTextbook(meta.materialId);

    meta.document = String(
      textbook.material?.title ||
      textbook.material?.original_filename ||
      "Untitled textbook"
    ).slice(0, 200);


    const token = await getToken(true);


    setMessage(
      el.generationStatus,
      "Generating candidates. This may take a while..."
    );


    const data = await requestJSON(
      `${HAI_API_URL}/textbooks/generate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },

        body: JSON.stringify({
          text: textbook.text,

          subject: meta.subject,
          topic: meta.topic,

          document: meta.document,
          chapter: meta.chapter,

          count: meta.count,
          difficulty: meta.difficulty
        })
      },
      "HAI generation API"
    );


    if (!Array.isArray(data.questions)) {
      throw new Error(
        "HAI returned an invalid questions list."
      );
    }


    const valid = data.questions
      .filter(q =>
        q &&
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Number.isInteger(q.answerIndex) &&
        q.answerIndex >= 0 &&
        q.answerIndex <= 3 &&
        q.options.every(o => String(o).trim())
      )
      .map(q => ({
        ...q,

        question: String(q.question),

        options: q.options.map(String),

        answerIndex: q.answerIndex,

        explanation: String(
          q.explanation || ""
        ),

        difficulty: Number(
          q.difficulty || meta.difficulty
        )
      }));


    if (!valid.length) {
      throw new Error(
        "HAI returned no valid four-option questions."
      );
    }


    displayStatistics(
      data.statistics || {}
    );


    setMessage(
      el.generationStatus,
      `Generated ${valid.length} valid candidates. Saving them to Firebase drafts...`
    );


    const saved =
      await persistDrafts(valid, meta);


    el.review.hidden = false;

    el.reviewMessage.textContent =
      `${saved.count} candidates saved as private drafts (Batch ${saved.batchId}). Open Question Bank → HAI Generated Questions to edit, approve, or reject them. They are not published.`;


    setMessage(
      el.generationStatus,
      `${saved.count} candidates saved successfully. Review them in Question Bank.`,
      "success"
    );


  } catch (error) {
    console.error(
      "Generation/save error:",
      error
    );

    setMessage(
      el.generationStatus,
      error.message || "Generation failed.",
      "error"
    );


  } finally {
    generationInProgress = false;

    el.refresh.disabled = false;

    updateGenerateButton();
  }
});


/* =========================================================
   AUTHENTICATION
   ========================================================= */


onAuthStateChanged(auth, async user => {
  currentAdmin = null;

  el.review.hidden = true;
  el.statistics.hidden = true;


  if (!user) {
    el.content.hidden = true;

    window.location.replace("login.html");

    return;
  }


  if (user.uid !== ADMIN_UID) {
    el.content.hidden = true;

    setMessage(
      el.pageMessage,
      "Access denied. Administrator privileges are required.",
      "error"
    );

    return;
  }


  currentAdmin = user;

  el.content.hidden = false;
  el.pageMessage.hidden = true;


  setMessage(
    el.generationStatus,
    "Administrator verified. Loading textbooks...",
    "success"
  );


  await loadMaterials();

  updateGenerateButton();
});
