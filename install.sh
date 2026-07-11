#!/usr/bin/env bash
# Tartarus installer
#
#   # Desktop app (default on macOS/Linux/Windows with curl)
#   curl -fsSL https://raw.githubusercontent.com/AJSubrizi/tartarus/main/install.sh | bash
#
#   # CLI only (clone + build + link)
#   curl -fsSL ... | bash -s -- --cli
#
#   # Force desktop download
#   curl -fsSL ... | bash -s -- --desktop
#
# Env:
#   TARTARUS_REPO   default AJSubrizi/tartarus
#   TARTARUS_TAG    default: latest release tag
#   TARTARUS_HOME   CLI install dir (~/.tartarus/app)
#   TARTARUS_BIN    bin dir (~/.local/bin)
set -euo pipefail

REPO_SLUG="${TARTARUS_REPO:-AJSubrizi/tartarus}"
INSTALL_DIR="${TARTARUS_HOME:-$HOME/.tartarus/app}"
BIN_DIR="${TARTARUS_BIN:-$HOME/.local/bin}"
BRANCH="${TARTARUS_BRANCH:-main}"
REF="${TARTARUS_REF:-}"
TAG="${TARTARUS_TAG:-}"
MODE_ARG=""

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
     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚══════╝ ╚══════╝

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

usage() {
  cat <<EOF
Usage: install.sh [--desktop|--cli|--help]

  --desktop   Download the latest desktop app from GitHub Releases (default)
  --cli       Clone/build CLI into ~/.tartarus/app and link bin/tartarus
  --help      Show this help

Examples:
  curl -fsSL https://raw.githubusercontent.com/${REPO_SLUG}/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/${REPO_SLUG}/main/install.sh | bash -s -- --cli
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --desktop|desktop) MODE_ARG=desktop; shift ;;
      --cli|cli) MODE_ARG=cli; shift ;;
      -h|--help|help) usage; exit 0 ;;
      *)
        # ignore unknown for forward-compat
        shift
        ;;
    esac
  done
  if [[ -z "$MODE_ARG" ]]; then
    MODE_ARG=desktop
  fi
}

detect_asset() {
  local os arch asset
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$os" in
    darwin)
      case "$arch" in
        arm64|aarch64) asset="Tartarus-mac-arm64.zip" ;;
        x86_64|amd64) asset="Tartarus-mac-x64.zip" ;;
        *) red "unsupported mac arch: $arch"; exit 1 ;;
      esac
      ;;
    linux)
      asset="Tartarus-linux-x64.AppImage"
      ;;
    msys*|mingw*|cygwin*|windows*)
      asset="Tartarus-win-x64-Setup.exe"
      ;;
    *)
      red "unsupported OS: $os — use --cli or download from GitHub Releases"
      exit 1
      ;;
  esac
  echo "$asset"
}

latest_tag() {
  if [[ -n "$TAG" ]]; then
    echo "$TAG"
    return
  fi
  need_cmd curl
  local url="https://api.github.com/repos/${REPO_SLUG}/releases/latest"
  local t
  t="$(curl -fsSL "$url" | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -z "$t" ]]; then
    t="v0.8.0"
  fi
  echo "$t"
}

download_desktop() {
  need_cmd curl
  local tag asset url dest dir app
  tag="$(latest_tag)"
  asset="$(detect_asset)"
  url="https://github.com/${REPO_SLUG}/releases/download/${tag}/${asset}"
  dir="${HOME}/.tartarus/desktop"
  mkdir -p "$dir"
  dest="${dir}/${asset}"

  bold "Desktop install"
  dim "release ${tag} · ${asset}"
  dim "from ${url}"

  if ! curl -fL --progress-bar -o "$dest" "$url"; then
    red "download failed"
    dim "Open releases: https://github.com/${REPO_SLUG}/releases"
    dim "Or install CLI: curl -fsSL … | bash -s -- --cli"
    exit 1
  fi

  case "$asset" in
    *.zip)
      need_cmd unzip
      dim "Unzipping…"
      rm -rf "${dir}/Tartarus.app" "${dir}/mac-arm64" "${dir}/mac" 2>/dev/null || true
      unzip -qo "$dest" -d "$dir"
      # zip may contain Tartarus.app at root or under a folder
      app="$(find "$dir" -maxdepth 3 -name 'Tartarus.app' -type d | head -1 || true)"
      if [[ -z "$app" ]]; then
        red "Tartarus.app not found in archive"
        exit 1
      fi
      # Prefer ~/Applications if present, else open from cache
      if [[ -d "$HOME/Applications" ]]; then
        rm -rf "$HOME/Applications/Tartarus.app"
        cp -R "$app" "$HOME/Applications/Tartarus.app"
        app="$HOME/Applications/Tartarus.app"
        green "Installed → $app"
      else
        green "Unpacked → $app"
      fi
      dim "Opening (unsigned build: right-click → Open if Gatekeeper blocks)…"
      open "$app" 2>/dev/null || true
      cat <<EOF

$(bold "Next")
  1. In the app: Rileva agent → Installa MCP on Claude / Codex / Cursor
  2. Restart that host and say: usa tartarus_help

EOF
      ;;
    *.AppImage)
      chmod +x "$dest"
      green "Downloaded → $dest"
      dim "Run: $dest"
      cat <<EOF

$(bold "Next")
  $dest
  Then Installa MCP on Claude / Codex / Cursor.

EOF
      ;;
    *.exe)
      green "Downloaded → $dest"
      dim "Run the installer (SmartScreen may warn — unsigned OSS build)."
      if command -v cmd.exe >/dev/null 2>&1; then
        cmd.exe /c start "" "$dest" 2>/dev/null || true
      fi
      ;;
  esac
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
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
  if [[ -n "$here" && -f "$here/package.json" ]] && grep -qE '"name":\s*"(@ajsubrizi/)?tartarus"' "$here/package.json" 2>/dev/null; then
    SOURCE_DIR="$here"
    MODE="local"
    return
  fi

  need_cmd git
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

$(bold "MCP") (any host):
  codex mcp add tartarus -- npx -y github:${REPO_SLUG} mcp

Or local:
  node $cli mcp

$(bold "Next"):
  tartarus doctor
  tartarus app          # open setup GUI in browser
  tartarus adapters

EOF
}

install_cli() {
  bold "CLI install"
  node_ok
  resolve_source
  dim "mode=$MODE source=$SOURCE_DIR"
  install_deps_and_build
  link_bin
  print_path_hint
  green "Tartarus CLI installed."
  print_mcp
}

main() {
  parse_args "$@"
  banner
  case "$MODE_ARG" in
    desktop) download_desktop ;;
    cli) install_cli ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
