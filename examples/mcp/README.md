# MCP examples

Replace `__TARTARUS_CLI__` with the absolute path to `dist/cli.js`, or run:

```bash
tartarus mcp-config
```

## Claude Code

Merge into your Claude MCP settings (location varies by install), or:

```bash
# if you use a project-level config
cp examples/mcp/claude-code.json .mcp.json
# then edit the path
```

## Cursor

Add the JSON under **Cursor Settings → MCP**.

## Codex

Use Codex MCP management (`codex mcp`) to register a stdio server pointing at:

```text
node /path/to/tartarus/dist/cli.js mcp
```
