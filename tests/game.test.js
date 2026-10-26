"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

test("campaign contains exactly 1000 consecutive levels and preserves the original first-100 difficulty sequence", () => {
  const report = core.validateCatalog(core.LEVELS);
  assert.deepEqual(report, { valid: true, problems: [] });
  assert.equal(core.TOTAL_LEVELS, 1000);
  assert.equal(core.LEVELS.length, 1000);
  assert.deepEqual(core.LEVELS.map(level => level.id), Array.from({ length: 1000 }, (_, index) => index + 1));
  assert.deepEqual(core.DIFFICULTIES.slice(0, 100), REQUIRED_SEQUENCE);
  assert.deepEqual(core.LEVELS.slice(0, 100).map(level => level.difficulty), REQUIRED_SEQUENCE);
  assert.equal(new Set(core.LEVELS.map(level => level.title)).size, 1000);
  assert.equal(core.QUESTION_BANK.length, 80);
  assert.equal(new Set(core.QUESTION_BANK.map(question => question.id)).size, 80);
  assert.equal(new Set(core.QUESTION_BANK.map(question => question.question)).size, 80);
  assert.equal(core.LEVELS[999].finalBoss, true);
  assert.equal(core.LEVELS[999].id, 1000);
  assert.equal(core.LEVELS.some(level => level.id === 1001), false);
});

