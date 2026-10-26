"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../game-core.js");

const REQUIRED_SEQUENCE = [
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

test("catalog contains exactly 100 unique consecutive levels in both required difficulty ranges", () => {
  const report = core.validateCatalog(core.LEVELS);
  assert.deepEqual(report, { valid: true, problems: [] });
  assert.equal(core.TOTAL_LEVELS, 100);
  assert.equal(core.LEVELS.length, 100);
  assert.deepEqual(core.LEVELS.map(level => level.id), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.deepEqual(core.DIFFICULTIES, REQUIRED_SEQUENCE);
  assert.deepEqual(core.LEVELS.map(level => level.difficulty), REQUIRED_SEQUENCE);
  assert.equal(new Set(core.LEVELS.map(level => level.title)).size, 100);
  assert.equal(new Set(core.LEVELS.map(level => level.question)).size, 100);
  assert.equal(core.LEVELS[99].finalBoss, true);
});

test("question categories cover all requested puzzle styles", () => {
  const requiredCategories = [
    "brainless", "common-sense", "riddle", "tricky-multiple-choice", "misleading-instruction",
    "reverse-psychology", "funny-math", "odd-one-out", "visual-observation", "pattern-recognition",
    "unexpected-answer", "wordplay", "silly-situation", "button-challenge", "emoji-puzzle",
    "memory", "follow-instructions", "impossible-sounding", "obvious-hidden", "harmless-prank",
    "sequence", "multi-step", "find-difference", "funny-logic", "mini-game"
  ];
  assert.deepEqual([...new Set(core.LEVELS.map(level => level.category))].sort(), requiredCategories.sort());
});

test("all supported puzzle types appear and every level accepts its solution but rejects a wrong one", () => {
  const types = new Set(core.LEVELS.map(level => level.type));
  for (const type of ["multiple-choice", "text", "grid", "order", "memory", "runaway"]) assert.ok(types.has(type), `${type} must be represented`);
  for (const level of core.LEVELS) {
    const intended = level.type === "text" && Array.isArray(level.answer) ? level.answer[0] : level.answer;
    assert.equal(core.validateAnswer(level, intended), true, `Level ${level.id} must accept its intended solution`);
    const wrong = level.type === "grid"
      ? []
      : ["order", "memory"].includes(level.type)
        ? [...level.answer].reverse()
        : "__not_the_answer__";
    assert.equal(core.validateAnswer(level, wrong), false, `Level ${level.id} must reject an incorrect solution`);
  }
});

test("each multiple-choice puzzle has one valid displayed answer and rejects its other options", () => {
  for (const level of core.LEVELS.filter(item => item.type === "multiple-choice")) {
    const matchingOptions = level.options.filter(option => level.caseSensitive
      ? option === level.answer
      : core.normalizeText(option) === core.normalizeText(level.answer));
    assert.equal(matchingOptions.length, 1, `Level ${level.id} must have exactly one correct option`);
    for (const option of level.options) {
      if (option !== matchingOptions[0]) {
        assert.equal(core.validateAnswer(level, option), false, `Level ${level.id} must reject ${option}`);
      }
    }
  }
});

test("grid validation requires exactly the intended unique selection", () => {
  const level = core.LEVELS.find(item => item.type === "grid" && item.answer.length > 1);
  const correct = [...level.answer];
  assert.equal(core.validateAnswer(level, [...correct].reverse()), true);
  assert.equal(core.validateAnswer(level, [...correct, correct[0]]), true);
  assert.equal(core.validateAnswer(level, correct.slice(1)), false);
  assert.equal(core.validateAnswer(level, [...correct, 99]), false);
});

test("locked levels remain inaccessible until completion or skip unlocks the next one", () => {
  let state = core.createInitialState();
  assert.equal(core.openLevel(state, 1), true);
  assert.equal(core.openLevel(state, 2), false);
  assert.equal(core.openLevel(state, 101), false);
  state = core.completeLevel(state, core.LEVELS[0]).state;
  assert.equal(state.highestUnlocked, 2);
  assert.equal(core.getLevelStatus(state, 1), "completed");
  assert.equal(core.openLevel(state, 2), true);
  assert.equal(core.openLevel(state, 3), false);
});

test("hints and skips are charged at most once per level and scores cannot become negative", () => {
  let state = core.createInitialState();
  const firstHint = core.useHint(state, 1);
  assert.equal(firstHint.charged, true);
  state = firstHint.state;
  assert.equal(state.score, 0);
  const repeatedHint = core.useHint(state, 1);
  assert.equal(repeatedHint.charged, false);
  assert.equal(repeatedHint.state.hintsUsed, 2);
  state = repeatedHint.state;
  const firstSkip = core.skipLevel(state, 1);
  assert.equal(firstSkip.charged, true);
  state = firstSkip.state;
  assert.equal(state.score, 0);
  const repeatedSkip = core.skipLevel(state, 1);
  assert.equal(repeatedSkip.charged, false);
  assert.equal(repeatedSkip.state.skipsUsed, 2);
  assert.equal(repeatedSkip.state.highestUnlocked, 2);
  assert.equal(core.getLevelStatus(repeatedSkip.state, 1), "skipped");
});

test("solved levels cannot be changed to skipped and replaying does not award duplicate points", () => {
  let state = core.completeLevel(core.createInitialState(), core.LEVELS[0]).state;
  assert.equal(state.score, 125);
  const skipped = core.skipLevel(state, 1);
  assert.equal(skipped.charged, false);
  assert.equal(skipped.state.skippedLevels.includes(1), false);
  const replay = core.completeLevel(state, core.LEVELS[0]);
  assert.equal(replay.awarded, 0);
  assert.equal(replay.state.score, 125);
});

test("difficulty scoring, hint penalty, and no-hint bonus are applied consistently", () => {
  let state = Object.assign(core.createInitialState(), { score: 400 });
  state = core.useHint(state, 2).state;
  const hinted = core.completeLevel(state, core.LEVELS[1]);
  assert.equal(hinted.awarded, 300);
  assert.equal(hinted.state.score, 675);
  assert.equal(core.completeLevel(core.createInitialState(), core.LEVELS[50]).awarded, 325);
  assert.equal(core.completeLevel(core.createInitialState(), core.LEVELS[51]).awarded, 225);
});

test("version 1 saves migrate all valid 50-level progress without completing new levels", () => {
  const old = {
    version: 1,
    data: {
      highestUnlocked: 50,
      completedLevels: [1, 2, 50, 51, 100],
      skippedLevels: [3],
      levelScores: { 1: 125, 2: 325, 50: 325, 51: 9999 },
      hintedLevels: [2],
      hintsUsed: 4,
      skipsUsed: 1,
      attemptsByLevel: { 1: 2, 50: 5, 51: 9 },
      attemptsTotal: 7,
      score: 700,
      bestScore: 900,
      soundEnabled: true
    }
  };
  const migration = core.migrateSave(old);
  assert.equal(migration.valid, true);
  assert.equal(migration.migrated, true);
  assert.equal(migration.state.highestUnlocked, 51);
  assert.equal(migration.state.currentLevelId, 50);
  assert.deepEqual(migration.state.completedLevels, [1, 2, 50]);
  assert.deepEqual(migration.state.skippedLevels, [3]);
  assert.deepEqual(migration.state.levelScores, { 1: 125, 2: 325, 50: 325 });
  assert.deepEqual(migration.state.attemptsByLevel, { 1: 2, 50: 5 });
  assert.equal(migration.state.attemptsTotal, 7);
  assert.equal(migration.state.score, 700);
  assert.equal(migration.state.bestScore, 900);
  assert.equal(migration.state.soundEnabled, true);
  assert.equal(migration.state.completedLevels.some(id => id > 50), false);
});

test("malformed and unsupported saves return a safe fresh state without claiming migration", () => {
  assert.equal(core.migrateSave(null).valid, false);
  assert.equal(core.migrateSave({ version: 999, data: {} }).valid, false);
  assert.deepEqual(core.sanitizeState(null), core.createInitialState());
  const sanitized = core.sanitizeState({
    highestUnlocked: 1000,
    currentLevelId: 1000,
    completedLevels: [1, 1, 101, "2"],
    skippedLevels: [4],
    hintedLevels: ["4", 4],
    score: 1e12,
    bestScore: 1e12,
    attemptsByLevel: { 1: -2, 2: 3, 101: 50 },
    attemptsTotal: -1,
    soundEnabled: "true"
  });
  assert.equal(sanitized.highestUnlocked, 5);
  assert.equal(sanitized.currentLevelId, 5);
  assert.deepEqual(sanitized.completedLevels, [1]);
  assert.deepEqual(sanitized.skippedLevels, [4]);
  assert.deepEqual(sanitized.hintedLevels, [4]);
  assert.equal(sanitized.score, core.LEVELS.reduce((sum, level) => sum + level.points + 25, 0));
  assert.equal(sanitized.bestScore, sanitized.score);
  assert.deepEqual(sanitized.attemptsByLevel, { 2: 3 });
  assert.equal(sanitized.attemptsTotal, 3);
  assert.equal(sanitized.soundEnabled, false);
});

test("level 100 records completion time only after all 100 levels are solved", () => {
  let state = core.sanitizeState({
    highestUnlocked: 100,
    completedLevels: Array.from({ length: 99 }, (_, index) => index + 1),
    startedAt: Date.now() - 1000
  });
  const result = core.completeLevel(state, core.LEVELS[99]);
  assert.equal(result.state.completedLevels.length, 100);
  assert.equal(result.state.highestUnlocked, 100);
  assert.equal(result.state.completedLevels.includes(100), true);
  assert.ok(result.state.finishedAt >= result.state.startedAt);
  state = core.sanitizeState({ highestUnlocked: 100, skippedLevels: Array.from({ length: 99 }, (_, index) => index + 1) });
  assert.equal(core.completeLevel(state, core.LEVELS[99]).state.finishedAt, null);
});
