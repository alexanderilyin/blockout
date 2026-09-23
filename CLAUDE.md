# Blockout

A multiplication-as-area game for 3rd graders, based on "Blockout" from Math for Love. Two dice are rolled, you draw an a × b rectangle on a grid and answer a × b to claim it. It runs mainly on classroom Chromebooks.

**The game itself has no dependencies and no build step.** It's plain HTML/CSS/JS and runs straight from `index.html`. npm packages (Playwright, jsQR) are for testing only.

## Layout

| Path | What |
|---|---|
| `index.html` | Every screen and dialog (`.overlay > .dialog`), plus the Lucide icon sprite (`#i-*` symbols, used as `<svg class="icon"><use href="#i-name">`). |
| `css/style.css` | All styles. Colors are tokens on `:root`, with dark-mode variants. |
| `js/core.js` | `BlockoutCore`: the board, placement rules, dice, `rollForBoard`, difficulties (`DIFFICULTIES`, `diceFaces`, `createPairDice`, `fitsDifficulty`). Pure. |
| `js/progress.js` | `BlockoutProgress`: wallet, `SHOP` (unlocks), achievements, fact stats, bonuses, practice picking, cheat codes, and `normalize` (save migrations). Pure. |
| `js/cosmetics.js` | Wardrobe items; registers them into `Progress.SHOP`. |
| `js/invite.js` | Invite links (`validate` whitelists every setting). |
| `js/classroom.js` | Client for the classroom server (SSE with long-poll fallback, session in sessionStorage). |
| `js/game.js` | All UI (~6000 lines, one IIFE): menu, game, practice, shop, wardrobe, stats, classroom screens, cheats. |
| `server/classroom.js` | Zero-dependency Node server: static files (only `index.html`, `css/`, `js/`, `prototypes/`), JSON API, SSE plus `/poll`. |
| `server/rooms.js` | Pure room logic: whole class, pairs, tournaments. |
| `server/tournament.js` | Tournament formats: knockout, double elimination, round robin, Swiss, king of the hill. |
| `server/moderation.js` | Username checks: `blocklist.txt`, plus OpenAI moderation only when `OPENAI_API_KEY` is set (fails open). |
| `prototypes/` | Other operations (addition, subtraction, division, fractions). Single player and practice only. Shares `prototypes/shared/`. |
| `test/*.test.js` | `node:test` unit tests for the pure modules and the server rooms. |

Browser script load order (index.html): core → progress → cosmetics → invite → vendor/qrcode → classroom → game. Modules are UMD-style: `window.BlockoutX` in the browser, `require()` in tests.

## Commands

```sh
npm test                                   # node --test test/*.test.js (must stay green)
node server/classroom.js 8080              # game and classroom server at http://localhost:8080
node server/classroom.js 8080 --public-url https://<name>.trycloudflare.com   # behind a Cloudflare tunnel
cloudflared tunnel --url http://localhost:8080
```

- **The dev server:** the user usually keeps one running on 8080 behind a Cloudflare quick tunnel. The tunnel URL changes, so ask for it or reuse the last one given.
- **When to restart it:** only after changing `server/*`. Client files are served `no-cache`, so a page reload picks them up.
- **Setup:** `.devcontainer/postCreateCommand.sh` installs the npm packages, Playwright Chromium with its libraries, and cloudflared.

## Browser testing (Playwright)

Write throwaway scripts in the session scratchpad, not the repo. Require Playwright from `/workspaces/blockout/node_modules/playwright`, and spawn a private server on a spare port (8134+) that you kill at the end. The pattern:

```js
const { chromium } = require('/workspaces/blockout/node_modules/playwright');
const srv = spawn('node', ['/workspaces/blockout/server/classroom.js', '8135'], { stdio: 'ignore' });
// seed a save before the page loads (once per tab):
await page.addInitScript((pr) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1);
  localStorage.setItem('blockout.progress', JSON.stringify(pr)); } }, progress);
```

