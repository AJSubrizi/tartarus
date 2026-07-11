# Contributing

Tartarus is **primitives only**. The main coding agent orchestrates; we do not add auto-winner brains or ADE chrome.

## Dev

```bash
pnpm install
pnpm typecheck
pnpm smoke
pnpm build
pnpm dev
```

## Guidelines

- Prefer small, reliable CLI adapters over clever orchestration
- Every new MCP tool should help the *calling agent* decide — not decide for it
- Keep the UI minimal (name + harness status + MCP copy)
- Run `pnpm smoke` before opening a PR

## Layout

```
src/
  adapters.ts    # headless CLI flags per harness
  runtime.ts     # spawn / worktree / inspect
  mcp-server.ts  # MCP tools
  serve.ts       # void UI + HTTP/SSE
scripts/
  smoke.ts       # e2e without paid APIs
  install.sh     # one-line installer (repo root)
```
