const CONFIG = { ROUNDS: 3 };

const PROMPTS = [
  "Describe your best friend",
  "Describe someone in your family",
  "Describe your house",
  "Describe your town",
  "Describe your favourite subject",
  "Describe your weekend"
];

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

  // 🔊 Read task
  document.getElementById("readTask").onclick = () => {
    speak(currentPrompt);
  };

  // 🎙 Dictation
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

    // 🔒 LOCK INPUT AFTER SUBMIT
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

      <div class="teacherBar" style="margin-top:12px;">
        <button data-v="clear">👍 Clear</button>
        <button data-v="unclear">🔁 Could be clearer</button>
        <button data-v="bad">❌ Not helpful</button>
      </div>
    `;

    document.getElementById("speakFeedback").onclick = () => {
      speak(result.feedback);
    };

    // ✅ TRY AGAIN
    document.getElementById("tryAgainBtn").onclick = () => {
      ans.disabled = false;
      runBtn.disabled = false;
      ans.focus();
      out.classList.add("hidden");
    };

    document.querySelectorAll(".teacherBar button").forEach(btn => {
      btn.onclick = () => {
        console.log("TEACHER_FEEDBACK", {
          score: result.score,
          feedback: result.feedback,
          rating: btn.dataset.v
        });
        btn.disabled = true;
        btn.innerText = "✓";
      };
    });

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

    // 🔎 Identify most common weakness
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

    let emoji = avg <= 4 ? "🟥" :
                avg <= 6 ? "🟨" :
                avg <= 8 ? "🟦" :
                "🟩";

    let title = avg <= 4 ? "Foundations Mode" :
                avg <= 6 ? "Building Momentum" :
                avg <= 8 ? "Strong Performance" :
                "Turbo Level";

    let message;

    if (mainWeakness) {
      message = `Your main area to fix: ${mainWeakness}. Focus there next round and you’ll see a quick jump.`;
    } else {
      message = "Solid performance. Keep refining accuracy and detail.";
    }

    out.innerHTML = `
      <hr>
      <h2>${emoji} ${title}</h2>

      <div style="font-size:2rem;margin:10px 0;">
        ${avg}/10
      </div>

      <div>Time: ${time}s</div>
      <div>Scores: ${scores.join(" → ")}</div>

      <p style="margin-top:14px;">
        ${message}
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
