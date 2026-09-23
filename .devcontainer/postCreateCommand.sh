#!/usr/bin/env bash
# Sets up the dev container with everything used to build and test Blockout:
#   - npm packages from package.json: Turborepo, Vite and ESLint, plus Playwright
#     (browser tests) and jsQR (reading the QR codes the game draws)
#   - Chromium for Playwright, plus the Linux libraries it needs
#   - cloudflared, for sharing the classroom server through a Cloudflare tunnel
#   - python3-venv, to build the docs site (see docs/project/installing.md)
# Blockout is a Turborepo (npm workspaces): apps/* and packages/*, built with Vite.
# The server (apps/server) uses Node's built-ins only, including node:sqlite.
#
# Safe to run again: each step skips what's already there.
set -euo pipefail

cd "$(dirname "$0")/.."

say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }

# sudo when we aren't root (the devcontainer user is "node")
SUDO=''
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then SUDO='sudo'; else echo "Needs root or sudo for system packages." >&2; exit 1; fi
fi

say "npm packages (Turborepo, Vite, ESLint, Playwright, jsQR)"
if [ -f package-lock.json ]; then npm ci; else npm install; fi

say "Chromium for Playwright, with its system libraries"
# --with-deps installs the Debian packages Chromium needs (fonts, NSS, …)
npx --yes playwright install --with-deps chromium

say "Python venv (for the docs site: MkDocs Material)"
if python3 -c 'import ensurepip' >/dev/null 2>&1; then
  echo "already there"
else
  $SUDO apt-get install -y -qq python3-venv
fi

say "cloudflared (Cloudflare tunnels)"
if command -v cloudflared >/dev/null 2>&1; then
  echo "already installed: $(cloudflared --version | head -n 1)"
else
  arch="$(dpkg --print-architecture)" # amd64 or arm64
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/cloudflared.deb" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}.deb"
  $SUDO dpkg -i "$tmp/cloudflared.deb"
  rm -rf "$tmp"
  cloudflared --version | head -n 1
fi

say "Checking"
node --version
npx playwright --version
npm test 2>&1 | grep -E 'ℹ (pass|fail)|Tasks:' || true

cat <<'EOF'

Ready. Handy commands:
  npm test                      unit tests (every app and package)
  npm run lint                  ESLint
  npm run dev                   Vite dev servers + the API server (game at http://localhost:5173)
  npm start                     build everything and serve it on http://localhost:8080
  cloudflared tunnel --url http://localhost:8080
                                share it; then restart the server with
                                npm start -- --public-url https://<tunnel>.trycloudflare.com
EOF
