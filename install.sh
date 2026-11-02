#!/usr/bin/env bash
# =====================================================================
# Router7 One-Line Automated Installer & Launcher Configurator
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/sivnsh7/router7/main/install.sh | bash
#   or locally: ./install.sh
# =====================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

if [ -f "$SCRIPT_DIR/scripts/setup-alias.sh" ]; then
  bash "$SCRIPT_DIR/scripts/setup-alias.sh" "$@"
else
  # If piped from curl without local files, download and run setup-alias.sh
  TMP_SETUP="$(mktemp /tmp/r7-setup-XXXXXX.sh)"
  curl -fsSL https://raw.githubusercontent.com/sivnsh7/router7/main/scripts/setup-alias.sh -o "$TMP_SETUP"
  bash "$TMP_SETUP" "$@"
  rm -f "$TMP_SETUP"
fi
