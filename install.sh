#!/usr/bin/env bash
# =====================================================================
# Router7 One-Line Automated Installer & Launcher Configurator
# Automatically installs dependencies (Node.js v22 LTS, npm, etc.)
# and configures 'r7' and 'router7' commands across all shells.
#
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

# ---------------------------------------------------------------------
# 1. Dependency Auto-Detection & Self-Installation
# ---------------------------------------------------------------------
ensure_dependencies() {
  local need_node=0

  if command -v node >/dev/null 2>&1; then
    local current_major
    current_major=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
    if [ -n "$current_major" ] && [ "$current_major" -ge 20 ]; then
      echo -e "${GREEN}✓ Found Node.js $(node -v) (v20+ requirement satisfied)${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠️  Existing Node.js $(node -v) is below v20. Upgrading to Node.js v22 LTS...${NC}"
      need_node=1
    fi
  else
    echo -e "${CYAN}📦 Node.js not detected. Automatically installing Node.js (v22 LTS)...${NC}"
    need_node=1
  fi

  if [ "$need_node" -eq 1 ]; then
    local SUDO=""
    if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
      SUDO="sudo"
    fi

    local installed=0

    # Method A: Debian / Ubuntu / Codespaces (apt)
    if command -v apt-get >/dev/null 2>&1 && ([ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ]); then
      echo -e "${CYAN}→ Installing Node.js via official NodeSource repository (apt)...${NC}"
      if $SUDO apt-get update -y -qq >/dev/null 2>&1 && \
         $SUDO apt-get install -y -qq curl ca-certificates tar >/dev/null 2>&1 && \
         curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash - >/dev/null 2>&1 && \
         $SUDO apt-get install -y -qq nodejs >/dev/null 2>&1; then
        if command -v node >/dev/null 2>&1; then
          installed=1
          echo -e "${GREEN}✓ Node.js $(node -v) successfully installed!${NC}"
        fi
      fi
    fi

    # Method B: Alpine Linux (apk)
    if [ "$installed" -eq 0 ] && command -v apk >/dev/null 2>&1 && ([ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ]); then
      echo -e "${CYAN}→ Installing Node.js via apk...${NC}"
      if $SUDO apk add --no-cache nodejs npm curl tar >/dev/null 2>&1; then
        if command -v node >/dev/null 2>&1; then
          installed=1
          echo -e "${GREEN}✓ Node.js $(node -v) successfully installed!${NC}"
        fi
      fi
    fi

    # Method C: macOS / Linux (Homebrew)
    if [ "$installed" -eq 0 ] && command -v brew >/dev/null 2>&1; then
      echo -e "${CYAN}→ Installing Node.js via Homebrew...${NC}"
      if brew install node >/dev/null 2>&1; then
        if command -v node >/dev/null 2>&1; then
          installed=1
          echo -e "${GREEN}✓ Node.js $(node -v) successfully installed!${NC}"
        fi
      fi
    fi

    # Method D: Fedora / RHEL / CentOS (dnf)
    if [ "$installed" -eq 0 ] && command -v dnf >/dev/null 2>&1 && ([ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ]); then
      echo -e "${CYAN}→ Installing Node.js via dnf...${NC}"
      if curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash - >/dev/null 2>&1 && \
         $SUDO dnf install -y nodejs >/dev/null 2>&1; then
        if command -v node >/dev/null 2>&1; then
          installed=1
          echo -e "${GREEN}✓ Node.js $(node -v) successfully installed!${NC}"
        fi
      fi
    fi

    # Method E: Universal Precompiled Binary Download (Zero root / Zero package manager requirement)
    # Works on any Linux (x64, arm64, armv7l) and macOS!
    if [ "$installed" -eq 0 ]; then
      echo -e "${CYAN}→ Installing official standalone Node.js v22 LTS binary package...${NC}"
      local os
      case "$(uname -s 2>/dev/null || echo Linux)" in
        Darwin|darwin) os="darwin" ;;
        *) os="linux" ;;
      esac

      local arch
      arch="$(uname -m 2>/dev/null || echo x86_64)"
      local node_arch=""
      case "$arch" in
        x86_64|amd64) node_arch="x64" ;;
        aarch64|arm64) node_arch="arm64" ;;
        armv7l) node_arch="armv7l" ;;
        *) node_arch="x64" ;;
      esac

      if [ -n "$node_arch" ] && ([ "$os" = "linux" ] || [ "$os" = "darwin" ]); then
        local dest_base="$HOME/.local/lib/nodejs"
        local bin_dest="$HOME/.local/bin"
        if [ "$(id -u)" -eq 0 ]; then
          dest_base="/usr/local/lib/nodejs"
          bin_dest="/usr/local/bin"
        fi

        mkdir -p "$dest_base" "$bin_dest"

        local tar_name=""
        if command -v awk >/dev/null 2>&1 && command -v grep >/dev/null 2>&1; then
          tar_name=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt 2>/dev/null | awk '{print $2}' | grep "^node-v22\..*-${os}-${node_arch}\.tar\.gz$" | head -n 1 || true)
        fi
        if [ -z "$tar_name" ]; then
          tar_name="node-v22.23.4-${os}-${node_arch}.tar.gz"
        fi

        local node_url="https://nodejs.org/dist/latest-v22.x/${tar_name}"
        local target_dir="$dest_base/node-current"
        mkdir -p "$target_dir"

        local tmp_tar
        tmp_tar="$(mktemp 2>/dev/null || echo "/tmp/node-${node_arch}.tar.gz")"
        if curl -fsSL "$node_url" -o "$tmp_tar" 2>/dev/null; then
          if tar -xzf "$tmp_tar" -C "$target_dir" --strip-components=1 2>/dev/null; then
            rm -f "$tmp_tar" 2>/dev/null || true
            ln -sf "$target_dir/bin/node" "$bin_dest/node"
            ln -sf "$target_dir/bin/npm" "$bin_dest/npm"
            ln -sf "$target_dir/bin/npx" "$bin_dest/npx"

            export PATH="$bin_dest:$PATH"
            if "$bin_dest/node" -v >/dev/null 2>&1; then
              installed=1
              echo -e "${GREEN}✓ Standalone Node.js $("$bin_dest/node" -v) runtime installed to $bin_dest!${NC}"
            fi
          fi
          rm -f "$tmp_tar" 2>/dev/null || true
        fi
      fi
    fi

    # Final verification
    export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
    if ! command -v node >/dev/null 2>&1; then
      echo -e "${RED}❌ Could not install Node.js automatically.${NC}"
      echo "Please install Node.js (v20+) from https://nodejs.org"
      exit 1
    fi
  fi
}

