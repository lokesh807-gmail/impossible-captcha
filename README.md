# Impossible CAPTCHA — 100 Levels of Brain Confusion

A fictional, harmless 100-level puzzle game built with HTML, CSS, and vanilla JavaScript. It is not a real CAPTCHA or security check. It does not inspect your device, request permissions, collect personal information, or send game data to a server.

## Features

- Exactly 100 unique playable challenges in the specified difficulty sequence.
- Multiple-choice, typed-answer, object-selection, ordered-click, memory, and moving-button puzzles.
- Level map, score, hints, skips, retries, attempts, saved progress, and a final-boss victory screen.
- Responsive dark thriller styling and optional locally generated sound effects.
- Automatic migration of saved progress from the previous 50-level release.
- No build step, framework, backend, API key, or external runtime dependency.

## Project files

- `index.html` — game screens and relative links to local assets.
- `style.css` — dark thriller theme, responsive layout, and reduced-motion support.
- `level-data.js` — the 100 question definitions, answers, hints, explanations, categories, and puzzle options.
- `game-core.js` — difficulty sequence, answer checks, scoring, catalog checks, and save migration.
- `script.js` — browser UI, game flow, and localStorage integration.
- `tests/game.test.js` — automated game and save-migration tests using Node's built-in test runner.
- `.nojekyll` — tells GitHub Pages to publish the files directly without Jekyll processing.
- `.gitignore` — excludes local editor files, dependencies, and common secret files from Git.
- `netlify.toml` — retained static-hosting configuration; GitHub Pages does not use it.

## GitHub Pages publishing and automatic updates

The project files, including `index.html`, are at the repository root. The game uses relative paths and needs no build step, backend, API key, or deployment script. The Git remote `origin` points to `https://github.com/lokesh807-gmail/impossible-captcha.git`, and the checked-out branch is `main`.

There is no GitHub Actions deployment workflow in this project. The existing README describes GitHub Pages publishing directly from the `main` branch and the `/ (root)` folder, so this setup does not add a competing workflow. Repository files cannot confirm the live **Settings → Pages** selection; check it once in GitHub:

1. Open the existing `lokesh807-gmail/impossible-captcha` repository. Do not create a duplicate.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select **main** and **/(root)** and save.
4. GitHub publishes commits pushed to `main`. The published address is shown on the Pages settings screen; for this repository it is normally `https://lokesh807-gmail.github.io/impossible-captcha/`.
5. Check **Actions** or **Settings → Pages** for the latest Pages build/deployment status. Open the published URL after it finishes and verify the change.

If Pages is already set to **main / (root)**, leave it as-is. No Actions workflow is needed for this static site. Do not switch the source to GitHub Actions unless you deliberately add and configure an Actions deployment later.

### Publish updates from VS Code

1. Edit the game in this repository folder and test it locally with Live Server.
2. Review the pending changes and make sure no secrets or unrelated files are included:

   ```sh
   git status
   git diff
   ```

3. Stage, commit, and push the verified changes:

   ```sh
   git add .
   git commit -m "Update Impossible CAPTCHA questions"
   git push
   ```

These commands assume the correct repository and publishing branch are already configured. This checkout currently has `origin` set to the repository above and is on `main`; check `git remote -v` and `git branch --show-current` before pushing if you switch folders or branches. Saving files locally does not publish them. A commit must be pushed to the configured branch before Pages updates.

### Publish an update on GitHub.com

1. Open the existing repository and choose **Add file → Upload files** (or edit an existing file in GitHub).
2. Upload or edit only the intended files, keeping `index.html` and the other site files at the repository root.
3. Review the changes, enter a commit message, and commit directly to `main` if that is the configured Pages branch.
4. Wait for the Pages deployment to finish, then open the URL shown in **Settings → Pages** and check the update.

Never upload `.env` files, passwords, access tokens, private keys, or other secrets. `.gitignore` excludes common secret files from Git, but always review the upload/staging list yourself.

## Run locally and test

### Play the game

1. Open this folder in VS Code.
2. Install the **Live Server** extension if needed.
3. Right-click `index.html` and choose **Open with Live Server**.

The game is static and needs no backend. Its game files are local, so gameplay works offline after the files are downloaded.

### Run automated tests

Install Node.js if needed, open a terminal in the project folder, and run:

```sh
node --test tests/game.test.js
```

The test suite checks the exact 100-level sequence, unique questions and titles, answer validation, scoring, unlocking, skips, legacy-save migration, and final-level completion rules.

## Level data and difficulty

`level-data.js` is the question source. It contains exactly 100 entries in level order. Each entry has a unique title and question, category, challenge type, instructions, hint, explanation, answer, and funny success and failure messages. Add options for multiple-choice puzzles or labeled `objects` for interactive puzzles. Grid and sequence answers use zero-based object indexes. The final entry is the HUMAN word puzzle.

`game-core.js` assigns the difficulty and points from the authoritative sequence. Levels 1–50 retain their original order; Levels 51–100 follow the requested sequence. Each difficulty level awards its existing base points. IDs are assigned consecutively from the entry order, so insert or remove levels only if you also intentionally update the 100-level difficulty list, progression, and tests.

After editing question data, run:

```sh
node --test tests/game.test.js
```

The checks validate the catalog size, IDs, unique questions and titles, every requested category, the difficulty labels, answer options, interactive references, answer acceptance and rejection, and progression/scoring rules.

## Scoring and progression

- Easy levels award 100 base points, medium 200, and hard 300.
- Solving without using a hint earns a one-time 25-point bonus.
- The first hint on a level costs 25 points; later hints on that level do not charge again.
- The first skip on a level costs 50 points and unlocks the next level. Skipped levels remain replayable and are not considered solved.
- Points cannot fall below zero. Correct-completion rewards are awarded once per level, and wrong answers do not reduce score.
- The victory screen is shown only when all 100 levels have been correctly completed; skips alone do not count.

## Saved progress and migration

Progress is stored locally in the current browser under `impossible-captcha-save`. It does not follow you to another browser or device and is not secure or tamper-proof.

The 100-level release reads the previous version-1 save and carries forward its valid Levels 1–50 completions, skips, score records, hints, attempts, best score, and sound setting. Levels 51–100 start incomplete. Migration writes the version-2 save only after valid data has been recovered. Missing, malformed, or unsupported saves are left untouched; the game shows a warning and pauses further saving until you use **Restart all progress** and confirm.

Use **Restart all progress** on the level map and confirm to clear saved game data. Clearing this site's local storage manually in the browser also resets it.

## Privacy and troubleshooting

- No password, API key, login, camera, microphone, location, or external service is used by the game.
- If progress does not appear on a different device, remember that saves are browser- and device-specific.
- If a save is invalid or from an unsupported version, the game preserves that stored value and explains how to restart safely.
- Sound is optional; puzzles remain playable with sound off or when browser audio is unavailable.
- If styling is missing, check that `style.css` exists beside `index.html` and that its name and letter case match the `./style.css` link. Apply the same check to `game-core.js` and `script.js`.
- If the site shows a 404, confirm that Pages is enabled for the correct repository, the source is **Deploy from a branch**, the branch is **main**, the folder is **/(root)**, and `index.html` was uploaded at the repository root. The project URL includes the repository name: `/impossible-captcha/`.
- Before uploading, review the files for passwords, tokens, `.env` files, and private information. Never put secrets in a public repository.
- If a GitHub Pages update is not visible, wait a few minutes and hard-refresh the page.
