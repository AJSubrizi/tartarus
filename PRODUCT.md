# Tartarus

**The harness for the harnesses.**

## Thesis

**L’orchestratore è sempre l’harness principale** — Claude Code, Codex, Cursor, …  
**Tartarus non orchestra.** Espone solo primitive via MCP.

```
┌─────────────────────────────┐
│  YOU = main harness         │  ← cervello / orchestratore
│  (Claude · Codex · Cursor)  │
└─────────────┬───────────────┘
              │ MCP tools
              ▼
┌─────────────────────────────┐
│  TARTARUS                   │  ← runtime stupido
│  connect · worktree · run   │
│  fanout · job · kill        │
└─────────────┬───────────────┘
              │ spawn CLI
              ▼
     other harnesses
```

## Cosa fa Tartarus

| Primitive | Ruolo |
|---|---|
| `connect` / `refresh` / `adapters` | Registra e vede i CLI (+ versioni) |
| `worktree_*` | Isolamento git + env copy |
| `preview_run` | Dry-run argv esatto |
| `run` | Spawn unattended di **un** agent (adapter per CLI) |
| `fanout` | Spawn parallelo (nessun winner) |
| `job` / `jobs` | Stato, log, `commandLine` usato |
| `kill` | Termina un job |

Adapter headless: Claude `-p`+skip-permissions, Codex `exec`+bypass, Cursor `-p --force --trust`, OpenCode `run --auto`, Grok `-p`+bypassPermissions.

Dopo un fanout l’orchestratore usa `inspect_jobs` (diff/status git) per **decidere** il winner, poi `cleanup_tag` sui loser. Tartarus non sceglie.

## Cosa NON fa

- Piani multi-step automatici  
- Auto-pick del winner  
- Score / ranking “intelligente”  
- Essere un ADE / Mission Control  

Quelle decisioni le prendi **tu** dentro l’agent principale.

## Loop (guidato dall’agent)

```
tu: refresh + set_project
tu: fanout(prompt, [codex, cursor])
tu: poll jobs
tu: leggi diff, scegli
tu: kill losers + worktree_remove
tu: ship
```

## UI

Nera. Scrive **TARTARUS**. Sotto, i harness collegati.  
Copy MCP config. Fine.