test("question bank has unique validated questions in all four categories", () => {
  assert.deepEqual(core.validateQuestionBank(core.QUESTION_BANK), { valid: true, problems: [] });
  assert.deepEqual(Object.fromEntries(core.CATEGORIES.map(category => [
    category,
    core.QUESTION_BANK.filter(question => question.categoryId === category).length
  ])), {
    aptitude: 20,
    reasoning: 20,
    "verbal-ability": 20,
    "general-knowledge": 20
  });
  assert.deepEqual(core.CATEGORIES, ["aptitude", "reasoning", "verbal-ability", "general-knowledge"]);
  assert.ok(core.QUESTION_BANK.every(question => question.sourceType === "newly-authored" && question.sourcePage === null));
  assert.ok(core.QUESTION_BANK.every(question => question.sourceTopic && question.solution));
  assert.ok(core.QUESTION_BANK.filter(question => question.categoryId === "aptitude" && question.formula).length >= 10);
  const verbal = core.QUESTION_BANK.filter(question => question.categoryId === "verbal-ability");
  assert.equal(verbal.length, 20);
  assert.ok(verbal.some(question => question.passage && question.topic === "Reading comprehension"));
  assert.ok(verbal.every(question => question.options.length === 4));
  assert.ok(core.LEVELS.slice(0, 100).every(level => level.categoryId === "reasoning"));
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

test("version 2 campaign saves upgrade without discarding existing progress", () => {
  const migration = core.migrateSave({
    version: 2,
    data: { highestUnlocked: 100, currentLevelId: 100, completedLevels: [1, 99], score: 500, bestScore: 700 }
  });
  assert.equal(migration.valid, true);
  assert.equal(migration.migrated, true);
  assert.equal(migration.state.highestUnlocked, 100);
  assert.deepEqual(migration.state.completedLevels, [1, 99]);
  assert.equal(migration.state.score, 500);
});

function seededCrypto(seed) {
  let value = seed >>> 0;
  return {
    getRandomValues(values) {
      for (let index = 0; index < values.length; index += 1) {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        values[index] = value;
      }
      return values;
    }
  };
}

test("randomized sessions use unique IDs, avoid recent questions, and vary between seeds", () => {
  const first = core.createQuestionSession(core.QUESTION_BANK, {
    mode: "quick", category: "aptitude", count: 10, crypto: seededCrypto(31)
  });
  const second = core.createQuestionSession(core.QUESTION_BANK, {
    mode: "quick", category: "aptitude", count: 10, crypto: seededCrypto(99)
  });
  assert.equal(first.questions.length, 10);
  assert.equal(new Set(first.questionIds).size, first.questionIds.length);
  assert.notDeepEqual(first.questionIds, second.questionIds);
  assert.ok(first.questions.every(question => question.categoryId === "aptitude"));
  assert.ok(first.questions.every(question => question.options.some(option => core.validateAnswer(question, option))));

  const allAptitudeIds = core.QUESTION_BANK.filter(question => question.categoryId === "aptitude").map(question => question.id);
  const recentlySeen = allAptitudeIds.slice(0, -3);
  const unseen = core.createQuestionSession(core.QUESTION_BANK, {
    mode: "quick",
    category: "aptitude",
    count: 10,
    recentQuestionIds: recentlySeen,
    crypto: seededCrypto(5)
  });
  assert.equal(unseen.questions.length, 10);
  assert.ok(allAptitudeIds.slice(-3).every(id => unseen.questionIds.includes(id)));
  assert.equal(new Set(unseen.questionIds).size, 10);
});

test("daily sessions are stable for the same date and mixed challenge draws from every category", () => {
  const dailyOptions = { mode: "daily", category: "mixed", count: 10, date: "2026-10-26" };
  const firstDaily = core.createQuestionSession(core.QUESTION_BANK, dailyOptions);
  const secondDaily = core.createQuestionSession(core.QUESTION_BANK, dailyOptions);
  assert.deepEqual(firstDaily.questionIds, secondDaily.questionIds);

  const mixed = core.createQuestionSession(core.QUESTION_BANK, {
    mode: "mixed", category: "mixed", count: 25, crypto: seededCrypto(123)
  });
  assert.deepEqual(new Set(mixed.questions.map(question => question.categoryId)), new Set(core.CATEGORIES));
  assert.equal(mixed.questionIds.length, 25);
  const categoryCounts = core.CATEGORIES.map(category => mixed.questions.filter(question => question.categoryId === category).length);
  assert.ok(Math.max(...categoryCounts) - Math.min(...categoryCounts) <= 1);
});

test("endless practice includes the complete category pool, unseen first, without duplicates", () => {
  const aptitude = core.QUESTION_BANK.filter(question => question.categoryId === "aptitude");
  const session = core.createQuestionSession(core.QUESTION_BANK, {
    mode: "endless",
    category: "aptitude",
    recentQuestionIds: aptitude.slice(0, 8).map(question => question.id),
    crypto: seededCrypto(73)
  });
  assert.equal(session.questions.length, aptitude.length);
  assert.equal(new Set(session.questionIds).size, aptitude.length);
  assert.ok(aptitude.slice(8).every(question => session.questionIds.includes(question.id)));
});

test("static GitHub Pages asset references resolve from the repository root", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(html, /Tricky Questions|value="tricky"/i);
  const categoryValues = [...html.matchAll(/name="category" value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(categoryValues, ["aptitude", "reasoning", "verbal-ability", "general-knowledge"]);
  assert.match(html, /option value="mixed"/);
  for (const asset of ["style.css", "level-data.js", "question-bank.js", "game-core.js", "script.js"]) {
    assert.ok(html.includes(`./${asset}`), `${asset} should be referenced relatively`);
    assert.ok(fs.existsSync(path.join(root, asset)), `${asset} should exist at the site root`);
  }
  assert.equal(fs.existsSync(path.join(root, ".env")), false);
});

test("malformed and unsupported saves return a safe fresh state", () => {
  assert.equal(core.migrateSave(null).valid, false);
  assert.equal(core.migrateSave({ version: 999, data: {} }).valid, false);
  assert.deepEqual(core.sanitizeState(null), core.createInitialState());
  const sanitized = core.sanitizeState({
    highestUnlocked: 1000,
    currentLevelId: 1000,
    completedLevels: [1, 1, 1001, "2"],
    skippedLevels: [4],
    hintedLevels: ["4", 4],
    score: 1e12,
    bestScore: 1e12,
    attemptsByLevel: { 1: -2, 2: 3, 1001: 50 },
    attemptsTotal: -1,
    soundEnabled: "true"
  });
  assert.equal(sanitized.highestUnlocked, 1000);
  assert.equal(sanitized.currentLevelId, 1000);
  assert.deepEqual(sanitized.completedLevels, [1]);
  assert.deepEqual(sanitized.skippedLevels, [4]);
  assert.deepEqual(sanitized.hintedLevels, [4]);
  assert.equal(sanitized.score, core.LEVELS.reduce((sum, level) => sum + level.points + 25, 0));
  assert.equal(sanitized.bestScore, sanitized.score);
  assert.deepEqual(sanitized.attemptsByLevel, { 2: 3 });
  assert.equal(sanitized.attemptsTotal, 3);
  assert.equal(sanitized.soundEnabled, false);
});

test("level 1000 records completion time only after every campaign level is solved", () => {
  let state = core.sanitizeState({
    highestUnlocked: 1000,
    completedLevels: Array.from({ length: 999 }, (_, index) => index + 1),
    startedAt: Date.now() - 1000
  });
  const result = core.completeLevel(state, core.LEVELS[999]);
  assert.equal(result.state.completedLevels.length, 1000);
  assert.equal(result.state.highestUnlocked, 1000);
  assert.equal(result.state.completedLevels.includes(1000), true);
  assert.ok(result.state.finishedAt >= result.state.startedAt);
  state = core.sanitizeState({ highestUnlocked: 1000, skippedLevels: Array.from({ length: 999 }, (_, index) => index + 1) });
  assert.equal(core.completeLevel(state, core.LEVELS[999]).state.finishedAt, null);
});
