# MCP examples

```bash
# Preferred (scoped npm — after publish)
codex mcp add tartarus -- npx -y @ajsubrizi/tartarus mcp

# Always works from GitHub
codex mcp add tartarus -- npx -y github:AJSubrizi/tartarus mcp

# One-shot
npx -y @ajsubrizi/tartarus setup codex
npx -y @ajsubrizi/tartarus mcp-config
```

From a local clone:

```bash
pnpm build
node dist/cli.js mcp
# or: tartarus setup codex --local
```
