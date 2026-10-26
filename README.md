# Impossible CAPTCHA — 1,000 Levels of Brain Confusion

A fictional, harmless puzzle game built with static HTML, CSS, and vanilla JavaScript. It is not a real CAPTCHA or security check and does not inspect your device.

## What is included

- A 1,000-level progressive campaign with a paginated level map, difficulty badges, score, hints, skips, retries, saved progress, and a final victory screen.
- Practice categories for Aptitude, Reasoning (including Date and Time and Family Relations), Verbal Ability, General Knowledge, and Puzzle Solving, plus Mixed Practice.
- Quick Play (10), Challenge (25), Endless Practice, Daily Challenge, and Custom Practice.
- Multiple-choice, typed, object-selection, ordered-click, memory, and moving-button puzzles.
- Local randomized sessions, recent-question avoidance, progress restoration, and a responsive dark thriller theme.
- No framework, build step, backend, paid service, API key, or external runtime dependency.

## Actual question counts

The validated practice bank contains **200 unique, newly authored questions**:

| Category | Unique questions |
| --- | ---: |
| Aptitude | 40 |
| Reasoning | 50 |
| Verbal Ability | 40 |
| General Knowledge | 40 |
| Puzzle Solving | 30 |
| **Total** | **200** |

The campaign has exactly 1,000 numbered levels. Its difficulty progression, save state, score, hints, skips, retries, map, and victory state remain intact. Campaign questions now come from the exam-oriented bank; it cycles through the 200 unique questions and does not claim that 1,000 different questions are present. Practice sessions never repeat an ID within a session.

Mixed Practice has 200 eligible questions across all difficulties, so it can start any supported session size from 100 through 200 in 10-question increments. Requests above the eligible pool after applying filters are rejected with the matching unique-question count; they are never filled with duplicates. A single category or topic may contain fewer than 100 questions.

### Reference PDF status

`LogicWhile Aptitude and Reasoning Material.pdf` was not present in the repository or the files available to this development environment. No question currently claims to come from that document: all 200 questions are marked `newly-authored`, with a null PDF page reference. To enable a PDF-grounded update, place the document at `references/LogicWhile Aptitude and Reasoning Material.pdf` in the project or provide extracted text with its verified page numbers and topic headings. The material can then be reviewed and converted into original, independently checked questions without copying long passages verbatim.

## Categories and modes

- **Aptitude:** percentages, profit and loss, ratios, averages, simple and compound interest, work, speed, probability, combinations, and arithmetic.
- **Reasoning:** number/alphabet sequences, analogies, codes, directions, syllogisms, ranking, patterns, deduction, calendar reasoning, clock angles, and family relations.
- **Verbal Ability:** grammar, parts of speech, tenses, agreement, sentence correction, vocabulary, idioms, voice, reported speech, cloze, sentence ordering, and reading comprehension.
- **General Knowledge:** static facts about Indian history and polity, geography, science, space, the environment, books, organizations, and computing. Current affairs are not included: the static site has no verified live feed or update process.
- **Puzzle Solving:** original number, missing-number, pattern, arrangement, constraint, and multi-step deduction puzzles.

Select one or more categories on the **Question modes** screen, or select Mixed Practice to include all categories. Custom Practice filters by difficulty and topic, supports timed or untimed play, optional question shuffling and explanation display, and accepts question counts from 100 to 200 in steps of 10. The available-pool message updates as filters change; the 200-question mixed bank supports every valid session count. No questions are repeated to meet a count.

## Randomization and daily sets

New practice sessions use Fisher–Yates shuffling and `crypto.getRandomValues()` where the browser supports it, with a `Math.random()` fallback. The selection avoids IDs in the current browser's recent-question list when unseen questions are available. A fresh session has a new session ID; question and option order are randomized. Questions do not repeat within one session.

Different browsers generally produce different sequences, but two people can still receive the same questions. GitHub Pages is static hosting: it cannot coordinate visitors or guarantee global uniqueness without a server or shared database. The game does not fingerprint visitors or track them across devices.

Daily Challenge selects deterministically using the device's local calendar date and the current selection algorithm. It is stable for a given date and browser version, but users in different time zones may have different local dates. There is no live news feed.

## Progress and privacy

Campaign progress uses the `impossible-captcha-save` localStorage key. Practice progress and recent question IDs use separate versioned local keys. The active practice session resumes after refresh, including its question order and timed-question deadline; a paused practice session can be resumed from the mode screen. The campaign save migrates existing version-1 (50-level) and version-2 (100-level) progress.

