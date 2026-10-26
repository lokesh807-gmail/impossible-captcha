(function () {
  "use strict";

  const { LEVELS, SAVE_KEY, SAVE_VERSION, TOTAL_LEVELS, createInitialState, validateAnswer, validateCatalog, migrateSave, openLevel, completeLevel, useHint, skipLevel, recordAttempt, getLevelStatus } = window.GameCore;
  const stateCheck = validateCatalog(LEVELS);
  if (!stateCheck.valid) throw new Error(`Invalid game catalog: ${stateCheck.problems.join(" ")}`);

  const loadedSave = loadProgress();
  const state = loadedSave.state;
  let saveNotice = loadedSave.notice;
  let saveBlocked = loadedSave.blocked;
  let currentLevel = null;
  let submission = null;
  let lockedAfterAnswer = false;
  let memoryTimer = null;
  let audioContext = null;
  let toastTimer = null;

  const $ = selector => document.querySelector(selector);
  const screens = ["landing-screen", "map-screen", "game-screen", "info-screen", "settings-screen", "victory-screen"];
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);

  function loadProgress() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return { state: createInitialState(), notice: "", blocked: false, migrated: false };
      const parsed = JSON.parse(saved);
      const result = migrateSave(parsed);
      if (!result.valid) {
        return {
          state: createInitialState(),
          notice: "Saved data needs attention. It was kept unchanged; use Restart all progress to start a new save.",
          blocked: true,
          migrated: false
        };
      }
      return {
        state: result.state,
        notice: result.migrated ? "Your saved 50-level progress was safely upgraded for the 100-level game." : "",
        blocked: false,
        migrated: result.migrated
      };
    } catch (error) {
      console.warn("Saved game data could not be read; a fresh game was loaded.", error);
      return {
        state: createInitialState(),
        notice: "Saved data could not be read and was kept unchanged. Use Restart all progress to start a new save.",
        blocked: true,
        migrated: false
      };
    }
  }

  function saveProgress() {
    if (saveBlocked) return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, data: state }));
      $("#save-indicator").textContent = saveNotice || "Progress saved on this device";
      saveNotice = "";
      return true;
    } catch (error) {
      $("#save-indicator").textContent = "Progress could not be saved";
      console.error("Unable to save game progress.", error);
      showToast("Progress could not be saved in this browser.");
      return false;
    }
  }

  function replaceState(updated) {
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, updated);
    saveProgress();
    updateGlobalDisplays();
  }

  function showScreen(screenId) {
    screens.forEach(id => $(`#${id}`).classList.toggle("hidden", id !== screenId));
    $("#app").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function updateGlobalDisplays() {
    $("#landing-completed").textContent = state.completedLevels.length;
    $("#landing-best").textContent = state.bestScore;
    $("#map-score").textContent = state.score;
    $("#game-score").textContent = state.score;
    const sound = $("#sound-toggle");
    sound.textContent = state.soundEnabled ? "Sound on" : "Sound off";
    sound.setAttribute("aria-pressed", String(state.soundEnabled));
    sound.setAttribute("aria-label", state.soundEnabled ? "Turn sound off" : "Turn sound on");
    $("#continue-button").classList.toggle("hidden", state.completedLevels.length === 0 && state.highestUnlocked === 1);
    $("#landing-count-label").textContent = ` / ${TOTAL_LEVELS} levels solved`;
    const settingButton = $("#settings-screen [data-action='sound']");
    if (settingButton) settingButton.textContent = state.soundEnabled ? "Turn sound off" : "Turn sound on";
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.add("hidden"), 3200);
  }

  function playTone(kind) {
    if (!state.soundEnabled) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      audioContext = audioContext || new AudioCtor();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = kind === "correct" ? 660 : kind === "incorrect" ? 170 : kind === "level" ? 780 : kind === "final" ? 920 : 440;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.13);
    } catch (error) {
      console.warn("Optional sound could not be played.", error);
    }
  }

  function setSound(enabled) {
    replaceState(Object.assign({}, state, { soundEnabled: enabled }));
    if (enabled) playTone("click");
  }

  function renderLanding() {
    updateGlobalDisplays();
    showScreen("landing-screen");
  }

  function renderMap() {
    const container = $("#level-map");
    container.replaceChildren();
    LEVELS.forEach(level => {
      const status = getLevelStatus(state, level.id);
      const isCurrent = currentLevel && currentLevel.id === level.id && status !== "locked";
      const button = document.createElement("button");
      button.type = "button";
      button.className = `level-tile status-${status}${isCurrent ? " currently-active" : ""}`;
      button.disabled = status === "locked";
      button.dataset.level = level.id;
      button.setAttribute("aria-label", `Level ${level.id}, ${level.difficulty}, ${isCurrent ? "current, " : ""}${status}${state.levelScores[level.id] ? `, ${state.levelScores[level.id]} points` : ""}`);
      const statusLabel = status === "completed" ? "Solved" : status === "skipped" ? "Skipped" : status === "locked" ? "Locked" : isCurrent ? "Current" : "Enter";
      button.innerHTML = `<span class="tile-number">${String(level.id).padStart(2, "0")}</span><span class="tile-difficulty">${level.difficulty}</span><span class="tile-status">${statusLabel}</span>`;
      button.addEventListener("click", () => startLevel(level.id));
      container.append(button);
    });
    updateGlobalDisplays();
    showScreen("map-screen");
  }

  function createObjectButtons(level, onClick, selectedIndexes) {
    const grid = document.createElement("div");
    grid.className = `object-grid object-grid-${Math.min(level.objects.length, 5)}`;
    level.objects.forEach((object, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `object-button${selectedIndexes.includes(index) ? " selected" : ""}`;
      button.setAttribute("aria-label", object.label);
      button.setAttribute("aria-pressed", String(selectedIndexes.includes(index)));
      button.innerHTML = `<span class="object-icon" aria-hidden="true">${object.icon}</span><span>${escapeHtml(object.label)}</span>`;
      button.addEventListener("click", () => onClick(index));
      grid.append(button);
    });
    return grid;
  }

  function renderPuzzle(level) {
    const area = $("#puzzle-area");
    area.replaceChildren();
    submission = level.type === "grid" ? [] : (["order", "memory"].includes(level.type) ? [] : null);
    if (level.type === "multiple-choice") {
      const options = document.createElement("div");
      options.className = "answer-options";
      level.options.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";
        button.setAttribute("aria-pressed", "false");
        button.textContent = option;
        button.addEventListener("click", () => {
          submission = option;
          options.querySelectorAll(".answer-option").forEach(item => {
            item.classList.toggle("selected", item === button);
            item.setAttribute("aria-pressed", String(item === button));
          });
        });
        options.append(button);
      });
      area.append(options);
    } else if (level.type === "text") {
      const label = document.createElement("label");
      label.className = "visually-hidden";
      label.htmlFor = "text-answer";
      label.textContent = "Your answer";
      const input = document.createElement("input");
      input.id = "text-answer";
      input.className = "answer-input";
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = "Type your answer…";
      input.addEventListener("input", () => { submission = input.value; });
      input.addEventListener("keydown", event => { if (event.key === "Enter") submitCurrentAnswer(); });
      area.append(label, input);
      window.setTimeout(() => input.focus({ preventScroll: true }), 0);
    } else if (level.type === "grid") {
      area.append(createObjectButtons(level, index => {
        const selected = new Set(submission);
        if (selected.has(index)) selected.delete(index);
        else selected.add(index);
        submission = [...selected].sort((a, b) => a - b);
        area.querySelectorAll(".object-button").forEach((button, buttonIndex) => {
          const active = selected.has(buttonIndex);
          button.classList.toggle("selected", active);
          button.setAttribute("aria-pressed", String(active));
        });
      }, []));
    } else if (level.type === "order") {
      area.append(createObjectButtons(level, index => {
        if (lockedAfterAnswer || submission.length >= level.answer.length) return;
        submission.push(index);
        const button = area.querySelectorAll(".object-button")[index];
        button.classList.add("sequence-picked");
        button.dataset.sequence = submission.length;
        button.setAttribute("aria-pressed", "true");
        button.setAttribute("aria-label", `${level.objects[index].label}, choice ${submission.length}`);
        $("#attempt-count").textContent = `Attempts this level: ${state.attemptsByLevel[level.id] || 0} · Sequence: ${submission.map(value => level.objects[value].label).join(" → ")}`;
      }, []));
    } else if (level.type === "memory") {
      const cue = document.createElement("div");
      cue.className = "memory-cue";
      cue.setAttribute("aria-live", "polite");
      cue.textContent = level.answer.map(index => level.objects[index].icon).join("  ");
      area.append(cue);
      memoryTimer = window.setTimeout(() => {
        if (currentLevel !== level || lockedAfterAnswer) return;
        cue.textContent = "The symbols have vanished. Repeat the sequence.";
        area.append(createObjectButtons(level, index => {
          if (lockedAfterAnswer || submission.length >= level.answer.length) return;
          submission.push(index);
          const button = area.querySelectorAll(".object-button")[index];
          button.classList.add("sequence-picked");
          button.dataset.sequence = submission.length;
          button.setAttribute("aria-pressed", "true");
          $("#attempt-count").textContent = `Attempts this level: ${state.attemptsByLevel[level.id] || 0} · Sequence: ${submission.map(value => level.objects[value].label).join(" → ")}`;
        }, []));
      }, 3600);
    } else if (level.type === "runaway") {
      const stage = document.createElement("div");
      stage.className = "runaway-stage";
      stage.setAttribute("aria-label", "Runaway button area");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "runaway-button";
      button.textContent = "OPEN";
      let hasDodged = false;
      button.addEventListener("pointerenter", () => {
        if (hasDodged) return;
        hasDodged = true;
        button.style.left = `${10 + Math.floor(Math.random() * 68)}%`;
        button.style.top = `${14 + Math.floor(Math.random() * 58)}%`;
      });
      button.addEventListener("click", () => { submission = "OPEN"; submitCurrentAnswer(); });
      stage.append(button);
      area.append(stage);
    }
  }

  function startLevel(id) {
    if (!openLevel(state, id)) {
      showToast("That level is still locked. Solve or skip the previous level first.");
      return;
    }
    currentLevel = LEVELS[id - 1];
    submission = null;
    lockedAfterAnswer = false;
    window.clearTimeout(memoryTimer);
    if (state.currentLevelId !== id || !state.startedAt) {
      replaceState(Object.assign({}, state, {
        currentLevelId: id,
        startedAt: state.startedAt || Date.now()
      }));
    }
    $("#level-kicker").textContent = `LEVEL ${String(id).padStart(2, "0")} / ${TOTAL_LEVELS}${currentLevel.finalBoss ? " · FINAL BOSS" : ""}`;
    $("#level-title").textContent = currentLevel.title;
    $("#difficulty-badge").textContent = currentLevel.difficulty;
    $("#difficulty-badge").className = `difficulty-badge difficulty-${currentLevel.difficulty}`;
    $("#challenge-question").textContent = currentLevel.question;
    $("#challenge-instructions").textContent = currentLevel.instructions;
    $("#progress-fill").style.width = `${((state.completedLevels.length) / TOTAL_LEVELS) * 100}%`;
    $("#progress-track").setAttribute("aria-valuemax", TOTAL_LEVELS);
    $("#progress-track").setAttribute("aria-valuenow", state.completedLevels.length);
    $("#hint-box").classList.add("hidden");
    $("#feedback").classList.add("hidden");
    $("#earned-points").textContent = "";
    $("#challenge-controls").classList.remove("hidden");
    $("#after-answer").classList.add("hidden");
    $("#retry-button").classList.add("hidden");
    $("#next-button").classList.add("hidden");
    $("#return-map-button").classList.add("hidden");
    $("#attempt-count").textContent = `Attempts this level: ${state.attemptsByLevel[id] || 0}`;
    $("#challenge-card").classList.toggle("final-boss-card", currentLevel.finalBoss);
    renderPuzzle(currentLevel);
    showScreen("game-screen");
  }

  function submitCurrentAnswer() {
    if (!currentLevel || lockedAfterAnswer) return;
    const answer = currentLevel.type === "text" ? ($("#text-answer") ? $("#text-answer").value : submission) : submission;
    const updatedAttempt = recordAttempt(state, currentLevel.id);
    replaceState(updatedAttempt);
    const feedback = $("#feedback");
    feedback.classList.remove("hidden", "feedback-success", "feedback-error");
    if (validateAnswer(currentLevel, answer)) {
      lockedAfterAnswer = true;
      playTone("correct");
      const result = completeLevel(state, currentLevel);
      replaceState(result.state);
      if (!result.alreadyCompleted) playTone(currentLevel.finalBoss ? "final" : "level");
      feedback.classList.add("feedback-success");
      feedback.innerHTML = `<strong>${escapeHtml(currentLevel.successMessage)}</strong><span>${escapeHtml(currentLevel.explanation)}</span>`;
      $("#challenge-controls").classList.add("hidden");
      $("#earned-points").textContent = result.awarded ? `+${result.awarded} points earned` : "Already solved — no repeat points";
      $("#after-answer").classList.remove("hidden");
      if (currentLevel.id === TOTAL_LEVELS && state.completedLevels.length === TOTAL_LEVELS) {
        $("#next-button").classList.remove("hidden");
        $("#next-button").textContent = "See your very small reward";
      } else if (currentLevel.id < state.highestUnlocked) {
        $("#next-button").classList.remove("hidden");
      }
      $("#return-map-button").classList.remove("hidden");
    } else {
      playTone("incorrect");
      feedback.classList.add("feedback-error");
      feedback.innerHTML = `<strong>${escapeHtml(currentLevel.failureMessage)}</strong><span>Nothing was deducted — try again.</span><span>${escapeHtml(currentLevel.explanation)}</span>`;
      $("#after-answer").classList.remove("hidden");
      $("#retry-button").classList.remove("hidden");
      $("#challenge-card").classList.remove("shake");
      void $("#challenge-card").offsetWidth;
      $("#challenge-card").classList.add("shake");
      $("#attempt-count").textContent = `Attempts this level: ${state.attemptsByLevel[currentLevel.id]}`;
    }
  }

  function revealHint() {
    if (!currentLevel) return;
    const result = useHint(state, currentLevel.id);
    replaceState(result.state);
    $("#hint-box").textContent = `HINT: ${currentLevel.hint}${result.charged ? " (−25 points; charged once for this level)" : " (already charged for this level)"}`;
    $("#hint-box").classList.remove("hidden");
    playTone("click");
  }

  function skipCurrentLevel() {
    if (!currentLevel) return;
    if (state.completedLevels.includes(currentLevel.id)) {
      showToast("This level is already solved, so it cannot be skipped.");
      return;
    }
    const result = skipLevel(state, currentLevel.id);
    replaceState(result.state);
    showToast(result.charged ? "Level skipped. It remains available on the map; the next level is unlocked." : "This level was already skipped; no extra penalty was charged.");
    renderMap();
  }

  function resetCurrentLevel() {
    if (!currentLevel) return;
    const id = currentLevel.id;
    startLevel(id);
    showToast("Challenge reset. Saved progress and score were kept.");
  }

  function nextLevel() {
    if (!currentLevel) return;
    if (currentLevel.id === TOTAL_LEVELS && state.completedLevels.length === TOTAL_LEVELS) {
      renderVictory();
      return;
    }
    if (currentLevel.id < state.highestUnlocked) startLevel(currentLevel.id + 1);
    else renderMap();
  }

  function renderVictory() {
    $("#victory-score").textContent = state.score;
    $("#victory-completed").textContent = `${state.completedLevels.length} / ${TOTAL_LEVELS}`;
    $("#victory-attempts").textContent = state.attemptsTotal;
    $("#victory-hints-skips").textContent = `${state.hintsUsed} / ${state.skipsUsed}`;
    $("#victory-time").textContent = state.startedAt && state.finishedAt ? formatElapsed(state.finishedAt - state.startedAt) : "Not tracked";
    $("#share-feedback").textContent = "";
    showScreen("victory-screen");
  }

  async function shareGame() {
    const shareData = {
      title: "Impossible CAPTCHA",
      text: `Think you're human? Try the Impossible CAPTCHA ${TOTAL_LEVELS}-level prank challenge!`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        $("#share-feedback").textContent = "Share sheet opened.";
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareData.url);
        $("#share-feedback").textContent = "Page URL copied. Share it with a friend.";
      } else {
        const copiedText = window.prompt("Copy this page URL to share the game:", shareData.url);
        $("#share-feedback").textContent = copiedText === null
          ? "Sharing cancelled. You can copy the address from your browser."
          : "Use the dialog to copy the page URL.";
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        $("#share-feedback").textContent = "Share cancelled.";
      } else {
        console.warn("Sharing was unavailable.", error);
        $("#share-feedback").textContent = "Sharing was unavailable. You can copy the page URL from your browser.";
      }
    }
  }

  function restartGame() {
    if (!window.confirm("Restart all game progress? Your saved levels, scores, attempts, hints, and skips will be erased. Your sound preference will stay the same.")) return;
    const soundEnabled = state.soundEnabled;
    saveBlocked = false;
    saveNotice = "";
    replaceState(Object.assign(createInitialState(), { soundEnabled }));
    currentLevel = null;
    renderLanding();
  }

  function formatElapsed(durationMs) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
  }

  function startNextAvailable() {
    const resume = LEVELS.find(level => level.id === state.currentLevelId && !state.completedLevels.includes(level.id) && level.id <= state.highestUnlocked);
    const next = resume || LEVELS.find(level => !state.completedLevels.includes(level.id) && level.id <= state.highestUnlocked);
    startLevel(next ? next.id : 1);
  }

  function handleAction(action) {
    switch (action) {
      case "home": currentLevel = null; renderLanding(); break;
      case "start": startNextAvailable(); break;
      case "continue": {
        if (state.completedLevels.length === TOTAL_LEVELS) renderVictory();
        else startNextAvailable();
        break;
      }
      case "map": renderMap(); break;
      case "info": showScreen("info-screen"); break;
      case "settings": showScreen("settings-screen"); break;
      case "hint": revealHint(); break;
      case "skip": skipCurrentLevel(); break;
      case "reset-level": resetCurrentLevel(); break;
      case "retry": startLevel(currentLevel.id); break;
      case "next": nextLevel(); break;
      case "restart": restartGame(); break;
      case "replay": restartGame(); break;
      case "share": shareGame(); break;
      case "sound": setSound(!state.soundEnabled); break;
      default: break;
    }
  }

  document.addEventListener("click", event => {
    if (event.target.closest("button")) playTone("click");
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) handleAction(actionTarget.dataset.action);
    if (event.target === $("#sound-toggle")) setSound(!state.soundEnabled);
    if (event.target === $("#submit-answer")) submitCurrentAnswer();
  });

  function init() {
    updateGlobalDisplays();
    $("#continue-button").classList.toggle("hidden", state.completedLevels.length === 0 && state.highestUnlocked === 1);
    $("#save-indicator").textContent = saveNotice || (saveBlocked ? "Saved data needs attention" : "Progress saves on this device");
    if (loadedSave.migrated) saveProgress();
    if (saveNotice) showToast(saveNotice);
  }

  init();
})();
