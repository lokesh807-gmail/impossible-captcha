# Impossible CAPTCHA — 1,000 Levels of Brain Confusion

A fictional, harmless puzzle game built with static HTML, CSS, and vanilla JavaScript. It is not a real CAPTCHA or security check and does not inspect your device.

## What is included

- A 1,000-level progressive campaign with a paginated level map, difficulty badges, score, hints, skips, retries, saved progress, and a final victory screen.
- Question modes for Aptitude, Reasoning, General Knowledge, Tricky Questions, and Mixed Challenge.
- Quick Play (10), Challenge (25), Endless Practice, Daily Challenge, and Custom Practice.
- Multiple-choice, typed, object-selection, ordered-click, memory, and moving-button puzzles.
- Local randomized sessions, recent-question avoidance, progress restoration, and a responsive dark thriller theme.
- No framework, build step, backend, paid service, API key, or external runtime dependency.

## Actual question counts

The validated bank contains **160 unique authored questions**:

| Category | Unique questions |
| --- | ---: |
| Aptitude | 20 |
| Reasoning | 20 |
| General Knowledge | 20 |
| Tricky Questions | 100 |
| **Total** | **160** |

The campaign has exactly 1,000 numbered levels. Its first 100 preserve the original trick-question progression. Levels 101–1,000 cycle through the 160-question bank with distinct level numbers and “Echo” titles. This makes the 1,000-level campaign playable without claiming it contains 1,000 unique questions. Practice sessions select from the unique question bank and do not repeat an ID within a session.

The bank is deliberately smaller than the aspirational target of 250 per category. Add and validate more original questions before describing the bank as larger.

## Categories and modes

- **Aptitude:** percentages, profit and loss, ratios, averages, interest, work, speed, probability, and arithmetic.
- **Reasoning:** sequences, analogies, codes, directions, syllogisms, ranking, patterns, and deduction.
- **General Knowledge:** stable facts about Indian history and polity, geography, science, space, the environment, books, organizations, and computing. The bank avoids live/current-affairs claims.
- **Tricky Questions:** the original 100 harmless brain teasers and attention puzzles.

Select a category and mode on the **Question modes** screen. Mixed Challenge samples all four categories. Custom Practice lets you choose difficulty and a count from 1 to 50.

## Randomization and daily sets

New practice sessions use Fisher–Yates shuffling and `crypto.getRandomValues()` where the browser supports it, with a `Math.random()` fallback. The selection avoids IDs in the current browser's recent-question list when unseen questions are available. A fresh session has a new session ID; question and option order are randomized. Questions do not repeat within one session.

Different browsers generally produce different sequences, but two people can still receive the same questions. GitHub Pages is static hosting: it cannot coordinate visitors or guarantee global uniqueness without a server or shared database. The game does not fingerprint visitors or track them across devices.

Daily Challenge selects deterministically using the device's local calendar date and the current selection algorithm. It is stable for a given date and browser version, but users in different time zones may have different local dates. There is no live news feed.

## Progress and privacy

Campaign progress uses the `impossible-captcha-save` localStorage key. Practice progress and recent question IDs use separate versioned local keys. The active practice session resumes after refresh; a paused practice session can be resumed from the mode screen. The campaign save migrates existing version-1 (50-level) and version-2 (100-level) progress.

Browser storage belongs to that browser and may be cleared by the user. It is not synced to other devices, secure against manual editing, or sent to a server. **Restart all progress** on the level map asks for confirmation and clears campaign and practice history while preserving the sound preference.

## Project files

- `index.html` — screens, category controls, and relative asset references.
- `style.css` — theme, responsive layout, focus styles, and reduced-motion support.
- `level-data.js` — the original 100 trick-question definitions.
- `question-bank.js` — 60 authored Aptitude, Reasoning, and General Knowledge questions.
- `game-core.js` — 1,000-level campaign, question validation, random sessions, scoring, and save migration.
- `script.js` — UI, campaign and practice game flow, and localStorage integration.
- `tests/game.test.js` — Node's built-in automated test suite.
- `.nojekyll` — root publishing support for GitHub Pages.
- `netlify.toml` — retained static-hosting configuration; GitHub Pages does not use it.

## Add questions

Add new records to `question-bank.js` using the existing question fields: unique `id`, `categoryId`, `category`, `difficulty`, `topic`, `title`, `question`, `type`, `options` (for multiple choice), `answer`, `instructions`, `hint`, `explanation`, success/failure text, and difficulty-based `points`.

Use new IDs and original questions. Make sure exactly one multiple-choice option matches the answer (respecting `caseSensitive` where needed). Avoid unsupported current-affairs claims. The runtime and tests validate required fields, category/difficulty values, duplicate IDs/questions, answers, and options.

## Run locally and test

1. Open the repository folder in VS Code.
2. Open `index.html` with the Live Server extension, or use any static HTTP server.
3. To run the automated tests, install Node.js if needed and run:

   ```sh
   node --test tests/game.test.js
   ```

No `npm install` or build command is needed. The test suite checks all 1,000 campaign IDs, the actual unique bank and category counts, answer validation, progression, scoring, migration, randomized sessions, recent-question filtering, mixed-category balance, daily determinism, and relative GitHub Pages assets.

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
git commit -m "Upgrade Impossible CAPTCHA to 1000 levels"
git push
```

`git add .` stages non-ignored changes, `git commit` records staged changes, and `git push` sends commits to the configured remote and branch. Never stage `.env` files, passwords, tokens, private keys, or other secrets. Saving locally does not publish the website. After the push, check **Actions** if the repository uses a workflow, or **Settings → Pages** for branch deployment, wait for success, then open the URL GitHub displays and try the new modes.

## Troubleshooting

- **A script or style is missing:** confirm `index.html`, `style.css`, `level-data.js`, `question-bank.js`, `game-core.js`, and `script.js` are in the repository root with exact filename capitalization.
- **Progress is not on another device:** localStorage is device- and browser-specific.
- **Saved practice does not load:** malformed or outdated practice data is ignored; start a new session. Campaign saves from prior releases are migrated where supported.
- **Random questions look familiar:** the unique pool is currently 160 questions; after the unseen pool is exhausted, older questions can be reused. The 1,000-level campaign intentionally cycles the bank.
- **The deployed page is old or missing:** verify the Pages source and branch, confirm the latest deployment succeeded, and hard-refresh after it finishes.
- **Push fails:** read the actual Git error and inspect `git status` and the configured remote. Do not use force push as a routine fix.