Browser storage belongs to that browser and may be cleared by the user. It is not synced to other devices, secure against manual editing, or sent to a server. **Restart all progress** on the level map asks for confirmation and clears campaign and practice history while preserving the sound preference.

## Project files

- `index.html` — screens, category controls, and relative asset references.
- `style.css` — theme, responsive layout, focus styles, and reduced-motion support.
- `question-bank.js` — structured Aptitude, Reasoning, Verbal Ability, General Knowledge, and Puzzle Solving questions, with solution and source metadata.
- `game-core.js` — 1,000-level campaign, question validation, random sessions, scoring, and save migration.
- `script.js` — UI, campaign and practice game flow, and localStorage integration.
- `tests/game.test.js` — Node's built-in automated test suite.
- `.nojekyll` — root publishing support for GitHub Pages.
- `netlify.toml` — retained static-hosting configuration; GitHub Pages does not use it.

## Add questions

Add new records to `question-bank.js` using the existing question fields: unique `id`, `categoryId`, `category`, `difficulty`, `topic`, `title`, `question`, `type`, `options` (for multiple choice), `answer`, `instructions`, `hint`, `explanation`, `solution`, `formula` where relevant, `sourceType`, `sourceTopic`, `sourcePage`, success/failure text, and difficulty-based `points`. Mark original questions as `newly-authored` with `sourcePage: null`; use `pdf-derived` only when the source content and positive page number have been verified. Mark static General Knowledge with `knowledgeType: "static"`; do not add time-sensitive questions without a dated, verified source and an update process.

Use new IDs and original questions. Make sure exactly one multiple-choice option matches the answer (respecting `caseSensitive` where needed). Avoid unsupported current-affairs claims. The runtime and tests validate required fields, category/difficulty values, duplicate IDs/questions, answers, and options.

## Run locally and test

1. Open the repository folder in VS Code.
2. Open `index.html` with the Live Server extension, or use any static HTTP server.
3. To run the automated tests, install Node.js if needed and run:

   ```sh
   node --test tests/game.test.js
   ```

No `npm install` or build command is needed. The test suite checks all 1,000 campaign IDs, the actual unique bank and category counts, question source metadata, answer validation, custom count/filter behavior, progression, scoring, migration, randomized sessions, recent-question filtering, mixed-category balance, daily determinism, and relative GitHub Pages assets.

## GitHub Pages deployment

The site files are in the repository root and all CSS/JavaScript references are relative, so the site works under a repository subpath. The repository has a `.nojekyll` file. No GitHub Actions deployment workflow is present, and `netlify.toml` is not a GitHub Pages workflow. Preserve the existing publishing configuration.

In GitHub, open **Settings → Pages** and check the selected source. If the site is branch-published, use **Deploy from a branch**, the intended branch, and `/(root)`. Do not change a working setting. Check the Pages status after pushing; this repository's files alone cannot verify the live setting or claim a deployment has completed.

### Publish an update from VS Code

The current checkout was inspected on branch `main` with an existing `origin` remote. Recheck before publishing:

```sh
git status
git branch --show-current
git remote -v
git diff
```

- `git status` shows changed, staged, and untracked files.
- `git branch --show-current` confirms the branch.
- `git remote -v` shows where push would send commits.
- `git diff` lets you review the changes before staging.

After reviewing for unrelated files or secrets, run:

```sh
git add .
git commit -m "Upgrade aptitude reasoning verbal and puzzles"
git push
```

`git add .` stages non-ignored changes, `git commit` records staged changes, and `git push` sends commits to the configured remote and branch. Never stage `.env` files, passwords, tokens, private keys, or other secrets. Saving locally does not publish the website. After the push, check **Actions** if the repository uses a workflow, or **Settings → Pages** for branch deployment, wait for success, then open the URL GitHub displays and try the new modes.

## Troubleshooting

- **A script or style is missing:** confirm `index.html`, `style.css`, `question-bank.js`, `game-core.js`, and `script.js` are in the repository root with exact filename capitalization.
- **Progress is not on another device:** localStorage is device- and browser-specific.
- **Saved practice does not load:** malformed or outdated practice data is ignored; start a new session. Campaign saves from prior releases are migrated where supported.
- **The requested custom count is unavailable:** inspect the displayed unique-question count, lower the request in valid 10-question steps (not below 100), clear a topic/difficulty filter, or choose more categories. The current total bank contains 200 questions.
- **The deployed page is old or missing:** verify the Pages source and branch, confirm the latest deployment succeeded, and hard-refresh after it finishes.
- **Push fails:** read the actual Git error and inspect `git status` and the configured remote. Do not use force push as a routine fix.
