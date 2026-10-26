(function (root, factory) {
  const levelData = typeof module === "object" && module.exports ? require("./level-data.js") : root && root.LevelData;
  const questionBank = typeof module === "object" && module.exports ? require("./question-bank.js") : root && root.QuestionBank;
  const api = factory(levelData, questionBank);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (levelData, questionBank) {
  "use strict";

  const BASE_POINTS = { easy: 100, medium: 200, hard: 300 };
  const SAVE_KEY = "impossible-captcha-save";
  const SAVE_VERSION = 3;
  const LEGACY_LEVEL_COUNT = 50;
  const TOTAL_LEVELS = 1000;
  const CATEGORIES = ["aptitude", "reasoning", "general-knowledge", "tricky"];
  const legacyDifficulty = [
    "easy", "hard", "medium", "medium", "easy", "hard", "easy", "medium", "hard", "medium",
    "hard", "easy", "medium", "easy", "hard", "medium", "easy", "hard", "medium", "hard",
    "easy", "medium", "hard", "easy", "medium", "hard", "medium", "easy", "hard", "medium",
    "easy", "hard", "medium", "hard", "easy", "medium", "hard", "easy", "medium", "hard",
    "medium", "easy", "hard", "medium", "easy", "hard", "medium", "hard", "easy", "hard",
    "hard", "medium", "easy", "hard", "medium", "easy", "medium", "hard", "easy", "medium",
    "hard", "easy", "medium", "hard", "medium", "easy", "hard", "medium", "easy", "hard",
    "medium", "easy", "hard", "medium", "hard", "hard", "medium", "easy", "hard", "medium",
    "easy", "medium", "hard", "hard", "medium", "easy", "hard", "medium", "easy", "hard",
    "medium", "easy", "hard", "medium", "easy", "hard", "medium", "easy", "hard", "hard"
  ];
  const DIFFICULTIES = Array.from({ length: TOTAL_LEVELS }, (_, index) => difficultyForLevel(index + 1));

  function difficultyForLevel(levelId) {
    if (levelId <= legacyDifficulty.length) return legacyDifficulty[levelId - 1];
    const progress = levelId / TOTAL_LEVELS;
    const sequence = progress < 0.3
      ? ["easy", "easy", "medium", "easy", "hard", "medium", "easy", "medium", "easy", "hard"]
      : progress < 0.7
        ? ["easy", "medium", "hard", "medium", "easy", "hard", "medium", "easy", "hard", "medium"]
        : ["medium", "hard", "easy", "hard", "medium", "hard", "easy", "hard", "medium", "hard"];
    return sequence[(levelId - 1) % sequence.length];
  }

  const curatedQuestions = (levelData || []).map((level, index) => Object.assign({}, level, {
    id: `tricky-${String(index + 1).padStart(3, "0")}`,
    categoryId: "tricky",
    topic: level.category,
    difficulty: legacyDifficulty[index],
    points: BASE_POINTS[legacyDifficulty[index]]
  }));
  const QUESTION_BANK = [...(questionBank || []), ...curatedQuestions];
  const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, index) => {
    const levelId = index + 1;
    const question = levelId <= (levelData || []).length
      ? curatedQuestions[index]
      : QUESTION_BANK[(levelId - (levelData || []).length - 1) % QUESTION_BANK.length];
    const difficulty = levelId <= legacyDifficulty.length ? legacyDifficulty[index] : difficultyForLevel(levelId);
    return Object.assign({}, question, {
      id: levelId,
      questionId: question.id,
      title: levelId <= (levelData || []).length ? question.title : `${question.title} · Echo ${Math.floor((levelId - 1) / QUESTION_BANK.length) + 1}`,
      difficulty,
      points: BASE_POINTS[difficulty],
      finalBoss: levelId === TOTAL_LEVELS
    });
  });

  function randomInt(max, cryptoSource) {
    if (max <= 0) throw new RangeError("Random selection requires a positive range.");
    if (cryptoSource && typeof cryptoSource.getRandomValues === "function") {
      const values = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / max) * max;
      let value;
      do {
        cryptoSource.getRandomValues(values);
        value = values[0];
      } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffle(items, cryptoSource) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = randomInt(index + 1, cryptoSource);
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return max => {
      value = (value + 0x6D2B79F5) >>> 0;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * max);
    };
  }

  function createQuestionSession(questions, options = {}) {
    const categories = options.category === "mixed" ? CATEGORIES : [options.category || "tricky"];
    const difficulty = options.difficulty || "all";
    const eligible = questions.filter(question =>
      categories.includes(question.categoryId)
      && (difficulty === "all" || question.difficulty === difficulty));
    if (!eligible.length) throw new Error("No questions match the selected category and difficulty.");

    const daily = options.mode === "daily";
    const excluded = new Set(daily ? [] : options.recentQuestionIds || []);
    const unseen = eligible.filter(question => !excluded.has(question.id));
    const seen = eligible.filter(question => excluded.has(question.id));
    const seedText = options.date || new Date().toISOString().slice(0, 10);
    const seed = Array.from(seedText).reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261);
    const random = daily ? seededRandom(seed) : null;
    const randomIndex = max => random ? random(max) : randomInt(max, options.crypto);
    const shuffleItems = items => {
      const result = items.slice();
      for (let index = result.length - 1; index > 0; index -= 1) {
        const other = randomIndex(index + 1);
        [result[index], result[other]] = [result[other], result[index]];
      }
      return result;
    };
    const balance = pool => {
      const shuffled = shuffleItems(pool);
      const balanced = [];
      if (options.category === "mixed") {
        const categoryOrder = shuffleItems(CATEGORIES);
        const buckets = Object.fromEntries(categoryOrder.map(category => [category, {
          easy: [], medium: [], hard: []
        }]));
        shuffled.forEach(question => buckets[question.categoryId][question.difficulty].push(question));
        while (categoryOrder.some(category => Object.values(buckets[category]).some(bucket => bucket.length))) {
          for (const category of categoryOrder) {
            const difficulties = shuffleItems(["easy", "medium", "hard"]);
            const nextDifficulty = difficulties.find(key => buckets[category][key].length);
            if (nextDifficulty) balanced.push(buckets[category][nextDifficulty].pop());
          }
        }
      } else {
        const byDifficulty = { easy: [], medium: [], hard: [] };
        shuffled.forEach(question => byDifficulty[question.difficulty].push(question));
        while (Object.values(byDifficulty).some(bucket => bucket.length)) {
          for (const key of ["easy", "medium", "hard"]) {
            if (byDifficulty[key].length) balanced.push(byDifficulty[key].pop());
          }
        }
      }
      return balanced;
    };
    const requestedCount = options.mode === "endless" ? eligible.length : Math.min(options.count || 10, eligible.length);
    const selected = daily
      ? balance(eligible).slice(0, requestedCount)
      : shuffleItems([
        ...balance(unseen).slice(0, Math.min(requestedCount, unseen.length)),
        ...balance(seen).slice(0, Math.max(0, requestedCount - unseen.length))
      ]);
    return {
      sessionId: createSessionId(daily ? null : options.crypto, seedText),
      mode: options.mode || "quick",
      category: options.category || "tricky",
      difficulty,
      date: daily ? seedText : null,
      questionIds: selected.map(question => question.id),
      questions: selected.map(question => Object.assign({}, question, {
        options: question.options ? (daily ? question.options.slice() : shuffle(question.options, options.crypto)) : question.options
      })),
      index: 0,
      answers: [],
      score: 0,
      correct: 0,
      incorrect: 0,
      streak: 0,
      bestStreak: 0,
      hintedQuestionIds: [],
      skippedQuestionIds: [],
      completed: false,
      startedAt: Date.now(),
      finishedAt: null
    };
  }

  function createSessionId(cryptoSource, seedText) {
    if (cryptoSource && typeof cryptoSource.getRandomValues === "function") {
      const values = new Uint32Array(4);
      cryptoSource.getRandomValues(values);
      return Array.from(values, value => value.toString(16).padStart(8, "0")).join("");
    }
    return `${seedText}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function normalizeText(value) {
    const original = String(value == null ? "" : value).trim().toLocaleLowerCase().normalize("NFC");
    const normalized = original.replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
    return normalized || original;
  }

  function sameSequence(actual, expected) {
    return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
  }

  function validateAnswer(level, submission) {
    if (!level) return false;
    if (level.type === "grid") {
      const selected = Array.isArray(submission) ? [...new Set(submission)].sort((a, b) => a - b) : [];
      const expected = [...level.answer].sort((a, b) => a - b);
      return sameSequence(selected, expected);
    }
    if (level.type === "order" || level.type === "memory") return sameSequence(submission, level.answer);
    const accepted = Array.isArray(level.answer) ? level.answer : [level.answer];
    return accepted.some(answer => level.caseSensitive
      ? String(answer).trim() === String(submission == null ? "" : submission).trim()
      : normalizeText(answer) === normalizeText(submission));
  }

  function createInitialState() {
    return {
      highestUnlocked: 1,
      currentLevelId: 1,
      completedLevels: [],
      skippedLevels: [],
      levelScores: {},
      hintedLevels: [],
      hintsUsed: 0,
      skipsUsed: 0,
      attemptsByLevel: {},
      attemptsTotal: 0,
      score: 0,
      bestScore: 0,
      soundEnabled: false,
      startedAt: null,
      finishedAt: null
    };
  }

  function sanitizeState(candidate, maxLevel = TOTAL_LEVELS) {
    const fresh = createInitialState();
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return fresh;
    const validIds = value => Array.isArray(value)
      ? [...new Set(value.filter(id => Number.isInteger(id) && id >= 1 && id <= maxLevel))].sort((a, b) => a - b)
      : [];
    const completed = validIds(candidate.completedLevels);
    const skipped = validIds(candidate.skippedLevels);
    const hinted = validIds(candidate.hintedLevels);
    const scores = {};
    if (candidate.levelScores && typeof candidate.levelScores === "object" && !Array.isArray(candidate.levelScores)) {
      for (const id of completed) {
        const amount = Number(candidate.levelScores[id]);
        const maxAward = BASE_POINTS[LEVELS[id - 1].difficulty] + 25;
        if (Number.isFinite(amount) && amount >= 0 && amount <= maxAward) scores[id] = Math.floor(amount);
      }
    }
    const attempts = {};
    if (candidate.attemptsByLevel && typeof candidate.attemptsByLevel === "object" && !Array.isArray(candidate.attemptsByLevel)) {
      for (let id = 1; id <= maxLevel; id += 1) {
        const value = Number(candidate.attemptsByLevel[id]);
        if (Number.isInteger(value) && value >= 0 && value <= 100000) attempts[id] = value;
      }
    }
    const savedUnlocked = Number.isInteger(candidate.highestUnlocked) && candidate.highestUnlocked >= 1 && candidate.highestUnlocked <= maxLevel
      ? candidate.highestUnlocked
      : 1;
    const milestoneUnlocked = Math.max(1, ...completed.map(id => Math.min(maxLevel, id + 1)), ...skipped.map(id => Math.min(maxLevel, id + 1)));
    const derivedUnlocked = Math.max(savedUnlocked, milestoneUnlocked);
    const maxScore = LEVELS.reduce((sum, level) => sum + level.points + 25, 0);
    const score = Number.isFinite(candidate.score) && candidate.score >= 0
      ? Math.min(maxScore, Math.floor(candidate.score))
      : Object.values(scores).reduce((sum, value) => sum + value, 0);
    const currentLevelId = Number.isInteger(candidate.currentLevelId) && candidate.currentLevelId >= 1 && candidate.currentLevelId <= maxLevel
      ? candidate.currentLevelId
      : derivedUnlocked;
    return {
      highestUnlocked: derivedUnlocked,
      currentLevelId,
      completedLevels: completed,
      skippedLevels: skipped,
      levelScores: scores,
      hintedLevels: hinted,
      hintsUsed: Number.isInteger(candidate.hintsUsed) && candidate.hintsUsed >= 0 ? candidate.hintsUsed : 0,
      skipsUsed: Number.isInteger(candidate.skipsUsed) && candidate.skipsUsed >= 0 ? candidate.skipsUsed : 0,
      attemptsByLevel: attempts,
      attemptsTotal: Number.isInteger(candidate.attemptsTotal) && candidate.attemptsTotal >= 0 ? candidate.attemptsTotal : Object.values(attempts).reduce((sum, value) => sum + value, 0),
      score,
      bestScore: Math.max(score, Number.isFinite(candidate.bestScore) && candidate.bestScore >= 0 ? Math.min(maxScore, Math.floor(candidate.bestScore)) : 0),
      soundEnabled: candidate.soundEnabled === true,
      startedAt: Number.isFinite(candidate.startedAt) && candidate.startedAt > 0 ? candidate.startedAt : null,
      finishedAt: Number.isFinite(candidate.finishedAt) && candidate.finishedAt > 0 ? candidate.finishedAt : null
    };
  }

  function migrateSave(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
      return { valid: false, migrated: false, state: createInitialState() };
    }
    if (parsed.version === SAVE_VERSION || parsed.version === 2) {
      return { valid: true, migrated: parsed.version !== SAVE_VERSION, state: sanitizeState(parsed.data) };
    }
    if (parsed.version === 1) {
      const oldData = parsed.data;
      const legacy = Object.assign({}, oldData, {
        highestUnlocked: Number.isInteger(oldData.highestUnlocked) ? Math.min(LEGACY_LEVEL_COUNT, oldData.highestUnlocked) : 1,
        completedLevels: Array.isArray(oldData.completedLevels) ? oldData.completedLevels.filter(id => Number.isInteger(id) && id >= 1 && id <= LEGACY_LEVEL_COUNT) : [],
        skippedLevels: Array.isArray(oldData.skippedLevels) ? oldData.skippedLevels.filter(id => Number.isInteger(id) && id >= 1 && id <= LEGACY_LEVEL_COUNT) : [],
        hintedLevels: Array.isArray(oldData.hintedLevels) ? oldData.hintedLevels.filter(id => Number.isInteger(id) && id >= 1 && id <= LEGACY_LEVEL_COUNT) : [],
        currentLevelId: Number.isInteger(oldData.currentLevelId)
          ? Math.min(LEGACY_LEVEL_COUNT, Math.max(1, oldData.currentLevelId))
          : Number.isInteger(oldData.highestUnlocked) ? Math.min(LEGACY_LEVEL_COUNT, Math.max(1, oldData.highestUnlocked)) : 1
      });
      if (legacy.attemptsByLevel && typeof legacy.attemptsByLevel === "object") {
        legacy.attemptsByLevel = Object.fromEntries(Object.entries(legacy.attemptsByLevel)
          .filter(([id, count]) => Number(id) >= 1 && Number(id) <= LEGACY_LEVEL_COUNT && Number.isInteger(count) && count >= 0));
      }
      if (legacy.levelScores && typeof legacy.levelScores === "object") {
        legacy.levelScores = Object.fromEntries(Object.entries(legacy.levelScores)
          .filter(([id, score]) => Number(id) >= 1 && Number(id) <= LEGACY_LEVEL_COUNT && Number.isFinite(score) && score >= 0));
      }
      return { valid: true, migrated: true, state: sanitizeState(legacy) };
    }
    return { valid: false, migrated: false, state: createInitialState() };
  }

  function validateCatalog(levels) {
    const problems = [];
    if (!Array.isArray(levels) || levels.length !== DIFFICULTIES.length) problems.push(`Catalog must contain exactly ${DIFFICULTIES.length} levels.`);
    const seenIds = new Set();
    const seenTitles = new Set();
    (Array.isArray(levels) ? levels : []).forEach((level, index) => {
      const expectedId = index + 1;
      if (!level || level.id !== expectedId || seenIds.has(level.id)) problems.push(`Level ${expectedId} has a missing, duplicate, or out-of-order ID.`);
      if (level) {
        seenIds.add(level.id);
        if (level.difficulty !== DIFFICULTIES[index]) problems.push(`Level ${expectedId} difficulty is out of sequence.`);
        if (!level.title || seenTitles.has(normalizeText(level.title))) problems.push(`Level ${expectedId} has a missing or duplicate title.`);
        if (!level.question || /placeholder|coming soon|todo/i.test(level.question)) problems.push(`Level ${expectedId} has a missing or placeholder question.`);
        if (!level.questionId) problems.push(`Level ${expectedId} has no source question ID.`);
        seenTitles.add(normalizeText(level.title || ""));
        for (const field of ["category", "instructions", "hint", "explanation", "successMessage", "failureMessage"]) {
          if (!level[field]) problems.push(`Level ${expectedId} is missing ${field}.`);
        }
        if (level.points !== BASE_POINTS[level.difficulty]) problems.push(`Level ${expectedId} has invalid scoring.`);
        if (!["multiple-choice", "text", "grid", "order", "memory", "runaway"].includes(level.type)) problems.push(`Level ${expectedId} has an unsupported challenge type.`);
        if (["multiple-choice", "text", "runaway"].includes(level.type) && (level.answer == null || (Array.isArray(level.answer) && !level.answer.length))) problems.push(`Level ${expectedId} has no valid answer.`);
        if (level.type === "multiple-choice") {
          const sameAnswer = option => level.caseSensitive
            ? option === level.answer
            : normalizeText(option) === normalizeText(level.answer);
          if (!Array.isArray(level.options) || !level.options.length || !level.options.some(sameAnswer)) problems.push(`Level ${expectedId} has no matching multiple-choice option.`);
          if (level.caseSensitive && Array.isArray(level.options) && new Set(level.options).size !== level.options.length) problems.push(`Level ${expectedId} has duplicate case-sensitive choices.`);
        }
        if (["grid", "order", "memory"].includes(level.type)) {
          if (!Array.isArray(level.objects) || !Array.isArray(level.answer) || !level.answer.length) problems.push(`Level ${expectedId} has invalid interactive data.`);
          else if (level.objects.some(object => !object || !object.label || !object.icon)) problems.push(`Level ${expectedId} has an interactive object missing its label or icon.`);
          else if (level.answer.some(value => !Number.isInteger(value) || value < 0 || value >= level.objects.length)) problems.push(`Level ${expectedId} references an invalid object index.`);
        }
        if (level.type === "runaway" && (typeof level.answer !== "string" || !level.answer.trim())) problems.push(`Level ${expectedId} has no valid runaway button label.`);
      }
    });
    return { valid: problems.length === 0, problems };
  }

  function validateQuestionBank(questions) {
    const problems = [];
    const ids = new Set();
    const texts = new Set();
    if (!Array.isArray(questions) || !questions.length) return { valid: false, problems: ["Question bank is empty or invalid."] };
    for (const question of questions) {
      if (!question || typeof question !== "object") {
        problems.push("Question bank contains an invalid entry.");
        continue;
      }
      if (!question.id || ids.has(question.id)) problems.push(`Question has a missing or duplicate ID: ${question.id || "(missing)"}.`);
      ids.add(question.id);
      if (!CATEGORIES.includes(question.categoryId)) problems.push(`${question.id} has an invalid category.`);
      if (!["easy", "medium", "hard"].includes(question.difficulty)) problems.push(`${question.id} has an invalid difficulty.`);
      if (!question.topic || !question.question || !question.hint || !question.explanation || question.explanation.length < 12) problems.push(`${question.id} is missing required question content.`);
      if (/placeholder|coming soon|todo/i.test(question.question || "")) problems.push(`${question.id} contains placeholder text.`);
      const normalized = normalizeText(question.question || "");
      if (texts.has(normalized)) problems.push(`${question.id} duplicates another bank question.`);
      texts.add(normalized);
      if (!Number.isInteger(question.points) || question.points !== BASE_POINTS[question.difficulty]) problems.push(`${question.id} has invalid scoring.`);
      if (question.type === "multiple-choice") {
        const choices = question.options || [];
        const matching = choices.filter(option => question.caseSensitive
          ? String(option) === String(question.answer)
          : normalizeText(option) === normalizeText(question.answer));
        if (choices.length < 2 || matching.length !== 1) problems.push(`${question.id} has inconsistent multiple-choice answers.`);
      } else if (!["text", "grid", "order", "memory", "runaway"].includes(question.type)) {
        problems.push(`${question.id} has an unsupported question type.`);
      }
      if (question.answer == null || (Array.isArray(question.answer) && !question.answer.length)) problems.push(`${question.id} has no answer.`);
    }
    for (const category of CATEGORIES) {
      if (!questions.some(question => question && question.categoryId === category)) problems.push(`Question bank has no ${category} questions.`);
    }
    return { valid: problems.length === 0, problems };
  }

  function openLevel(state, id) {
    return Number.isInteger(id) && id >= 1 && id <= TOTAL_LEVELS && id <= state.highestUnlocked;
  }

  function unlockAfter(state, id) {
    return Object.assign({}, state, { highestUnlocked: Math.min(TOTAL_LEVELS, Math.max(state.highestUnlocked, id + 1)) });
  }

  function useHint(state, id) {
    if (state.hintedLevels.includes(id)) {
      return {
        state: Object.assign({}, state, { hintsUsed: state.hintsUsed + 1 }),
        charged: false
      };
    }
    const updated = Object.assign({}, state, {
      hintedLevels: [...state.hintedLevels, id],
      hintsUsed: state.hintsUsed + 1,
      score: Math.max(0, state.score - 25)
    });
    return { state: updated, charged: true };
  }

  function skipLevel(state, id) {
    if (state.completedLevels.includes(id)) return { state, charged: false };
    const alreadySkipped = state.skippedLevels.includes(id);
    const next = Object.assign({}, state, {
      skippedLevels: alreadySkipped ? state.skippedLevels : [...state.skippedLevels, id],
      skipsUsed: state.skipsUsed + 1,
      score: alreadySkipped ? state.score : Math.max(0, state.score - 50),
      highestUnlocked: Math.min(TOTAL_LEVELS, Math.max(state.highestUnlocked, id + 1)),
      currentLevelId: Math.min(TOTAL_LEVELS, id + 1)
    });
    return { state: next, charged: !alreadySkipped };
  }

  function recordAttempt(state, id) {
    return Object.assign({}, state, {
      attemptsByLevel: Object.assign({}, state.attemptsByLevel, { [id]: (state.attemptsByLevel[id] || 0) + 1 }),
      attemptsTotal: state.attemptsTotal + 1
    });
  }

  function completeLevel(state, level) {
    if (state.completedLevels.includes(level.id)) {
      return { state: unlockAfter(state, level.id), awarded: 0, alreadyCompleted: true };
    }
    const award = Math.max(0, level.points + (state.hintedLevels.includes(level.id) ? 0 : 25));
    const scores = Object.assign({}, state.levelScores, { [level.id]: award });
    const completedLevels = [...state.completedLevels, level.id].sort((a, b) => a - b);
    const score = Math.max(0, state.score + award);
    const updated = unlockAfter(Object.assign({}, state, {
      completedLevels,
      levelScores: scores,
      score,
      bestScore: Math.max(state.bestScore, score),
      currentLevelId: Math.min(TOTAL_LEVELS, level.id + 1),
      finishedAt: level.id === TOTAL_LEVELS && completedLevels.length === TOTAL_LEVELS ? Date.now() : state.finishedAt
    }), level.id);
    return { state: updated, awarded: award, alreadyCompleted: false };
  }

  function getLevelStatus(state, id) {
    if (state.completedLevels.includes(id)) return "completed";
    if (state.skippedLevels.includes(id)) return "skipped";
    if (id <= state.highestUnlocked) return "unlocked";
    return "locked";
  }

  return {
    BASE_POINTS, CATEGORIES, DIFFICULTIES, LEVELS, LEGACY_LEVEL_COUNT, QUESTION_BANK, SAVE_KEY, SAVE_VERSION, TOTAL_LEVELS,
    completeLevel, createInitialState, getLevelStatus, migrateSave, normalizeText, openLevel,
    createQuestionSession, difficultyForLevel, recordAttempt, sanitizeState, shuffle, skipLevel,
    useHint, validateAnswer, validateCatalog, validateQuestionBank
  };
});