- **Seed the migration flags.** A seeded progress must include `boardsV2, practiceV2, placeAutoV1, gameExpertV1, practiceTimersV1, boardWinsFromHistory: true`, or the old-save migrations in `Progress.normalize` grant extra unlocks and skew the test. Add `checkIn: { last: <today>, streak: 1 }` to skip the daily check-in popup.
- **To unlock everything,** seed `unlocks: Progress.SHOP.map(i => i.id)`, or type the IDDQD cheat (~ key).
- **Useful ids:**
  - `#start-btn`, `#roll-btn`, `#unlock-yes` (the quick-unlock confirm), `#cheats-input`
  - `[data-mode="single|multi|practice"]`, `[data-setting="difficulty"] [data-value=…]`, `#board-size [data-size=…]`
- **Check for errors:** collect `pageerror` events and check there are none. Screenshot and look at the result.
- **Classroom flows:** use several browser contexts (a teacher plus students).

## Storage

- **localStorage:**
  - `blockout.progress`: wallet, unlocks, achievements, facts per player key, counters, boardWins, helpedFacts, cheats, migration flags
  - `blockout.settings`, `blockout.history`, `blockout.className`, `blockout.classHost`
- **sessionStorage** (per tab): `blockout.class`, the classroom session.
- **Save changes need a migration.** Anything that changes what a save means gets a one-time flag in `Progress.normalize`, so existing players never lose what they had.

## Game design conventions

- **Unlocks are skill-tree chains** (`SHOP` items with `requires`):
  - Only the next step shows its name and price. Later steps are blurred "skeleton" placeholders with a lock (`Progress.isHidden`, `setLockBadge`).
  - Reveal gates: `winOn` (win on the previous board), `masterUpTo` / `mastery` (Times Table mastery, via `tableReady`).
  - `perk` text appears in the unlock dialog and the shop.
  - Buying from a menu control activates it (the `ACTIVATE` map in game.js).
- **Per-difficulty unlocks:** each difficulty has its own Expert level, timers and practice question counts (`gameExpertId`, `gameTimerId`, `practiceCountId`, `practiceTimerId`, `practiceExpertId`).
- **Difficulties:**

  | Difficulty | Dice |
  |---|---|
  | Easy | d6 |
  | Medium | d8 |
  | Hard | d12 |
  | Tricky | faces 3, 4, 6, 7, 8, 9, 12 |
  | Master | d12 weighted to the player's weak facts |
  | Legend | half teen × 2–9 (11–19), half Tricky facts; needs a board ≥ 12 and uses split explanations |

  Tricky, Master and Legend use pair dice (`createPairDice`) and virtual dice only. Pair dice make big rectangles rarer on smaller boards (`PAIR_ROOM`), and near the end they fall back to small facts that fit, so games last about as long as on Hard (a test checks this). Classroom stays on Easy, Medium and Hard.
- **Classroom games are unlock-free:** every lobby setting is free and cheats are off.
- **Bonuses** are in progress.js (`answerBonus`, `timerBonus`, `boardFinishBonus`, `practiceFinishBonus`). Tell the player about them in the menu hints and the unlock dialogs.
- **Achievements:**
  - They show one at a time as a WoW-style banner (`celebrate`, then a queue).
  - Results screens stay minimal: no points line, stickers row or achievement list. Actions go on one row of equal buttons.
  - Secret achievements (`hidden: true`, group "Secrets") show as "???" until earned.
- **Cheat codes:** press ~.
  - They're in `Progress.CHEAT_CODES`, with `cheatOn`/`cheatOff` storing what each changed so it can be undone.
  - The menu lists active cheats by description, never by code.
  - Each code gets its own secret achievement `cheat_<code>` (a test enforces this).
- **Dialogs** have a bottom `.dialog-actions` button panel, like the Shop.
- **The audience is 8-year-olds:** use short, friendly, concrete wording ("Help me count", "Needs practice"). Target devices are Chromebooks, and it must work at phone width too.

## Code style

- **Match the surrounding code:** vanilla ES2020, 2-space indent, single quotes, `const` arrow helpers, short comments explaining *why*.
- **No frameworks, bundlers or runtime dependencies.** The server uses only Node built-ins.
- **Keep logic testable:** pure logic belongs in `core.js` / `progress.js` / `rooms.js` / `tournament.js` with unit tests, and `game.js` stays the UI.
- **Keep the tests green.** Add tests for new rules; run `npm test` before finishing.
