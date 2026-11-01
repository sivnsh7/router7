#!/usr/bin/env bash
set -euo pipefail

TARGET_RC="$HOME/.bashrc"
if [[ "${SHELL:-}" == *"zsh"* ]] || [[ -f "$HOME/.zshrc" ]]; then
  TARGET_RC="$HOME/.zshrc"
fi

ALIAS_LINE_ROUTER7="alias router7='npx router7'"
ALIAS_LINE_R7="alias r7='router7'"

echo "Configuring Router7 aliases in $TARGET_RC..."

if grep -q "alias router7=" "$TARGET_RC" 2>/dev/null; then
  echo "✓ Alias 'router7' already present in $TARGET_RC"
else
  printf "\n# Router7 CLI Aliases\n%s\n" "$ALIAS_LINE_ROUTER7" >> "$TARGET_RC"
  echo "✓ Added 'router7' alias to $TARGET_RC"
fi

if grep -q "alias r7=" "$TARGET_RC" 2>/dev/null; then
  echo "✓ Alias 'r7' already present in $TARGET_RC"
else
  printf "%s\n" "$ALIAS_LINE_R7" >> "$TARGET_RC"
  echo "✓ Added 'r7' alias to $TARGET_RC"
fi

echo ""
echo "Router7 aliases configured successfully!"
echo "To activate immediately, run:"
echo "  source $TARGET_RC"
echo ""
echo "You can now run:"
echo "  router7 --help"
echo "  r7 --help"