ensure_dependencies

# ---------------------------------------------------------------------
# 2. Setup ~/.local/bin and /usr/local/bin Launchers
# ---------------------------------------------------------------------
LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

# If root, also write directly to /usr/local/bin for immediate system-wide access
TARGET_BINS=("$LOCAL_BIN")
if [ "$(id -u)" -eq 0 ] && [ -d "/usr/local/bin" ]; then
  TARGET_BINS+=("/usr/local/bin")
fi

for bin_dir in "${TARGET_BINS[@]}"; do
  cat << 'EOF' > "$bin_dir/r7"
#!/usr/bin/env bash
# Router7 GUI Launcher
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

# 1. If globally installed via npm in ~/.npm-global (instant)
if [ -f "$HOME/.npm-global/lib/node_modules/router7/dist/index.js" ]; then
  exec node "$HOME/.npm-global/lib/node_modules/router7/dist/index.js" "$@"
fi

# 2. Check system npm global directory
NPM_GLOBAL="$(npm root -g 2>/dev/null || true)/router7/dist/index.js"
if [ -n "$NPM_GLOBAL" ] && [ -f "$NPM_GLOBAL" ]; then
  exec node "$NPM_GLOBAL" "$@"
fi

# 3. Check standalone node installation in ~/.local/lib/nodejs
if [ -f "$HOME/.local/lib/nodejs/node-current/lib/node_modules/router7/dist/index.js" ]; then
  exec node "$HOME/.local/lib/nodejs/node-current/lib/node_modules/router7/dist/index.js" "$@"
fi

# 4. If system-installed router7 exists in PATH (excluding this wrapper)
SYS_ROUTER7="$(type -P router7 2>/dev/null || true)"
if [ -n "$SYS_ROUTER7" ] && [ "$SYS_ROUTER7" != "$0" ] && [ "$SYS_ROUTER7" != "$HOME/.local/bin/r7" ] && [ "$SYS_ROUTER7" != "$HOME/.local/bin/router7" ] && [ "$SYS_ROUTER7" != "/usr/local/bin/r7" ] && [ "$SYS_ROUTER7" != "/usr/local/bin/router7" ]; then
  exec "$SYS_ROUTER7" "$@"
fi

# 5. If run from inside a cloned router7 repo
if [ -f "./cli/dist/index.js" ]; then
  exec node "./cli/dist/index.js" "$@"
fi

# 6. Fallback: Run via npx (zero installation needed)
exec npx -y router7 "$@"
EOF

  chmod +x "$bin_dir/r7"
  ln -sf "$bin_dir/r7" "$bin_dir/router7"
done

echo -e "${GREEN}✓ Created executable launchers (r7, router7)${NC}"

# ---------------------------------------------------------------------
# 3. Target Shell Configuration Files & Functions
# ---------------------------------------------------------------------
RC_FILES=()
for candidate in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile" "$HOME/.bash_profile"; do
  if [ -f "$candidate" ]; then
    RC_FILES+=("$candidate")
  fi
done

if [ ${#RC_FILES[@]} -eq 0 ]; then
  : >> "$HOME/.bashrc"
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

  # Ensure r7 function or alias is present with argument preservation
  if ! grep -q "r7()" "$rc" 2>/dev/null && ! grep -q "alias r7=" "$rc" 2>/dev/null; then
    cat << 'EOF' >> "$rc"
r7() {
  if [ -x "$HOME/.local/bin/r7" ]; then
    "$HOME/.local/bin/r7" "$@"
  elif [ -x "/usr/local/bin/r7" ]; then
    "/usr/local/bin/r7" "$@"
  else
    npx -y router7 "$@"
  fi
}
router7() {
  r7 "$@"
}
EOF
    MODIFIED=1
  fi

  if [ "$MODIFIED" -eq 1 ]; then
    UPDATED_FILES+=("$rc")
  fi
done

# Fish Shell support if present
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
  echo -e "${GREEN}✓ Configured shell profiles: ${UPDATED_FILES[*]}${NC}"
else
  echo -e "${GREEN}✓ Shell aliases already configured in all detected profiles.${NC}"
fi

# ---------------------------------------------------------------------
# 4. Optional Global npm Package Pre-Install (for instant startup speed)
# ---------------------------------------------------------------------
echo -e "${CYAN}→ Pre-caching Router7 package for high-speed startup...${NC}"
npm install -g router7@latest >/dev/null 2>&1 || true

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
