(function () {
  "use strict";

  const { LEVELS, QUESTION_BANK, SAVE_KEY, SAVE_VERSION, TOTAL_LEVELS, CATEGORIES, createInitialState, validateAnswer, validateCatalog, validateQuestionBank, migrateSave, createQuestionSession, openLevel, completeLevel, useHint, skipLevel, recordAttempt, getLevelStatus, shuffle } = window.GameCore;
  const stateCheck = validateCatalog(LEVELS);
  if (!stateCheck.valid) throw new Error(`Invalid game catalog: ${stateCheck.problems.join(" ")}`);
  const bankCheck = validateQuestionBank(QUESTION_BANK);
  if (!bankCheck.valid) throw new Error(`Invalid question bank: ${bankCheck.problems.join(" ")}`);

  const loadedSave = loadProgress();
  const state = loadedSave.state;
  const PRACTICE_KEY = "impossible-captcha-practice-v1";
  const RECENT_KEY = "impossible-captcha-recent-v1";
  const QUESTION_BY_ID = new Map(QUESTION_BANK.map(question => [question.id, question]));
  let practiceSession = loadPracticeSession();
  let activePractice = Boolean(practiceSession && practiceSession.active && !practiceSession.completed);
  let saveNotice = loadedSave.notice;
  let saveBlocked = loadedSave.blocked;
  let currentLevel = null;
  let submission = null;
  let lockedAfterAnswer = false;
  let memoryTimer = null;
  let audioContext = null;
  let toastTimer = null;
  let practiceTimerId = null;
  let mapPage = 0;

  const $ = selector => document.querySelector(selector);
  const screens = ["landing-screen", "map-screen", "game-screen", "mode-screen", "practice-results-screen", "info-screen", "settings-screen", "victory-screen"];
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  const categoryLabels = {
    aptitude: "Aptitude",
    reasoning: "Reasoning",
    "verbal-ability": "Verbal Ability",
    "general-knowledge": "General Knowledge",
    mixed: "Mixed Practice",
    "puzzle-solving": "Puzzle Solving"
  };
  const questionSolution = question => {
    const solution = question.solution || question.explanation;
    return question.formula ? `${solution} Formula/shortcut: ${question.formula}` : solution;
  };

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
        notice: result.migrated ? "Your saved campaign progress was upgraded for the 1,000-level game." : "",
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

  function loadPracticeSession() {
      try {
        const saved = localStorage.getItem(PRACTICE_KEY);
        if (!saved) return null;
        const candidate = JSON.parse(saved);
        if (!candidate || candidate.version !== 1 || !candidate.session || !Array.isArray(candidate.session.questionIds)) return null;
        const session = candidate.session;
        const questions = session.questionIds.map(id => {
          const question = QUESTION_BY_ID.get(id);
          return question ? Object.assign({}, question, { options: question.options ? question.options.slice() : question.options }) : null;
        });
        if (!questions.length || questions.some(question => !question)
          || new Set(session.questionIds).size !== session.questionIds.length
          || !Number.isInteger(session.index) || session.index < 0 || session.index > questions.length) return null;
        if (Array.isArray(session.optionOrders)) {
          const questionById = new Map(questions.map(question => [question.id, question]));
          session.optionOrders.forEach(order => {
            const question = questionById.get(order.id);
            if (question && Array.isArray(order.options) && question.options && order.options.length === question.options.length) question.options = order.options;
          });
        }
        const questionIds = new Set(session.questionIds);
        const answersByQuestion = new Map();
        if (Array.isArray(session.answers)) {
          session.answers.forEach(answer => {
            if (!answer || typeof answer.questionId !== "string" || !questionIds.has(answer.questionId)) return;
            const prior = answersByQuestion.get(answer.questionId);
            const attempts = Number.isInteger(answer.attempts) && answer.attempts >= 0 ? answer.attempts : 1;
            answersByQuestion.set(answer.questionId, Object.assign({}, prior, answer, {
              correct: Boolean(answer.correct),
              skipped: Boolean(answer.skipped) && !answer.correct,
              attempts: (prior ? prior.attempts : 0) + attempts
            }));
          });
        }
        const answers = [...answersByQuestion.values()];
        const recordedAttempts = answers.reduce((sum, answer) => sum + answer.attempts, 0);
        const savedCategories = Array.isArray(session.categories)
          ? session.categories.filter(category => CATEGORIES.includes(category))
          : session.category === "mixed" ? CATEGORIES.slice()
            : CATEGORIES.includes(session.category) ? [session.category] : [];
        return Object.assign({}, session, {
          category: savedCategories.length > 1 ? "mixed" : savedCategories[0] || "aptitude",
          categories: savedCategories.length ? savedCategories : ["aptitude"],
          questions,
          answers,
          index: Math.min(session.index, questions.length),
          score: Number.isFinite(session.score) ? Math.max(0, Math.floor(session.score)) : 0,
          correct: answers.filter(answer => answer.correct).length,
          incorrect: answers.filter(answer => !answer.correct && !answer.unanswered).length,
          attemptsTotal: Number.isInteger(session.attemptsTotal) && session.attemptsTotal >= recordedAttempts ? session.attemptsTotal : recordedAttempts,
          streak: Number.isInteger(session.streak) && session.streak >= 0 ? session.streak : 0,
          bestStreak: Number.isInteger(session.bestStreak) && session.bestStreak >= 0 ? session.bestStreak : 0,
          timed: session.timed === true,
          timeLimitSeconds: Number.isInteger(session.timeLimitSeconds) && session.timeLimitSeconds > 0 ? session.timeLimitSeconds : 30,
          showExplanation: session.showExplanation !== false,
          randomOrder: session.randomOrder !== false,
          currentQuestionStartedAt: Number.isFinite(session.currentQuestionStartedAt) ? session.currentQuestionStartedAt : null,
          currentQuestionTimerId: typeof session.currentQuestionTimerId === "string" ? session.currentQuestionTimerId : null,
          hintedQuestionIds: Array.isArray(session.hintedQuestionIds) ? session.hintedQuestionIds : [],
          skippedQuestionIds: Array.isArray(session.skippedQuestionIds) ? session.skippedQuestionIds : [],
          active: session.active === true,
          completed: session.completed === true,
          finishedAt: Number.isFinite(session.finishedAt) ? session.finishedAt : null
        });
      } catch (error) {
        console.warn("Saved practice session could not be restored.", error);
        return null;
      }
    }

  function savePracticeSession() {
      if (!practiceSession) return;
      try {
        const { questions, ...savedSession } = practiceSession;
        savedSession.active = activePractice;
        savedSession.optionOrders = questions.map(question => ({ id: question.id, options: question.options || null }));
        localStorage.setItem(PRACTICE_KEY, JSON.stringify({ version: 1, session: savedSession }));
      } catch (error) {
        console.error("Unable to save practice session.", error);
        showToast("Practice progress could not be saved in this browser.");
      }
    }

  function getRecentQuestionIds() {
      try {
        const values = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(values) ? values.filter(id => typeof id === "string").slice(-QUESTION_BANK.length) : [];
      } catch (error) {
        console.warn("Recent question history was invalid and has been ignored.", error);
        return [];
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
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function updateGlobalDisplays() {
    $("#landing-completed").textContent = state.completedLevels.length;
    $("#landing-best").textContent = state.bestScore;
    $("#map-score").textContent = state.score;
    $("#game-score").textContent = activePractice && practiceSession ? practiceSession.score : state.score;
    const sound = $("#sound-toggle");
    sound.textContent = state.soundEnabled ? "Sound on" : "Sound off";
    sound.setAttribute("aria-pressed", String(state.soundEnabled));
    sound.setAttribute("aria-label", state.soundEnabled ? "Turn sound off" : "Turn sound on");
    $("#continue-button").classList.toggle("hidden", state.completedLevels.length === 0 && state.highestUnlocked === 1 && !activePractice);
    const resumePractice = $("#resume-practice");
    if (resumePractice) resumePractice.classList.toggle("hidden", !practiceSession || practiceSession.completed);
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
    const pageSize = 40;
    const pageCount = Math.ceil(TOTAL_LEVELS / pageSize);
    mapPage = Math.max(0, Math.min(mapPage, pageCount - 1));
    const first = mapPage * pageSize;
    const completedLevels = new Set(state.completedLevels);
    const skippedLevels = new Set(state.skippedLevels);
    LEVELS.slice(first, first + pageSize).forEach(level => {
      const status = completedLevels.has(level.id) ? "completed"
        : skippedLevels.has(level.id) ? "skipped"
          : level.id <= state.highestUnlocked ? "unlocked" : "locked";
      const isCurrent = currentLevel && currentLevel.id === level.id && status !== "locked";
      const button = document.createElement("button");
      button.type = "button";
      button.className = `level-tile status-${status}${isCurrent ? " currently-active" : ""}`;
      button.disabled = status === "locked";
      button.dataset.level = level.id;
      button.setAttribute("aria-label", `Level ${level.id}, ${level.difficulty}, ${isCurrent ? "current, " : ""}${status}${state.levelScores[level.id] ? `, ${state.levelScores[level.id]} points` : ""}`);
      const statusLabel = status === "completed" ? "Solved" : status === "skipped" ? "Skipped" : status === "locked" ? "Locked" : isCurrent ? "Current" : "Enter";
      button.innerHTML = `<span class="tile-number">${String(level.id).padStart(3, "0")}</span><span class="tile-difficulty">${level.difficulty}</span><span class="tile-status">${statusLabel}</span>`;
      button.addEventListener("click", () => startLevel(level.id));
      container.append(button);
    });
    $("#map-page-label").textContent = `Levels ${first + 1}–${Math.min(first + pageSize, TOTAL_LEVELS)} / ${TOTAL_LEVELS}`;
    $("#map-previous").disabled = mapPage === 0;
    $("#map-next").disabled = mapPage === pageCount - 1;
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
      button.textContent = level.answer;
      let hasDodged = false;
      button.addEventListener("pointerenter", () => {
        if (hasDodged) return;
        hasDodged = true;
        button.style.left = `${10 + Math.floor(Math.random() * 68)}%`;
        button.style.top = `${14 + Math.floor(Math.random() * 58)}%`;
      });
      button.addEventListener("click", () => { submission = button.textContent; submitCurrentAnswer(); });
      stage.append(button);
      area.append(stage);
    }
  }

  function selectedPracticeCategories() {
    if ($("#practice-mode").value === "mixed" || $("#mixed-practice").checked) return "mixed";
    return [...document.querySelectorAll("input[name='category']:checked")]
      .map(input => input.value)
      .filter(category => category !== "mixed");
  }

  function updateCategoryControls() {
    const mixed = $("#mixed-practice").checked;
    document.querySelectorAll("input[name='category']:not(#mixed-practice)").forEach(input => {
      input.disabled = mixed;
    });
    if (!mixed && !document.querySelector("input[name='category']:checked:not(#mixed-practice)")) {
      $("#practice-category-aptitude").checked = true;
    }
    updatePracticeTopics();
    updatePracticeAvailability();
  }

  function getPracticeEligibleQuestions() {
    const selection = selectedPracticeCategories();
    const categories = selection === "mixed" ? CATEGORIES : selection;
    if (!categories.length) return [];
    const difficulty = $("#practice-difficulty").value;
    const topic = $("#practice-topic").value;
    return QUESTION_BANK.filter(question =>
      categories.includes(question.categoryId)
      && (difficulty === "all" || question.difficulty === difficulty)
      && (topic === "all" || question.topic === topic));
  }

  function updatePracticeTopics() {
    const topicSelect = $("#practice-topic");
    if (!topicSelect) return;
    const currentTopic = topicSelect.value;
    const selection = selectedPracticeCategories();
    const categories = selection === "mixed" ? CATEGORIES : selection;
    const difficulty = $("#practice-difficulty").value;
    const topics = [...new Set(QUESTION_BANK
      .filter(question => categories.includes(question.categoryId)
        && (difficulty === "all" || question.difficulty === difficulty))
      .map(question => question.topic))]
      .sort((left, right) => left.localeCompare(right));
    topicSelect.replaceChildren(new Option("All topics", "all"));
    topics.forEach(topic => topicSelect.add(new Option(topic, topic)));
    topicSelect.value = topics.includes(currentTopic) ? currentTopic : "all";
  }

  function updatePracticeAvailability() {
    const eligible = getPracticeEligibleQuestions();
    const availability = $("#practice-availability");
    const countInput = $("#practice-count");
    const error = $("#practice-count-error");
    if (!availability || !countInput || !error) return;
    const categorySummary = CATEGORIES.map(category => {
      const count = eligible.filter(question => question.categoryId === category).length;
      return count ? `${categoryLabels[category]} ${count}` : "";
    }).filter(Boolean).join(" · ");
    availability.textContent = `${eligible.length} unique questions available${categorySummary ? ` (${categorySummary})` : ""}.`;
    const count = Number(countInput.value);
    const validCount = Number.isInteger(count) && count >= 100 && count <= 200 && (count - 100) % 10 === 0;
    if (!validCount) {
      error.textContent = "Choose a whole-number count from 100 to 200 in steps of 10.";
      error.classList.remove("hidden");
      countInput.setAttribute("aria-invalid", "true");
    } else if (count > eligible.length) {
      error.textContent = `You requested ${count}, but only ${eligible.length} unique questions match. Choose more categories or a lower count${eligible.length >= 100 ? ` (up to ${Math.floor(eligible.length / 10) * 10})` : ""}.`;
      error.classList.remove("hidden");
      countInput.setAttribute("aria-invalid", "true");
    } else {
      error.textContent = "";
      error.classList.add("hidden");
      countInput.removeAttribute("aria-invalid");
    }
  }

  function beginPractice(event) {
    event.preventDefault();
    if (practiceSession && !practiceSession.completed && !window.confirm("Starting a new practice session will replace the unfinished saved practice session. Continue?")) return;
    const mode = $("#practice-mode").value;
    const selectedCategories = selectedPracticeCategories();
    const categories = selectedCategories === "mixed" ? CATEGORIES.slice() : selectedCategories;
    if (!categories.length) {
      showToast("Choose at least one practice category.");
      return;
    }
    const category = selectedCategories === "mixed" || categories.length > 1 ? "mixed" : categories[0];
    const custom = mode === "custom";
    const count = mode === "quick" || mode === "daily" ? 10 : mode === "challenge" || mode === "mixed" ? 25 : custom ? Number($("#practice-count").value) : undefined;
    if (custom && (!Number.isInteger(count) || count < 100 || count > 200 || (count - 100) % 10 !== 0)) {
      $("#practice-count-error").textContent = "Choose a whole-number count from 100 to 200 in steps of 10.";
      $("#practice-count-error").classList.remove("hidden");
      $("#practice-count").setAttribute("aria-invalid", "true");
      $("#practice-count").focus();
      return;
    }
    if (custom && count > getPracticeEligibleQuestions().length) {
      updatePracticeAvailability();
      $("#practice-count-error").focus();
      return;
    }
    try {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const recent = getRecentQuestionIds();
      practiceSession = createQuestionSession(QUESTION_BANK, {
        mode,
        category,
        categories,
        difficulty: custom ? $("#practice-difficulty").value : "all",
        topic: custom ? $("#practice-topic").value : "all",
        count,
        timed: custom && $("#practice-timed").checked,
        timeLimitSeconds: 30,
        randomOrder: !custom || $("#practice-random-order").checked,
        showExplanation: !custom || $("#practice-show-explanations").checked,
        recentQuestionIds: recent,
        crypto: window.crypto,
        date
      });
      activePractice = true;
      try {
        const nextRecent = [...recent, ...practiceSession.questionIds].slice(-QUESTION_BANK.length);
        localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
      } catch (error) {
        console.error("Unable to save recent question history.", error);
      }
      savePracticeSession();
      startPracticeQuestion();
    } catch (error) {
      console.error("Unable to start the selected practice session.", error);
      showToast(error.message || "This session could not be started.");
    }
  }

  function clearPracticeTimer() {
    if (practiceTimerId !== null) window.clearInterval(practiceTimerId);
    practiceTimerId = null;
    $("#practice-timer").classList.add("hidden");
    $("#practice-timer").textContent = "";
  }

  function expirePracticeQuestion() {
    if (!practiceSession || !currentLevel || lockedAfterAnswer) return;
    clearPracticeTimer();
    const previousAnswer = practiceSession.answers.find(answer => answer.questionId === currentLevel.id);
    if (!previousAnswer) {
      practiceSession.answers.push({
        questionId: currentLevel.id,
        categoryId: currentLevel.categoryId,
        difficulty: currentLevel.difficulty,
        correct: false,
        unanswered: true,
        attempts: 0
      });
    }
    practiceSession.streak = 0;
    lockedAfterAnswer = true;
    const feedback = $("#feedback");
    feedback.classList.remove("hidden", "feedback-success");
    feedback.classList.add("feedback-error");
    feedback.innerHTML = `<strong>Time expired.</strong><span>${previousAnswer ? "Your submitted incorrect answer remains recorded." : "This question is recorded as unanswered."}${practiceSession.showExplanation ? ` ${escapeHtml(questionSolution(currentLevel))}` : ""}</span>`;
    $("#challenge-controls").classList.add("hidden");
    $("#after-answer").classList.remove("hidden");
    $("#retry-button").classList.add("hidden");
    $("#next-button").classList.remove("hidden");
    savePracticeSession();
    updateGlobalDisplays();
  }

  function updatePracticeTimer() {
    if (!practiceSession || !practiceSession.timed || !Number.isFinite(practiceSession.currentQuestionStartedAt)) return;
    const deadline = practiceSession.currentQuestionStartedAt + practiceSession.timeLimitSeconds * 1000;
    const remaining = Math.ceil((deadline - Date.now()) / 1000);
    if (remaining <= 0) {
      expirePracticeQuestion();
      return;
    }
    $("#practice-timer").textContent = `Time left: ${remaining}s`;
    $("#practice-timer").classList.remove("hidden");
  }

  function startPracticeQuestion() {
    if (!practiceSession || practiceSession.index >= practiceSession.questions.length) {
      renderPracticeResults();
      return;
    }
    activePractice = true;
    currentLevel = practiceSession.questions[practiceSession.index];
    submission = null;
    lockedAfterAnswer = false;
    clearPracticeTimer();
    if (practiceSession.timed) {
      if (practiceSession.currentQuestionTimerId !== currentLevel.id || !Number.isFinite(practiceSession.currentQuestionStartedAt)) {
        practiceSession.currentQuestionTimerId = currentLevel.id;
        practiceSession.currentQuestionStartedAt = Date.now();
      }
      updatePracticeTimer();
      if (!lockedAfterAnswer) practiceTimerId = window.setInterval(updatePracticeTimer, 250);
      savePracticeSession();
    } else {
      practiceSession.currentQuestionTimerId = currentLevel.id;
      practiceSession.currentQuestionStartedAt = null;
    }
    window.clearTimeout(memoryTimer);
    const categoryName = currentLevel.category || currentLevel.categoryId;
    $("#level-kicker").textContent = `${String(categoryName).toUpperCase()} · ${practiceSession.index + 1} / ${practiceSession.questions.length} · ${practiceSession.mode.toUpperCase()}`;
    $("#level-title").textContent = currentLevel.title || currentLevel.topic;
    $("#difficulty-badge").textContent = currentLevel.difficulty;
    $("#difficulty-badge").className = `difficulty-badge difficulty-${currentLevel.difficulty}`;
    $("#challenge-question").textContent = currentLevel.question;
    $("#challenge-passage").textContent = currentLevel.passage || "";
    $("#challenge-passage").classList.toggle("hidden", !currentLevel.passage);
    $("#challenge-instructions").textContent = currentLevel.instructions || "Choose or enter your answer.";
    const progress = practiceSession.index / practiceSession.questions.length * 100;
    $("#progress-fill").style.width = `${progress}%`;
    $("#progress-track").setAttribute("aria-valuemax", practiceSession.questions.length);
    $("#progress-track").setAttribute("aria-valuenow", practiceSession.index);
    $("#hint-box").classList.add("hidden");
    $("#feedback").classList.remove("feedback-success", "feedback-error");
    $("#feedback").classList.add("hidden");
    $("#earned-points").textContent = "";
    $("#challenge-controls").classList.remove("hidden");
    $("#after-answer").classList.add("hidden");
    $("#retry-button").classList.add("hidden");
    $("#next-button").classList.add("hidden");
    $("#return-map-button").classList.add("hidden");
    $("#attempt-count").textContent = `Question ${practiceSession.index + 1} of ${practiceSession.questions.length} · Session ${practiceSession.sessionId.slice(0, 8)}`;
    $("#challenge-card").classList.remove("final-boss-card");
    renderPuzzle(currentLevel);
    if (practiceSession.hintedQuestionIds.includes(currentLevel.id)) {
      $("#hint-box").textContent = `HINT: ${currentLevel.hint} (already charged for this question)`;
      $("#hint-box").classList.remove("hidden");
    }
    const priorAnswer = [...practiceSession.answers].reverse().find(answer => answer.questionId === currentLevel.id);
    if (priorAnswer && (priorAnswer.correct || priorAnswer.skipped || priorAnswer.unanswered)) {
      lockedAfterAnswer = true;
      clearPracticeTimer();
      const feedback = $("#feedback");
      feedback.classList.remove("hidden");
      feedback.classList.add(priorAnswer.correct ? "feedback-success" : "feedback-error");
      const status = priorAnswer.correct ? "Answer already recorded for this question." : priorAnswer.skipped ? "This question was skipped." : "Time expired; this question is unanswered.";
      feedback.innerHTML = `<strong>${status}</strong><span>${escapeHtml(questionSolution(currentLevel))}</span>`;
      $("#challenge-controls").classList.add("hidden");
      $("#after-answer").classList.remove("hidden");
      $("#retry-button").classList.add("hidden");
      $("#next-button").classList.remove("hidden");
      $("#earned-points").textContent = "Saved answer — no duplicate score";
    } else if (priorAnswer) {
      const feedback = $("#feedback");
      feedback.classList.remove("hidden");
      feedback.classList.add("feedback-error");
      feedback.innerHTML = `<strong>That saved attempt was incorrect.</strong><span>You can try again. Your score is safe.</span>`;
    }
    updateGlobalDisplays();
    showScreen("game-screen");
  }

  function submitPracticeAnswer(answer) {
    if (!practiceSession || lockedAfterAnswer) return;
    if (practiceSession.timed && Date.now() >= practiceSession.currentQuestionStartedAt + practiceSession.timeLimitSeconds * 1000) {
      expirePracticeQuestion();
      return;
    }
    const correct = validateAnswer(currentLevel, answer);
    practiceSession.attemptsTotal += 1;
    const previousAnswer = practiceSession.answers.find(item => item.questionId === currentLevel.id);
    const feedback = $("#feedback");
    feedback.classList.remove("hidden", "feedback-success", "feedback-error");
    if (correct) {
      lockedAfterAnswer = true;
      if (!previousAnswer) {
        practiceSession.answers.push({ questionId: currentLevel.id, categoryId: currentLevel.categoryId, difficulty: currentLevel.difficulty, correct: true, chosenAnswer: answer, attempts: 1 });
      } else {
        if (!previousAnswer.correct) {
          practiceSession.incorrect = Math.max(0, practiceSession.incorrect - 1);
          practiceSession.correct += 1;
        }
        previousAnswer.correct = true;
        previousAnswer.skipped = false;
        previousAnswer.unanswered = false;
        previousAnswer.chosenAnswer = answer;
        previousAnswer.attempts = (previousAnswer.attempts || 1) + 1;
      }
      if (!previousAnswer) practiceSession.correct += 1;
      clearPracticeTimer();
      practiceSession.streak += 1;
      practiceSession.bestStreak = Math.max(practiceSession.bestStreak, practiceSession.streak);
      const award = practiceSession.hintedQuestionIds.includes(currentLevel.id) ? currentLevel.points : currentLevel.points + 25;
      practiceSession.score += award;
      feedback.classList.add("feedback-success");
      feedback.innerHTML = `<strong>${escapeHtml(currentLevel.successMessage || "Correct!")}</strong>${practiceSession.showExplanation ? `<span>${escapeHtml(questionSolution(currentLevel))}</span>` : ""}`;
      $("#challenge-controls").classList.add("hidden");
      $("#earned-points").textContent = `+${award} points earned`;
      $("#after-answer").classList.remove("hidden");
      $("#next-button").classList.remove("hidden");
      $("#return-map-button").classList.add("hidden");
      playTone("correct");
    } else {
      if (previousAnswer) {
        previousAnswer.attempts = (previousAnswer.attempts || 1) + 1;
        previousAnswer.chosenAnswer = answer;
      }
      else {
        practiceSession.incorrect += 1;
        practiceSession.answers.push({ questionId: currentLevel.id, categoryId: currentLevel.categoryId, difficulty: currentLevel.difficulty, correct: false, chosenAnswer: answer, attempts: 1 });
      }
      practiceSession.streak = 0;
      feedback.classList.add("feedback-error");
      feedback.innerHTML = `<strong>${escapeHtml(currentLevel.failureMessage || "Not quite. Try again.")}</strong><span>Your score is safe. Attempts on this question: ${previousAnswer ? previousAnswer.attempts : 1}. Use the hint or try another answer.</span>${practiceSession.showExplanation ? `<span>${escapeHtml(questionSolution(currentLevel))}</span>` : ""}`;
      $("#after-answer").classList.remove("hidden");
      $("#retry-button").classList.remove("hidden");
      playTone("incorrect");
    }
    savePracticeSession();
    updateGlobalDisplays();
  }

  function advancePractice() {
    if (!practiceSession) return;
    clearPracticeTimer();
    practiceSession.index += 1;
    practiceSession.currentQuestionStartedAt = null;
    practiceSession.currentQuestionTimerId = null;
    if (practiceSession.index >= practiceSession.questions.length) {
      practiceSession.completed = true;
      practiceSession.finishedAt = Date.now();
      savePracticeSession();
      renderPracticeResults();
    } else {
      savePracticeSession();
      startPracticeQuestion();
    }
  }

  function renderPracticeResults() {
    if (!practiceSession) return;
    practiceSession.completed = true;
    practiceSession.finishedAt = practiceSession.finishedAt || Date.now();
    const unanswered = practiceSession.answers.filter(answer => answer.unanswered).length;
    const incorrect = practiceSession.answers.filter(answer => !answer.correct && !answer.unanswered).length;
    const correct = practiceSession.answers.filter(answer => answer.correct).length;
    const totalAnswers = correct + incorrect;
    const accuracy = totalAnswers ? Math.round(correct / totalAnswers * 100) : 0;
    $("#results-score").textContent = practiceSession.score;
    $("#results-total").textContent = practiceSession.questions.length;
    $("#results-accuracy").textContent = `${accuracy}%`;
    $("#results-correct").textContent = correct;
    $("#results-incorrect").textContent = incorrect;
    $("#results-attempts").textContent = practiceSession.attemptsTotal;
    $("#results-unanswered").textContent = unanswered;
    $("#results-streak").textContent = practiceSession.bestStreak;
    $("#results-time").textContent = !practiceSession.timed
      ? "Not timed"
      : practiceSession.finishedAt
      ? formatElapsed(practiceSession.finishedAt - practiceSession.startedAt)
      : "In progress";
    $("#results-category").textContent = `${practiceSession.mode} · ${practiceSession.categories.map(category => categoryLabels[category] || category).join(", ")} · ${practiceSession.questionIds.length} unique questions. Progress is saved only in this browser.`;
    const categorySummary = CATEGORIES.map(category => {
      const results = practiceSession.answers.filter(answer => answer.categoryId === category && !answer.unanswered);
      return `${categoryLabels[category]}: ${results.filter(answer => answer.correct).length}/${results.length}`;
    }).filter(summary => !summary.endsWith(": 0/0")).join(" · ");
    const difficultySummary = ["easy", "medium", "hard"].map(difficulty => {
      const results = practiceSession.answers.filter(answer => answer.difficulty === difficulty && !answer.unanswered);
      return `${difficulty}: ${results.filter(answer => answer.correct).length}/${results.length}`;
    }).filter(summary => !summary.endsWith(": 0/0")).join(" · ");
    const topics = [...new Set(practiceSession.questions.map(question => question.topic))];
    const topicSummary = topics.map(topic => {
      const results = practiceSession.answers.filter(answer => {
        const question = QUESTION_BY_ID.get(answer.questionId);
        return question && question.topic === topic && !answer.unanswered;
      });
      return `${topic}: ${results.filter(answer => answer.correct).length}/${results.length}`;
    }).filter(summary => !summary.endsWith(": 0/0")).join(" · ");
    $("#results-breakdown").textContent = `By category — ${categorySummary || "No answered questions"}. By difficulty — ${difficultySummary || "No answered questions"}. By topic — ${topicSummary || "No answered questions"}.`;
    $("#results-review").replaceChildren(...practiceSession.questions.map(question => {
      const answer = practiceSession.answers.find(item => item.questionId === question.id);
      const details = document.createElement("details");
      details.className = "practice-review-item";
      const summary = document.createElement("summary");
      summary.textContent = `${answer && answer.correct ? "Correct" : answer && answer.unanswered ? "Unanswered" : "Review"} · ${question.topic} · ${question.title}`;
      const questionText = document.createElement("p");
      questionText.textContent = question.question;
      const chosen = document.createElement("p");
      chosen.textContent = `Your answer: ${answer && answer.chosenAnswer != null ? (Array.isArray(answer.chosenAnswer) ? answer.chosenAnswer.join(", ") : answer.chosenAnswer) : answer && answer.skipped ? "Skipped" : "No answer"}`;
      const correctAnswer = document.createElement("p");
      correctAnswer.textContent = `Correct answer: ${Array.isArray(question.answer) ? question.answer.join(", ") : question.answer}`;
      const explanation = document.createElement("p");
      explanation.textContent = questionSolution(question);
      details.append(summary, questionText, chosen, correctAnswer, explanation);
      return details;
    }));
    savePracticeSession();
    activePractice = false;
    updateGlobalDisplays();
    showScreen("practice-results-screen");
  }

  function startLevel(id) {
    if (activePractice && practiceSession) {
      clearPracticeTimer();
      activePractice = false;
      savePracticeSession();
    }
    activePractice = false;
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
    $("#level-kicker").textContent = `LEVEL ${String(id).padStart(3, "0")} / ${TOTAL_LEVELS}${currentLevel.finalBoss ? " · FINAL BOSS" : ""}`;
    $("#level-title").textContent = currentLevel.title;
    $("#difficulty-badge").textContent = currentLevel.difficulty;
    $("#difficulty-badge").className = `difficulty-badge difficulty-${currentLevel.difficulty}`;
    $("#challenge-question").textContent = currentLevel.question;
    $("#challenge-passage").textContent = currentLevel.passage || "";
    $("#challenge-passage").classList.toggle("hidden", !currentLevel.passage);
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
    if (activePractice) {
      submitPracticeAnswer(answer);
      return;
    }
    const updatedAttempt = recordAttempt(state, currentLevel.id);
    replaceState(updatedAttempt);
    $("#attempt-count").textContent = `Attempts this level: ${state.attemptsByLevel[currentLevel.id]}`;
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
      feedback.innerHTML = `<strong>${escapeHtml(currentLevel.failureMessage)}</strong><span>Nothing was deducted — try again. The hint is available if you need a clue.</span>`;
      $("#after-answer").classList.remove("hidden");
      $("#retry-button").classList.remove("hidden");
      $("#challenge-card").classList.remove("shake");
      void $("#challenge-card").offsetWidth;
      $("#challenge-card").classList.add("shake");
    }
  }

  function revealHint() {
    if (!currentLevel) return;
    if (activePractice && practiceSession) {
      const alreadyUsed = practiceSession.hintedQuestionIds.includes(currentLevel.id);
      if (!alreadyUsed) {
        practiceSession.hintedQuestionIds.push(currentLevel.id);
        practiceSession.score = Math.max(0, practiceSession.score - 25);
      }
      $("#hint-box").textContent = `HINT: ${currentLevel.hint}${alreadyUsed ? " (already charged for this question)" : " (−25 points)"}`;
      $("#hint-box").classList.remove("hidden");
      savePracticeSession();
      updateGlobalDisplays();
      playTone("click");
      return;
    }
    const result = useHint(state, currentLevel.id);
    replaceState(result.state);
    $("#hint-box").textContent = `HINT: ${currentLevel.hint}${result.charged ? " (−25 points; charged once for this level)" : " (already charged for this level)"}`;
    $("#hint-box").classList.remove("hidden");
    playTone("click");
  }

  function skipCurrentLevel() {
    if (!currentLevel) return;
    if (activePractice && practiceSession) {
      if (!lockedAfterAnswer) {
        clearPracticeTimer();
        practiceSession.skippedQuestionIds.push(currentLevel.id);
        const previousAnswer = practiceSession.answers.find(answer => answer.questionId === currentLevel.id);
        if (previousAnswer) previousAnswer.skipped = true;
        else {
          practiceSession.incorrect += 1;
          practiceSession.answers.push({ questionId: currentLevel.id, categoryId: currentLevel.categoryId, difficulty: currentLevel.difficulty, skipped: true, correct: false, attempts: 0 });
        }
        practiceSession.streak = 0;
        practiceSession.score = Math.max(0, practiceSession.score - 50);
        lockedAfterAnswer = true;
        const feedback = $("#feedback");
        feedback.classList.remove("hidden", "feedback-success", "feedback-error");
        feedback.classList.add("feedback-error");
        feedback.innerHTML = `<strong>Skipped — 50 points deducted.</strong><span>${escapeHtml(currentLevel.explanation)}</span>`;
        $("#challenge-controls").classList.add("hidden");
        $("#after-answer").classList.remove("hidden");
        $("#next-button").classList.remove("hidden");
        $("#retry-button").classList.add("hidden");
        $("#attempt-count").textContent = `Question ${practiceSession.index + 1} of ${practiceSession.questions.length} · Attempts: ${previousAnswer ? previousAnswer.attempts : 0}`;
      }
      savePracticeSession();
      updateGlobalDisplays();
      return;
    }
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
    if (activePractice) {
      startPracticeQuestion();
      showToast("Question reset. Your session score and progress were kept.");
      return;
    }
    const id = currentLevel.id;
    startLevel(id);
    showToast("Challenge reset. Saved progress and score were kept.");
  }

  function nextLevel() {
    if (!currentLevel) return;
    if (activePractice) {
      advancePractice();
      return;
    }
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
      text: `Try the Impossible CAPTCHA ${TOTAL_LEVELS}-level reasoning and puzzle challenge!`,
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
    if (!window.confirm("Restart all progress? This erases campaign saves, practice sessions, and recent-question history. Your sound preference will stay the same.")) return;
    clearPracticeTimer();
    const soundEnabled = state.soundEnabled;
    saveBlocked = false;
    saveNotice = "";
    replaceState(Object.assign(createInitialState(), { soundEnabled }));
    try {
      localStorage.removeItem(PRACTICE_KEY);
      localStorage.removeItem(RECENT_KEY);
    } catch (error) {
      console.error("Unable to clear saved practice history.", error);
    }
    practiceSession = null;
    activePractice = false;
    currentLevel = null;
    renderLanding();
  }

  function restartPractice() {
    if (!practiceSession) return;
    clearPracticeTimer();
    if (practiceSession.randomOrder) {
      practiceSession.questions = shuffle(practiceSession.questions, window.crypto);
      practiceSession.questionIds = practiceSession.questions.map(question => question.id);
    }
    Object.assign(practiceSession, {
      index: 0,
      answers: [],
      score: 0,
      correct: 0,
      incorrect: 0,
      attemptsTotal: 0,
      streak: 0,
      bestStreak: 0,
      hintedQuestionIds: [],
      skippedQuestionIds: [],
      completed: false,
      startedAt: Date.now(),
      finishedAt: null,
      currentQuestionStartedAt: null,
      currentQuestionTimerId: null
    });
    activePractice = true;
    savePracticeSession();
    startPracticeQuestion();
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
      case "home": clearPracticeTimer(); currentLevel = null; renderLanding(); break;
      case "start": startNextAvailable(); break;
      case "continue": {
        if (activePractice && practiceSession) startPracticeQuestion();
        else if (state.completedLevels.length === TOTAL_LEVELS) renderVictory();
        else startNextAvailable();
        break;
      }
      case "modes": clearPracticeTimer(); showScreen("mode-screen"); break;
      case "resume-practice": if (practiceSession && !practiceSession.completed) startPracticeQuestion(); break;
      case "restart-practice": restartPractice(); break;
      case "map-previous": mapPage = Math.max(0, mapPage - 1); renderMap(); break;
      case "map-next": mapPage += 1; renderMap(); break;
      case "map": mapPage = Math.floor((state.currentLevelId - 1) / 40); renderMap(); break;
      case "info": showScreen("info-screen"); break;
      case "settings": showScreen("settings-screen"); break;
      case "hint": revealHint(); break;
      case "skip": skipCurrentLevel(); break;
      case "reset-level": resetCurrentLevel(); break;
      case "retry": if (activePractice) startPracticeQuestion(); else startLevel(currentLevel.id); break;
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

  $("#practice-setup-form").addEventListener("submit", beginPractice);
  $("#practice-mode").addEventListener("change", () => {
    const custom = $("#practice-mode").value === "custom";
    $("#custom-options").classList.toggle("hidden", !custom);
    $("#practice-count").required = custom;
    $("#practice-count").disabled = !custom;
    updatePracticeTopics();
    updatePracticeAvailability();
  });
  document.querySelectorAll("input[name='category']").forEach(input => input.addEventListener("change", () => {
    if (input.id === "mixed-practice" && input.checked) {
      document.querySelectorAll("input[name='category']:not(#mixed-practice)").forEach(category => { category.checked = false; });
    } else if (input.checked) {
      $("#mixed-practice").checked = false;
    }
    updateCategoryControls();
  }));
  $("#practice-difficulty").addEventListener("change", () => {
    updatePracticeTopics();
    updatePracticeAvailability();
  });
  $("#practice-topic").addEventListener("change", updatePracticeAvailability);
  $("#practice-count").addEventListener("input", updatePracticeAvailability);
  $("#practice-count").required = false;
  $("#practice-count").disabled = true;
  updateCategoryControls();

  function init() {
    updateGlobalDisplays();
    $("#continue-button").classList.toggle("hidden", state.completedLevels.length === 0 && state.highestUnlocked === 1 && !activePractice);
    $("#save-indicator").textContent = saveNotice || (saveBlocked ? "Saved data needs attention" : "Progress saves on this device");
    if (loadedSave.migrated) saveProgress();
    if (saveNotice) showToast(saveNotice);
    if (activePractice) startPracticeQuestion();
  }

  init();
})();
