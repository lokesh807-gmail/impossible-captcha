(function (root, factory) {
  const levelData = typeof module === "object" && module.exports ? require("./level-data.js") : root && root.LevelData;
  const api = factory(levelData);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (levelData) {
  "use strict";

  const DIFFICULTIES = [
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
  const BASE_POINTS = { easy: 100, medium: 200, hard: 300 };
  const SAVE_KEY = "impossible-captcha-save";
  const SAVE_VERSION = 2;
  const LEGACY_LEVEL_COUNT = 50;

  const LEVELS = (levelData || []).map((level, index) => Object.assign({}, level, {
    difficulty: DIFFICULTIES[index],
    points: BASE_POINTS[DIFFICULTIES[index]]
  }));
  const TOTAL_LEVELS = LEVELS.length;

  function normalizeText(value) {
    return String(value == null ? "" : value).trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
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
    if (parsed.version === SAVE_VERSION) {
      return { valid: true, migrated: false, state: sanitizeState(parsed.data) };
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
    const seenQuestions = new Set();
    (Array.isArray(levels) ? levels : []).forEach((level, index) => {
      const expectedId = index + 1;
      if (!level || level.id !== expectedId || seenIds.has(level.id)) problems.push(`Level ${expectedId} has a missing, duplicate, or out-of-order ID.`);
      if (level) {
        seenIds.add(level.id);
        if (level.difficulty !== DIFFICULTIES[index]) problems.push(`Level ${expectedId} difficulty is out of sequence.`);
        if (!level.title || seenTitles.has(normalizeText(level.title))) problems.push(`Level ${expectedId} has a missing or duplicate title.`);
        if (!level.question || /placeholder|coming soon|todo/i.test(level.question) || seenQuestions.has(normalizeText(level.question))) problems.push(`Level ${expectedId} has a missing, placeholder, or duplicate question.`);
        seenTitles.add(normalizeText(level.title || ""));
        seenQuestions.add(normalizeText(level.question || ""));
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
    BASE_POINTS, DIFFICULTIES, LEVELS, LEGACY_LEVEL_COUNT, SAVE_KEY, SAVE_VERSION, TOTAL_LEVELS,
    completeLevel, createInitialState, getLevelStatus, migrateSave, normalizeText, openLevel,
    recordAttempt, sanitizeState, skipLevel, useHint, validateAnswer, validateCatalog
  };
});
