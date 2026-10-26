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
- `game-core.js` — authoritative 100-level catalog, difficulty sequence, answer checks, scoring, and save migration.
- `script.js` — browser UI, game flow, and localStorage integration.
- `tests/game.test.js` — automated game and save-migration tests using Node's built-in test runner.
- `.nojekyll` — tells GitHub Pages to publish the files directly without Jekyll processing.
- `.gitignore` — excludes local editor files, dependencies, and common secret files from Git.
- `netlify.toml` — retained static-hosting configuration; GitHub Pages does not use it.

## Publish free with GitHub Pages

The easiest setup uses GitHub's website to upload the files and publish directly from the `main` branch. No Actions workflow or build configuration is required.

### 1. Create a public repository

1. Sign in to GitHub and open [github.com/new](https://github.com/new).
2. Enter `impossible-captcha` as the repository name.
3. Select **Public**.
4. Click **Create repository**.

### 2. Upload the project files

1. In the new repository, click **Add file**, then **Upload files**.
2. In File Explorer, open the game folder. If `.gitignore` and `.nojekyll` are not visible, turn on **View → Show → Hidden items**.
3. Select the project files and folders. Make sure `index.html` is at the repository root—not inside an extra `Game` or `impossible-captcha` folder.
4. Upload `index.html`, `style.css`, `game-core.js`, `script.js`, `README.md`, `.gitignore`, `.nojekyll`, `netlify.toml`, and the `tests` folder. Do not upload passwords, tokens, `.env` files, or other secrets.
5. Enter a commit message such as `Add Impossible CAPTCHA game`, then click **Commit changes**.

### 3. Enable GitHub Pages

1. In the repository, click **Settings**.
2. In the left sidebar under **Code and automation**, click **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select the **main** branch and the **/ (root)** folder.
5. Click **Save**.

### 4. Open and check the published game

Wait a few minutes for the initial publish. The repository's **Settings → Pages** screen will display the site address when it is ready. The expected address is:

`https://YOUR-USERNAME.github.io/impossible-captcha/`

Replace `YOUR-USERNAME` with your GitHub username. Open the address and try starting a challenge, submitting an answer, opening the level map, and refreshing the page to check that progress remains saved in that browser.

If the `impossible-captcha` repository already exists, do not create a duplicate. Open the existing repository, select **Add file → Upload files** (or open its `/upload` page), and upload the files there. If you have access to the repository named in your instructions, its upload page is `https://github.com/lokesh807-gmail/impossible-captcha/upload`.

This project uses relative asset paths (`./style.css`, `./game-core.js`, and `./script.js`) so the site works under the repository's `/impossible-captcha/` path. It has no server routes, so refreshing the page works without a backend rewrite.

### Publish updates from VS Code

If you clone the repository and open that clone in VS Code:

1. Edit and save the files in the cloned repository folder.
2. Click the **Source Control** icon in the left sidebar.
3. Review the changed files. Click the **+** next to each file or next to **Changes** to stage the updates.
4. Enter a commit message, such as `Add more puzzle levels`, and click **Commit**.
5. Click **Sync Changes** or **Push** to send your commit to GitHub. Confirm if asked.
6. GitHub Pages automatically republishes commits pushed to the configured `main` branch. Wait a few minutes, then refresh the published site.

This project folder is not currently connected to a Git repository. To use this VS Code workflow, create the repository, use **Code → Copy URL** on GitHub, clone it in VS Code with **Clone Repository**, then copy the game files into the cloned folder. You can also use GitHub's **Add file → Upload files** option to publish later changes manually.

### Upload later updates on GitHub.com

1. Open the repository and click **Add file → Upload files**.
2. Choose or drag the updated files into the upload area. Keep `index.html` at the repository root and preserve the existing folder layout.
3. Enter a commit message and click **Commit changes**.
4. GitHub Pages automatically starts publishing the new commit from the configured branch. Wait for deployment to finish, then refresh the website.

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

The `LEVELS` array and its matching `DIFFICULTIES` list in `game-core.js` are the authoritative catalog. Levels 1–50 keep the original sequence. Levels 51–100 use the sequence specified for the expansion. The game validates the catalog at startup and tests validate the exact expected sequence.

To revise a level, edit its `makeLevel(...)` entry. Keep IDs consecutive, titles and questions unique, and answers consistent with the challenge type. Supported types are `multiple-choice`, `text`, `grid`, `order`, `memory`, and `runaway`. Each level needs instructions, a useful hint, an explanation, success and failure messages, and difficulty-based points. Interactive levels also need an `objects` array; interactive answers use zero-based indexes. Run the test suite after edits. The game intentionally remains at exactly 100 levels unless you update the difficulty list, total validation, and tests too.

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
