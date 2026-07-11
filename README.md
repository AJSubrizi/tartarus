<p align="center">
  <img src="docs/banner.svg" alt="Tartarus" width="720" />
</p>

<p align="center">
  <strong>The harness for the harnesses.</strong><br />
  Open the app → connect your subscriptions → install MCP where you orchestrate.
</p>

<p align="center">
  <a href="https://github.com/AJSubrizi/tartarus/actions/workflows/ci.yml"><img src="https://github.com/AJSubrizi/tartarus/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-emerald.svg" alt="MIT" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node" /></a>
</p>

---

## How you’re meant to use it

```text
1. Open Tartarus (GUI)
2. See your agents: Claude, Codex, Cursor, OpenCode, Grok, GLM…
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

---

## Install & open the app

```bash
curl -fsSL https://raw.githubusercontent.com/AJSubrizi/tartarus/main/install.sh | bash
export PATH="$HOME/.local/bin:$PATH"
tartarus app
```

Or from a clone:

```bash
git clone https://github.com/AJSubrizi/tartarus.git && cd tartarus
pnpm i && pnpm build
pnpm start          # opens http://127.0.0.1:7340
```

### In the GUI

| Section | What you do |
|---------|-------------|
| **I tuoi agent** | Auto-detect CLI (Claude, Codex, Cursor, …). “Rileva di nuovo” if you install something new. |
| **Installa MCP** | Buttons: **Claude Code** · **Codex** · **Cursor** — one click registers Tartarus there. |
| **Dopo** | Restart that app and say: `usa tartarus_help` |

No hand-editing JSON required.

---

## After MCP is installed

In **Codex** / **Claude** / **Cursor**:

```text
usa tartarus_help e tartarus_refresh
```

---

## Optional CLI

```bash
tartarus setup codex
codex mcp add tartarus -- npx -y github:AJSubrizi/tartarus mcp
tartarus doctor
```

---

## Tools

| Tool | Purpose |
|------|---------|
| `tartarus_run` / `fanout` | Spawn worker harnesses |
| `tartarus_wait` / `job` / `logs` | Poll |
| `tartarus_inspect` / `inspect_jobs` | Git facts — **you** pick the winner |
| `tartarus_kill` / `cleanup_tag` | Stop + reclaim |

Tartarus **never** auto-picks a winner.

---

## Dev

```bash
pnpm install && pnpm typecheck && pnpm smoke && pnpm build
pnpm start
```

[PRODUCT.md](PRODUCT.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md)

---

<p align="center"><sub>MIT · <a href="https://github.com/AJSubrizi">@AJSubrizi</a></sub></p>
