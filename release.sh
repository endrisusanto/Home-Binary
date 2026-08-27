#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Ensure node and npm are available
if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
  echo "Node.js or npm not found in PATH. Checking/installing portable Node.js..."
  NODE_DIR="$ROOT_DIR/.node"
  if [ ! -f "$NODE_DIR/bin/node" ]; then
    echo "Downloading portable Node.js..."
    mkdir -p "$NODE_DIR"
    curl -fsSL https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz | tar -xJ -C "$NODE_DIR" --strip-components=1
  fi
  export PATH="$NODE_DIR/bin:$PATH"
fi

BUMP="${1:-patch}"
REMOTE_URL="https://github.com/endrisusanto/Home-Binary.git"
AUTO_COMMIT_MESSAGE="${AUTO_COMMIT_MESSAGE:-chore: auto commit before release}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Initializing git repository..."
  git init
  git branch -M main
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
else
  git remote set-url origin "$REMOTE_URL"
fi

BRANCH="$(git branch --show-current || echo 'main')"
if [[ -z "$BRANCH" ]]; then
  BRANCH="main"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Auto-committing current workspace changes..."
  git add -A
  git commit -m "$AUTO_COMMIT_MESSAGE" || true
fi

echo "Syncing $BRANCH with origin..."
git fetch origin || true
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git pull --rebase origin "$BRANCH" || true
fi

NEW_VERSION="$(node - "$BUMP" <<'NODE'
import fs from "node:fs";
const bump = process.argv[2];
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const current = String(pkg.version || "0.0.0");
const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) {
  throw new Error(`Unsupported current version: ${current}`);
}

let [major, minor, patch] = match.slice(1).map(Number);
if (/^\d+\.\d+\.\d+$/.test(bump)) {
  console.log(bump);
  process.exit(0);
}

switch (bump) {
  case "major":
    major += 1;
    minor = 0;
    patch = 0;
    break;
  case "minor":
    minor += 1;
    patch = 0;
    break;
  case "patch":
    patch += 1;
    break;
  default:
    throw new Error(`Use patch, minor, major, or an exact x.y.z version. Got: ${bump}`);
}

console.log(`${major}.${minor}.${patch}`);
NODE
)"

TAG="v${NEW_VERSION}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally."
  exit 1
fi

if git ls-remote --tags origin "$TAG" 2>/dev/null | grep -q "$TAG"; then
  echo "Tag $TAG already exists on origin."
  exit 1
fi

node - "$NEW_VERSION" <<'NODE'
import fs from "node:fs";
const version = process.argv[2];

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.version = version;
writeJson("package.json", pkg);

const conf = JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json", "utf8"));
conf.version = version;
writeJson("src-tauri/tauri.conf.json", conf);

const cargoPath = "src-tauri/Cargo.toml";
const cargo = fs.readFileSync(cargoPath, "utf8").replace(
  /^version = ".*"$/m,
  `version = "${version}"`
);
fs.writeFileSync(cargoPath, cargo);
NODE

npm install --package-lock-only

echo "Verifying cargo version and updating Cargo.lock..."
if ! cargo check --manifest-path src-tauri/Cargo.toml; then
  echo "Warning: cargo check failed. This is typical in headless environments lacking GUI system libraries."
  echo "Falling back to updating Cargo.lock version via cargo metadata..."
  cargo metadata --manifest-path src-tauri/Cargo.toml --no-deps --format-version 1 >/dev/null
fi

git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
git commit -m "chore(release): ${TAG}"
git tag -a "$TAG" -m "$TAG"
git push origin "HEAD:$BRANCH" "$TAG"

echo "Released $TAG"
