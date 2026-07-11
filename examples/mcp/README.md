# MCP setup (same pattern as every other MCP)

## Codex (recommended)

```bash
codex mcp add tartarus -- npx -y github:AJSubrizi/tartarus mcp
```

Or:

```bash
npx -y github:AJSubrizi/tartarus setup codex
```

## Claude Code / Cursor

Use the JSON in this folder, or:

```bash
npx -y github:AJSubrizi/tartarus mcp-config
```

## Local checkout (no network on MCP start)

```bash
pnpm build
codex mcp add tartarus -- node "$(pwd)/dist/cli.js" mcp
# or: tartarus setup codex --local
```
