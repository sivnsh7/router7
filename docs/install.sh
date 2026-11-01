#!/usr/bin/env bash
# Router7 Universal Installer & Shell Alias Setup
set -euo pipefail

echo "=========================================="
echo "🌐 Router7 Installation & Shell Setup"
echo "=========================================="

# 1. Install CLI globally if npm is present
if command -v npm >/dev/null 2>&1; then
  echo "Installing Router7 CLI via npm..."
  npm install -g router7 || echo "Global npm install skipped (will use npx alias)."
fi

# 2. Add shell aliases to ~/.bashrc or ~/.zshrc
TARGET_RC="$HOME/.bashrc"
if [[ "${SHELL:-}" == *"zsh"* ]] || [[ -f "$HOME/.zshrc" ]]; then
  TARGET_RC="$HOME/.zshrc"
fi

echo "Configuring aliases in $TARGET_RC..."
if ! grep -q "alias router7=" "$TARGET_RC" 2>/dev/null; then
  printf "\n# Router7 CLI Aliases\nalias router7='npx router7'\nalias r7='router7'\n" >> "$TARGET_RC"
  echo "✓ Added 'router7' and 'r7' aliases to $TARGET_RC"
else
  echo "✓ Router7 aliases already configured in $TARGET_RC"
fi

echo ""
echo "🎉 Setup complete! To activate now, run:"
echo "   source $TARGET_RC"
echo ""
echo "Commands available:"
echo "   router7 --help"
echo "   r7 --help"
