#!/usr/bin/env bash
# The Router7 installer moved to https://router7.co/install.sh
# This shim keeps old `curl ... github.io ... | bash` one-liners working.
set -euo pipefail
exec bash -c "$(curl -fsSL https://router7.co/install.sh)"
