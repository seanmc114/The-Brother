const CONFIG = { ROUNDS: 3 };

const PROMPTS = [
  "Describe your best friend",
  "Describe someone in your family",
  "Describe your house",
  "Describe your town",
  "Describe your favourite subject",
  "Describe your weekend"
];

// 🔎 DRILL MAP (deterministic – no AI risk)
const DRILL_MAP = {
  "Wrong tense": "Drill: Write 5 short sentences using the correct tense. Check each verb ending carefully.",
  "Missing verb": "Drill: Write 5 complete sentences. Every sentence must contain a clear verb.",
  "Accents/spelling": "Drill: Rewrite your last answer focusing only on spelling and accents.",
  "Word order": "Drill: Write 5 short sentences and double-check correct word order.",
  "Not enough detail": "Drill: Add one extra detail to each sentence you write."
};

let round = 0;
let scores = [];
let focuses = [];
let startTime = null;
let currentPrompt = "";

// ---------------- TEXT TO SPEECH ----------------

function speak(text, lang = "en-IE") {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// ---------------- INIT ----------------

document.addEventListener("DOMContentLoaded", () => {

  const runBtn = document.getElementById("runBtn");
  const ans = document.getElementById("answer");
  const out = document.getElementById("out");
  const taskEl = document.getElementById("task");
  const langEl = document.getElementById("lang");

  function newPrompt() {
    currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    taskEl.innerText = currentPrompt;
  }

  newPrompt();

  document.getElementById("readTask").onclick = () => {
    speak(currentPrompt);
  };

  document.getElementById("dictateBtn").onclick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    const lang = langEl.value;

    recognition.lang =
      lang === "es" ? "es-ES" :
      lang === "fr" ? "fr-FR" :
      lang === "de" ? "de-DE" :
      "ga-IE";

    recognition.interimResults = false;

    recognition.onresult = function(event) {
      ans.value += event.results[0][0].transcript;
    };

    recognition.start();
  };

  runBtn.onclick = async () => {

    if (!startTime) startTime = Date.now();

    const answer = ans.value.trim();
    if (!answer) return;

    const lang = langEl.value;

    runBtn.disabled = true;
    ans.disabled = true;

    out.classList.remove("hidden");
    out.innerHTML = "Thinking…";

    let result;

    try {
      result = await window.classifyAnswer({
        task: currentPrompt,
        answer,
        lang
      });
    } catch {
      result = { score: 3, focus: "Error", feedback: "Something went wrong — try again." };
    }

    scores.push(result.score);
    focuses.push(result.focus);
    round++;

    renderFeedback(result);
  };

  function renderFeedback(result) {

    const progress = (round / CONFIG.ROUNDS) * 100;

    out.innerHTML = `
      <div><strong>Round ${round}/${CONFIG.ROUNDS}</strong></div>

      <div style="height:10px;background:#ddd;border-radius:20px;margin:6px 0;">
        <div style="height:10px;background:#003366;width:${progress}%;border-radius:20px;"></div>
      </div>

      <div style="font-size:2rem;margin:10px 0;font-weight:bold;">
        ${result.score}/10
      </div>

      <div style="margin-bottom:12px;">
        ${result.feedback}
      </div>

      <button id="speakFeedback" class="smallBtn">🔊 Read</button>
      <button id="tryAgainBtn">Try Again</button>
      <button id="nextBtn">Next</button>
    `;

    document.getElementById("speakFeedback").onclick = () => {
      speak(result.feedback);
    };

    document.getElementById("tryAgainBtn").onclick = () => {
      ans.disabled = false;
      runBtn.disabled = false;
      ans.focus();
      out.classList.add("hidden");
    };

    document.getElementById("nextBtn").onclick = () => {
      if (round < CONFIG.ROUNDS) {
        ans.disabled = false;
        runBtn.disabled = false;
        ans.value = "";
        ans.focus();
        newPrompt();
        out.classList.add("hidden");
      } else {
        renderSummary();
      }
    };
  }

  function renderSummary() {

    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const time = Math.floor((Date.now() - startTime) / 1000);

    const focusCounts = {};
    focuses.forEach(f => {
      if (!f) return;
      focusCounts[f] = (focusCounts[f] || 0) + 1;
    });

    let mainWeakness = null;
    let maxCount = 0;

    for (let key in focusCounts) {
      if (focusCounts[key] > maxCount) {
        maxCount = focusCounts[key];
        mainWeakness = key;
      }
    }

    let drill = DRILL_MAP[mainWeakness] || "Drill: Rewrite your last answer and improve it.";

    let emoji = avg <= 4 ? "🟥" :
                avg <= 6 ? "🟨" :
                avg <= 8 ? "🟦" :
                "🟩";

    let title = avg <= 4 ? "Foundations Mode" :
                avg <= 6 ? "Building Momentum" :
                avg <= 8 ? "Strong Performance" :
                "Turbo Level";

    out.innerHTML = `
      <hr>
      <h2>${emoji} ${title}</h2>

      <div style="font-size:2rem;margin:10px 0;">
        ${avg}/10
      </div>

      <div>Time: ${time}s</div>
      <div>Scores: ${scores.join(" → ")}</div>

      <p style="margin-top:14px;">
        Your main area to fix: <strong>${mainWeakness || "General refinement"}</strong>.
      </p>

      <p style="margin-top:8px;">
        ${drill}
      </p>

      <button id="playAgain">Play Again</button>
    `;

    document.getElementById("playAgain").onclick = () => {
      round = 0;
      scores = [];
      focuses = [];
      startTime = null;
      ans.disabled = false;
      runBtn.disabled = false;
      ans.value = "";
      ans.focus();
      newPrompt();
      out.classList.add("hidden");
    };
  }

});
