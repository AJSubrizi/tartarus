#!/usr/bin/env bash
# Tartarus one-line installer
#   curl -fsSL https://raw.githubusercontent.com/<user>/tartarus/main/install.sh | bash
#   ./install.sh
set -euo pipefail

REPO_SLUG="${TARTARUS_REPO:-AJSubrizi/tartarus}"
INSTALL_DIR="${TARTARUS_HOME:-$HOME/.tartarus/app}"
BIN_DIR="${TARTARUS_BIN:-$HOME/.local/bin}"
BRANCH="${TARTARUS_BRANCH:-main}"
REF="${TARTARUS_REF:-}"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
dim() { printf '\033[2m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }

banner() {
  cat <<'EOF'

  ████████╗ █████╗ ██████╗ ████████╗ █████╗ ██████╗ ██╗   ██╗███████╗
  ╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██║   ██║██╔════╝
     ██║   ███████║██████╔╝   ██║   ███████║██████╔╝██║   ██║███████╗
     ██║   ██╔══██║██╔══██╗   ██║   ██╔══██║██╔══██╗██║   ██║╚════██║
     ██║   ██║  ██║██║  ██║   ██║   ██║  ██║██║  ██║╚██████╔╝███████║
     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝

  the harness for the harnesses
  you orchestrate · we only run

EOF
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    red "missing required command: $1"
    exit 1
  }
}

node_ok() {
  need_cmd node
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$major" -lt 20 ]]; then
    red "Node.js >= 20 required (found $(node -v))"
    exit 1
  fi
}

resolve_source() {
  # If script lives inside a tartarus checkout, use it
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
  if [[ -n "$here" && -f "$here/package.json" ]] && grep -q '"name": "tartarus"' "$here/package.json" 2>/dev/null; then
    SOURCE_DIR="$here"
    MODE="local"
    return
  fi

  # Piped from curl → clone
  need_cmd git
  if [[ -z "$REPO_SLUG" ]]; then
    REPO_SLUG="${GITHUB_REPOSITORY:-AJSubrizi/tartarus}"
  fi

  MODE="clone"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    dim "Updating existing install at $INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout -q FETCH_HEAD
  else
    rm -rf "$INSTALL_DIR"
    dim "Cloning github.com/$REPO_SLUG → $INSTALL_DIR"
    if [[ -n "$REF" ]]; then
      git clone --depth 1 --branch "$REF" "https://github.com/${REPO_SLUG}.git" "$INSTALL_DIR"
    else
      git clone --depth 1 --branch "$BRANCH" "https://github.com/${REPO_SLUG}.git" "$INSTALL_DIR" \
        || git clone --depth 1 "https://github.com/${REPO_SLUG}.git" "$INSTALL_DIR"
    fi
  fi
  SOURCE_DIR="$INSTALL_DIR"
}

install_deps_and_build() {
  cd "$SOURCE_DIR"
  if command -v pnpm >/dev/null 2>&1; then
    dim "pnpm install"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    dim "pnpm build"
    pnpm build
  else
    need_cmd npm
    dim "npm install"
    npm install
    dim "npm run build"
    npm run build
  fi
  [[ -f "$SOURCE_DIR/dist/cli.js" ]] || {
    red "build failed: dist/cli.js missing"
    exit 1
  }
}

link_bin() {
  mkdir -p "$BIN_DIR"
  local target="$SOURCE_DIR/dist/cli.js"
  chmod +x "$target"
  ln -sfn "$target" "$BIN_DIR/tartarus"
  green "Linked $BIN_DIR/tartarus → $target"
}

print_path_hint() {
  case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *)
      dim ""
      dim "Add to your shell profile:"
      echo "  export PATH=\"$BIN_DIR:\$PATH\""
      ;;
  esac
}

print_mcp() {
  local cli="$SOURCE_DIR/dist/cli.js"
  cat <<EOF

$(bold "MCP config") (Claude Code / Cursor / Codex):

{
  "mcpServers": {
    "tartarus": {
      "command": "node",
      "args": ["$cli", "mcp"]
    }
  }
}

Or after PATH is set:

  tartarus mcp-config

$(bold "Next"):
  tartarus doctor
  tartarus serve
  tartarus adapters

EOF
}

main() {
  banner
  node_ok
  resolve_source
  dim "mode=$MODE source=$SOURCE_DIR"
  install_deps_and_build
  link_bin
  print_path_hint
  green "Tartarus installed."
  print_mcp
}

main "$@"
