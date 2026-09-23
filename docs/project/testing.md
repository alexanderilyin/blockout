<title>Running the tests</title>

# Running the tests

```console
$ npm test      # everything, through Turborepo
$ npm run lint
```

Or one package at a time: `cd packages/engine && node --test`.

## What's tested where

| Package | Tests |
|---|---|
| `packages/engine` | Board rules, placement, dice for every difficulty (including that Tricky, Master and Legend games last about as long as Hard), the other operations' rules |
| `packages/progress` | Shop chains and gates, bonuses, achievements, practice picking, migrations of old saves, cheats, homework goals and options, merging a device's save into an account |
| `apps/server` | Rooms (whole class, pairs), tournament formats, name checks, accounts (sign-in, classes, homework, parents, schedules, privacy), the Keycloak token checks with a generated key, and the HTTP API end to end on a real server with an in-memory database |
| `apps/multiplication` | Invite links |

## In the browser

Screens are checked with [Playwright](https://playwright.dev/) scripts that play the real flows (single player, practice, Home multiplayer, shop and Wardrobe, cheats, whole class, pairs, a tournament, accounts, and every other game) against a built copy on a spare port, then look at the screenshots. The rules for writing them are in `CLAUDE.md`.
