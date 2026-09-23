<title>CI</title>

# CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main` or a `v*` branch. The **check** job:

1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build`

The **docs** job builds this site with `mkdocs build --strict`, so a broken link or a page missing from the nav fails it.

How it's locked down:

- **Minimal permissions:** the workflow only gets `contents: read`, and checkout doesn't keep the token (`persist-credentials: false`).
- **Pinned actions:** actions are pinned to full commit SHAs, with the version in a comment. Dependabot (`.github/dependabot.yml`) updates them, and the npm packages, weekly.
- **One run per branch:** a newer push cancels the older run.
