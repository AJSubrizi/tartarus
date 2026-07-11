# Changelog

## 0.8.0

- **Job board** in GUI: live jobs, log tail, kill (SSE + poll) — observation only, no auto-winner
- **Auto-update** via electron-updater + GitHub Releases (`latest*.yml` uploaded)
- **Signing hooks** in CI when secrets set — see `docs/SIGNING.md`
- npm scope **`@ajsubrizi/tartarus`** (name `tartarus` was taken)
- Mac release target: `zip` (updater-friendly) + normalized asset names
- API: `POST /api/jobs/:id/kill`, dashboard includes jobs + version

## 0.7.3

- App icon (macOS `.icns`, Windows `.ico`, Linux PNGs)
- README: **Get the app** download table + release badge
- `install.sh`: `--desktop` (default, GitHub Releases) vs `--cli` (clone + build)
- Orchestrator prompt example in README
- Note: npm name `tartarus` is taken — use `github:AJSubrizi/tartarus`

## 0.7.2

- Fix Linux `.deb` build (author email + maintainer)
- Cross-platform smoke worker (Node) so Windows CI can package
- Multi-platform release: mac / win / linux

## 0.7.1

- Multi-platform release builds: **macOS (arm64 + x64)**, **Windows (Setup + portable)**, **Linux (AppImage + deb)**
- Improved GitHub Actions release matrix

## 0.7.0

### Context pack (major)
- Structured `context` on `run` / `fanout`: goal, constraints, notes, files, handoffFromJobId
- Renders `.tartarus/brief-<job>.md` in the workspace for every job
- Auto-discovers project guides (AGENTS.md, CLAUDE.md, ZERO.md, …)
- Inlines priority files into the brief
- `tartarus_preview_context` + richer `tartarus_preview_run`
- `tartarus_handoff` + automatic job summary on finish
- Project DNA: `setup` hooks, `autoSetup`, guide file list
- Worktree setup commands (`pnpm install`, etc.)

### Release
- GitHub Actions release workflow (mac app zip + optional linux)

## 0.6.1

- Adapters: **Pi (pi.dev)** headless `-p --mode text --approve`
- Adapters: **Zero** ([Gitlawb/zero](https://github.com/Gitlawb/zero)) via `zero exec`; auto-detects AgentMesh `zero run` if that’s what’s on PATH
- Broader PATH search (`~/.local/bin`, `~/go/bin`, Hermes, Homebrew)

## 0.6.0

- **GUI setup app**: open Tartarus → see subscriptions → Install MCP on Claude / Codex / Cursor
- One-click host install via `claude mcp add` / `codex mcp add` / `~/.cursor/mcp.json`
- GLM harness slot; `tartarus app` opens browser
- Product flow matches “download app, connect, install MCP”

## 0.5.0

- MCP install like other packages: `codex mcp add tartarus -- npx -y github:AJSubrizi/tartarus mcp`
- `tartarus setup codex` one-shot registration
- `mcp-config` defaults to portable `npx` form
- Ship `dist/` for instant npx from GitHub
- Smoke uses temp git repo (no longer pollutes project author)

## 0.4.0

- Durable job logs under `~/.tartarus/logs`
- `inspect` / `inspect_jobs` git facts for the orchestrator
- `wait`, `kill_tag`, `cleanup_tag`
- SSE live events on the UI
- Solid headless adapters (Claude, Codex, Cursor, OpenCode, Grok)
- Smoke tests without LLM APIs

## 0.3.0

- Adapter previews + version probe
- Role split: main harness orchestrates, Tartarus spawns

## 0.1.0

- Initial MCP primitives + void UI
