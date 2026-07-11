<p align="center">
  <img src="docs/banner.svg" alt="Tartarus" width="720" />
</p>

<p align="center">
  <strong>The harness for the harnesses.</strong><br />
  Stay inside Claude · Codex · Cursor — orchestrate the rest via MCP.
</p>

<p align="center">
  <a href="https://github.com/AJSubrizi/tartarus/actions/workflows/ci.yml"><img src="https://github.com/AJSubrizi/tartarus/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-emerald.svg" alt="MIT" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node" /></a>
  <a href="https://github.com/AJSubrizi/tartarus"><img src="https://img.shields.io/badge/MCP-primitives-ff4d2e" alt="MCP" /></a>
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#wire-mcp">Wire MCP</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#tools">Tools</a> ·
  <a href="#cli">CLI</a>
</p>

---

## Why Tartarus

Other tools make you babysit a fleet UI (Orca, Synara, ADE clones).

**Tartarus does the opposite:** the agent you're *already* talking to is the orchestrator. Tartarus is a thin MCP runtime — spawn, worktree, inspect, kill. No auto-winners. No fake IDE.

```
  YOU (Claude / Codex / Cursor)     ← brain
           │ MCP
           ▼
       TARTARUS                     ← primitives
           │
     ┌─────┼─────┐
  Codex  Cursor  Claude  …
```

---

## Install

### One line

```bash
curl -fsSL https://raw.githubusercontent.com/AJSubrizi/tartarus/main/install.sh | bash
```

```bash
export PATH="$HOME/.local/bin:$PATH"
tartarus doctor
tartarus mcp-config
```

### Clone

```bash
git clone https://github.com/AJSubrizi/tartarus.git
cd tartarus
./install.sh
# or: pnpm i && pnpm build && pnpm link --global
```

---

## Wire MCP

```bash
tartarus mcp-config
```

Paste into Claude Code / Cursor / Codex:

```json
{
  "mcpServers": {
    "tartarus": {
      "command": "node",
      "args": ["/absolute/path/to/tartarus/dist/cli.js", "mcp"]
    }
  }
}
```

More examples in [`examples/mcp/`](examples/mcp/).

---

## How it works

| Role | Who |
|------|-----|
| **Orchestrator** | The main harness (your current session) |
| **Runtime** | Tartarus — connect, worktree, run, fanout, inspect, kill |

**You** decide strategy and winners. Tartarus only executes.

### Flow you drive

```text
refresh → set_project
       → fanout(prompt, [codex, cursor, claude])
       → wait / poll
       → inspect_jobs(tag)   # git facts
       → pick winner (you)
       → cleanup_tag losers
       → ship
```

In Claude:

> Refresh Tartarus, set project to `~/work/acme`, fanout this brief on codex+cursor, wait, inspect_jobs — then I'll pick the winner and cleanup the rest.

---

## Tools

<details open>
<summary><strong>MCP primitives</strong></summary>

| Tool | Purpose |
|------|---------|
| `tartarus_help` | Role split + flow |
| `tartarus_status` / `refresh` / `adapters` | Health & CLI versions |
| `tartarus_set_project` | Repo root |
| `tartarus_worktree_*` | Isolated git worktrees |
| `tartarus_preview_run` | Dry-run exact argv |
| `tartarus_run` | Spawn one harness |
| `tartarus_fanout` | Same prompt → N harnesses |
| `tartarus_wait` / `job` / `jobs` / `logs` | Poll + durable logs |
| `tartarus_inspect` / `inspect_jobs` | Git facts to compare |
| `tartarus_kill` / `kill_tag` / `cleanup_tag` | Stop + reclaim disk |

</details>

<details>
<summary><strong>Headless adapters</strong></summary>

| Harness | Spawn mode |
|---------|------------|
| Claude Code | `-p` + `--dangerously-skip-permissions` |
| Codex | `exec --dangerously-bypass-approvals-and-sandbox -C` |
| Cursor Agent | `-p --force --trust --workspace` |
| OpenCode | `run --auto --dir` |
| Grok | `-p --permission-mode bypassPermissions --cwd` |

```bash
tartarus adapters
tartarus preview claude "fix the bug"
```

</details>

---

## CLI

```bash
tartarus serve [port]       # void UI → http://127.0.0.1:7340
tartarus mcp                # MCP stdio
tartarus doctor             # health check
tartarus mcp-config         # print MCP JSON
tartarus status | refresh | adapters | preview
tartarus version
```

| Path | What |
|------|------|
| `~/.tartarus/state.json` | State |
| `~/.tartarus/logs/` | Job logs |

---

## Dev

```bash
pnpm install
pnpm typecheck
pnpm smoke          # e2e, no LLM APIs (uses a temp git repo)
pnpm build
pnpm dev
```

- [PRODUCT.md](PRODUCT.md) — thesis  
- [CONTRIBUTING.md](CONTRIBUTING.md) — guidelines  
- [CHANGELOG.md](CHANGELOG.md) — releases  

---

## Not this

| ADE / Orca-style apps | Tartarus |
|----------------------|----------|
| You operate a fleet UI | You stay in one agent |
| Product = desktop IDE | Product = **MCP surface** |
| Visual orchestration | Native tools inside the main harness |

---

<p align="center">
  <sub>MIT · made by <a href="https://github.com/AJSubrizi">@AJSubrizi</a></sub>
</p>
