#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Lint repo root (quiz-master) if ESLint is available
if [ -f "$ROOT_DIR/eslint.config.mjs" ] && [ -x "$ROOT_DIR/node_modules/.bin/eslint" ]; then
  pushd "$ROOT_DIR" >/dev/null
    echo "Linting root (quiz-master)..."
    ./node_modules/.bin/eslint . || true
  popd >/dev/null
fi

# Lint and format quizmaster-api
pushd "$ROOT_DIR/quizmaster-api" >/dev/null
  echo "Linting quizmaster-api..."
  npm run lint || true
  echo "Formatting quizmaster-api..."
  npm run format || true
popd >/dev/null

# Lint and format quizmaster-ui (if exists)
if [ -d "$ROOT_DIR/quizmaster-ui" ]; then
  pushd "$ROOT_DIR/quizmaster-ui" >/dev/null
    echo "Linting quizmaster-ui..."
    npm run lint || true
    echo "Formatting quizmaster-ui..."
    npm run format || true
  popd >/dev/null
fi

echo "Linting complete."
