#!/bin/bash
set -e

# One-command install + run for the default (SQLite) workflow:
#
#   ./scripts/start.sh
#   pnpm start
#
# It installs dependencies, creates `.env` if needed, applies migrations and
# development seed data, then starts the API and the web shell. Ctrl+C stops
# both. The desktop shell has its own script (`scripts/dev-desktop.sh`) because
# it needs the Rust/Tauri toolchain; this one is the browser path described in
# the README's "Getting started" section.

# pnpm is installed under ~/.local and is not on the default PATH (AGENTS.md §8).
export PATH="$HOME/.local/bin:$PATH"

cd "$(dirname "$0")/.."

if ! command -v node > /dev/null; then
  echo "Node.js is required (>=22) but was not found on PATH." >&2
  exit 1
fi

if ! command -v pnpm > /dev/null; then
  echo "Installing pnpm..."
  npm i -g pnpm@10 --prefix "$HOME/.local"
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "Installing dependencies..."
pnpm install

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Migrations and the seed are idempotent: on an existing database they apply
# nothing and rewrite the same development rows, so running this every time is
# safe. Both read DATABASE_URL from the `.env` created above; the default is
# the gitignored SQLite file under data/.
echo "Applying database migrations..."
pnpm run db:migrate

echo "Seeding development data..."
pnpm run db:seed

echo "Starting development servers..."
echo "Web will run on http://localhost:5173"
echo "API will run on http://localhost:3010"
echo "Press Ctrl+C to stop both processes"

pnpm run dev:web &
WEB_PID=$!
pnpm run dev:api &
API_PID=$!

cleanup() {
  echo
  echo "Stopping development servers..."
  kill "$WEB_PID" "$API_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "Done"
}

trap cleanup EXIT INT TERM

wait
