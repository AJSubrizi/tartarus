<p align="center">
  <img src="docs/banner.svg" alt="Tartarus" width="720" />
</p>

<p align="center">
  <strong>The harness for the harnesses.</strong><br />
  Open the app → connect your subscriptions → install MCP where you orchestrate.
</p>

<p align="center">
  <a href="https://github.com/AJSubrizi/tartarus/releases/latest"><img src="https://img.shields.io/github/v/release/AJSubrizi/tartarus?label=release" alt="release" /></a>
  <a href="https://github.com/AJSubrizi/tartarus/actions/workflows/ci.yml"><img src="https://github.com/AJSubrizi/tartarus/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-emerald.svg" alt="MIT" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node" /></a>
</p>

---

## Get the app

**Latest:** [github.com/AJSubrizi/tartarus/releases/latest](https://github.com/AJSubrizi/tartarus/releases/latest)

| Platform | Download |
|----------|----------|
| **macOS Apple Silicon** | [Tartarus-mac-arm64.zip](https://github.com/AJSubrizi/tartarus/releases/latest/download/Tartarus-mac-arm64.zip) |
| **macOS Intel** | [Tartarus-mac-x64.zip](https://github.com/AJSubrizi/tartarus/releases/latest/download/Tartarus-mac-x64.zip) |
| **Windows** | [Setup](https://github.com/AJSubrizi/tartarus/releases/latest/download/Tartarus-win-x64-Setup.exe) · [portable](https://github.com/AJSubrizi/tartarus/releases/latest/download/Tartarus-win-x64-portable.exe) |
| **Linux** | [AppImage](https://github.com/AJSubrizi/tartarus/releases/latest/download/Tartarus-linux-x64.AppImage) · [.deb](https://github.com/AJSubrizi/tartarus/releases/latest/download/Tartarus-linux-x64.deb) |

Builds are **unsigned** — macOS: right-click → **Open**; Windows: SmartScreen may warn.

### One-line install

```bash
# Desktop app for your OS (default)
curl -fsSL https://raw.githubusercontent.com/AJSubrizi/tartarus/main/install.sh | bash

# CLI only (clone + build + link to ~/.local/bin)
curl -fsSL https://raw.githubusercontent.com/AJSubrizi/tartarus/main/install.sh | bash -s -- --cli
```

Or from a clone:

```bash
git clone https://github.com/AJSubrizi/tartarus.git && cd tartarus
pnpm i && pnpm build
pnpm start          # setup GUI → http://127.0.0.1:7340
# pnpm desktop      # Electron window
```

---

## How you’re meant to use it

```text
1. Open Tartarus (GUI)
2. See your agents: Claude, Codex, Cursor, Pi, Zero, OpenCode, Grok, GLM…
3. Click “Installa MCP” on Claude  or  Codex  or  Cursor
4. Open that app → you orchestrate; Tartarus only runs
```

```
  Claude / Codex / Cursor     ← you work here (orchestrator)
            │ MCP (one click from GUI)
            ▼
        TARTARUS              ← detects subs + spawns workers
            │
     Claude · Codex · Cursor · GLM · …
```

### In the GUI

| Section | What you do |
|---------|-------------|
| **I tuoi agent** | Auto-detect CLI (Claude, Codex, Cursor, Pi, Zero, …). “Rileva di nuovo” if you install something new. |
| **Installa MCP** | Buttons: **Claude Code** · **Codex** · **Cursor** — one click registers Tartarus there. |
| **Dopo** | Restart that app and say: `usa tartarus_help` |

No hand-editing JSON required.

---

## After MCP is installed

In **Codex** / **Claude** / **Cursor**:

```text
usa tartarus_help e tartarus_refresh
```

### MCP without the app

```bash
codex mcp add tartarus -- npx -y github:AJSubrizi/tartarus mcp
# or:  tartarus setup codex
tartarus doctor
```

> **Note:** the npm name `tartarus` is taken by another package. Use the **GitHub** form above (`github:AJSubrizi/tartarus`), not `npx tartarus`.

---

## Context pack

Workers do **not** receive your chat history. You send a structured brief:

```json
{
  "prompt": "Add rate limiting to the API client",
  "context": {
    "constraints": ["no new deps", "keep public API stable"],
    "notes": ["auth already refactored in PR #12"],
    "files": ["src/api/client.ts", "src/api/client.test.ts"],
    "handoffFromJobId": "job_abc123"
  }
}
```

Tartarus will:

1. Build `.tartarus/brief-<job>.md` in the worktree  
2. List project guides (`AGENTS.md`, `CLAUDE.md`, `ZERO.md`, …)  
3. Inline priority files  
4. Inject handoff from a prior job if set  
5. Point the CLI at that brief (sandbox-safe)

Optional DNA:

```text
tartarus_set_dna { "setup": ["pnpm install"], "autoSetup": true }
```

After a job: `tartarus_handoff` → markdown for the next worker.

## Tools

| Tool | Purpose |
|------|---------|
| `tartarus_run` / `fanout` | Spawn with context pack |
| `tartarus_preview_context` | Preview brief (no spawn) |
| `tartarus_wait` / `job` / `handoff` / `logs` | Poll + handoff |
| `tartarus_inspect` / `inspect_jobs` | Git facts — **you** pick the winner |
| `tartarus_set_dna` | setup hooks, guides, env copy |
| `tartarus_kill` / `cleanup_tag` | Stop + reclaim |

### Headless adapters

| Harness | Spawn |
|---------|--------|
| Claude | `-p` + skip-permissions |
| Codex | `exec` + bypass |
| Cursor | `-p --force --trust` |
| **Pi (pi.dev)** | `-p --mode text --approve` |
| **Zero (Gitlawb)** | `exec --output-format text` |
| OpenCode / Grok / GLM | see `tartarus adapters` |

Tartarus **never** auto-picks a winner.

---

## Example orchestrator prompt

Paste into Claude / Codex / Cursor after MCP is on:

```text
You are the orchestrator. Tartarus only spawns workers — you decide.

1. tartarus_help, tartarus_refresh, tartarus_set_project on this repo
2. tartarus_preview_context with a clear goal + constraints + key files
3. tartarus_fanout the same brief to 2 harnesses (e.g. codex + cursor) with worktrees
4. tartarus_wait / tartarus_inspect_jobs — read diffs, pick a winner yourself
5. tartarus_cleanup_tag on losers; keep or merge the winner

Never invent a winner score. Use git facts only.
```

---

## Dev

```bash
pnpm install && pnpm typecheck && pnpm smoke && pnpm build
pnpm start
pnpm desktop:pack   # mac .app under release/
```

[PRODUCT.md](PRODUCT.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md)

---

<p align="center"><sub>MIT · <a href="https://github.com/AJSubrizi">@AJSubrizi</a></sub></p>
