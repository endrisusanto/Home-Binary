#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================"
echo "  Running QuickBuild Playwright Standalone Tester"
echo "======================================================"
echo ""

node engine/standalone-test.mjs "$@"
