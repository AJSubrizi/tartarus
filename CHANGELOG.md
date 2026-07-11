# Changelog

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
