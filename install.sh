#!/usr/bin/env bash
# =====================================================================
# Router7 One-Line Automated Installer & Launcher Configurator
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/sivnsh7/router7/main/install.sh | bash
#   or locally: ./install.sh
# =====================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}${CYAN}🌐 Configuring Router7 AI Gateway & Dashboard...${NC}"

# 1. Verify Node.js requirement
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: Node.js is required but not found in PATH.${NC}"
  echo "Please install Node.js (v20 or higher) from https://nodejs.org or via your system package manager."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${YELLOW}⚠️  Warning: Node.js v20+ recommended (detected $(node -v)).${NC}"
fi

# 2. Setup ~/.local/bin wrapper scripts
LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

cat << 'EOF' > "$LOCAL_BIN/r7"
#!/usr/bin/env bash
# Router7 CLI Launcher

# 1. If globally installed via npm, run directly with node
NPM_GLOBAL="$(npm root -g 2>/dev/null || true)/router7/dist/index.js"
if [ -n "$NPM_GLOBAL" ] && [ -f "$NPM_GLOBAL" ]; then
  exec node "$NPM_GLOBAL" "$@"
fi

# 2. If system-installed router7 exists in PATH (excluding this wrapper)
SYS_ROUTER7="$(type -P router7 2>/dev/null || true)"
if [ -n "$SYS_ROUTER7" ] && [ "$SYS_ROUTER7" != "$0" ] && [ "$SYS_ROUTER7" != "$HOME/.local/bin/r7" ] && [ "$SYS_ROUTER7" != "$HOME/.local/bin/router7" ]; then
  exec "$SYS_ROUTER7" "$@"
fi

# 3. If run from inside a cloned router7 repo
if [ -f "./cli/dist/index.js" ]; then
  exec node "./cli/dist/index.js" "$@"
fi

# 4. Fallback: Run via npx (zero installation needed)
exec npx -y router7 "$@"
EOF

chmod +x "$LOCAL_BIN/r7"

# Create symlink for 'router7'
ln -sf "$LOCAL_BIN/r7" "$LOCAL_BIN/router7"
echo -e "${GREEN}✓ Created executable launchers in $LOCAL_BIN (r7, router7)${NC}"

# 3. Target Shell Configuration Files
RC_FILES=()
for candidate in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile" "$HOME/.bash_profile"; do
  if [ -f "$candidate" ]; then
    RC_FILES+=("$candidate")
  fi
done

# If no rc file exists, create ~/.bashrc
if [ ${#RC_FILES[@]} -eq 0 ]; then
  touch "$HOME/.bashrc"
  RC_FILES=("$HOME/.bashrc")
fi

UPDATED_FILES=()

for rc in "${RC_FILES[@]}"; do
  MODIFIED=0

  # Ensure ~/.local/bin is in PATH
  if ! grep -q 'HOME/.local/bin' "$rc" 2>/dev/null && ! grep -q "$LOCAL_BIN" "$rc" 2>/dev/null; then
    printf '\n# Added by Router7 installer\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$rc"
    MODIFIED=1
  fi

  # Ensure aliases are present
  if ! grep -q "alias r7=" "$rc" 2>/dev/null; then
    printf "alias r7='npx -y router7'\n" >> "$rc"
    MODIFIED=1
  fi

  if ! grep -q "alias router7=" "$rc" 2>/dev/null; then
    printf "alias router7='npx -y router7'\n" >> "$rc"
    MODIFIED=1
  fi

  if [ "$MODIFIED" -eq 1 ]; then
    UPDATED_FILES+=("$rc")
  fi
done

# Optional Fish Shell support
FISH_CONF="$HOME/.config/fish/config.fish"
if [ -d "$HOME/.config/fish" ] || [ -f "$FISH_CONF" ]; then
  mkdir -p "$HOME/.config/fish"
  touch "$FISH_CONF"
  if ! grep -q "alias r7=" "$FISH_CONF" 2>/dev/null; then
    printf '\n# Router7 Aliases\nalias r7="npx -y router7"\nalias router7="npx -y router7"\n' >> "$FISH_CONF"
    UPDATED_FILES+=("$FISH_CONF")
  fi
fi

if [ ${#UPDATED_FILES[@]} -gt 0 ]; then
  echo -e "${GREEN}✓ Added shell aliases to: ${UPDATED_FILES[*]}${NC}"
else
  echo -e "${GREEN}✓ Shell aliases already configured in all detected profiles.${NC}"
fi

echo ""
echo -e "${BOLD}${CYAN}======================================================================${NC}"
echo -e "${BOLD}${GREEN}  🎉 Setup Complete! You can run 'r7' in terminal from now to start the tool.${NC}"
echo -e "${BOLD}${CYAN}======================================================================${NC}"
echo ""
echo -e "${BOLD}Commands available:${NC}"
echo -e "  ${CYAN}r7${NC}              Start the server and launch the GUI dashboard"
echo -e "  ${CYAN}r7 --port 3001${NC}  Run on custom port (default: 3001)"
echo -e "  ${CYAN}r7 --no-open${NC}    Run headless without opening browser"
echo -e "  ${CYAN}r7 --help${NC}       View all options"
echo ""
echo -e "${YELLOW}Tip:${NC} If ${BOLD}r7${NC} is not recognized immediately in your current terminal session, run:"
if [ -f "$HOME/.zshrc" ] && [[ "${SHELL:-}" == *"zsh"* ]]; then
  echo -e "  ${BOLD}source ~/.zshrc${NC}"
else
  echo -e "  ${BOLD}source ~/.bashrc${NC}"
fi
echo -e "Or simply open a new terminal tab / window."
echo -e "${BOLD}${CYAN}======================================================================${NC}"
