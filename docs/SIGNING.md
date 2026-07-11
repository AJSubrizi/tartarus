# Code signing, notarization & npm

Tartarus ships **unsigned** by default (OSS, no paid certs required).  
The release workflow **optionally** signs when secrets are present.

## npm (`@ajsubrizi/tartarus`)

| Secret / var | Purpose |
|--------------|---------|
| `NPM_TOKEN` | Automation token with publish rights to `@ajsubrizi` |
| (optional) `ENABLE_NPM_PUBLISH=true` repo variable | Force-enable publish job |

Workflow: `.github/workflows/npm-publish.yml` on `v*` tags.

Local:

```bash
npm login
pnpm publish --access public
```

Until published, MCP install still works via:

```bash
npx -y github:AJSubrizi/tartarus mcp
```

## macOS (Apple Developer)

| Secret | Purpose |
|--------|---------|
| `CSC_LINK` | Base64 of `.p12` certificate **or** path handled by electron-builder |
| `CSC_KEY_PASSWORD` | Password for the p12 |
| `APPLE_ID` | Apple ID for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Team ID |

When `CSC_LINK` is set, CI enables signing + hardened runtime.  
Notarization runs if Apple ID secrets are set.

Local:

```bash
export CSC_LINK=... CSC_KEY_PASSWORD=...
export APPLE_ID=... APPLE_APP_SPECIFIC_PASSWORD=... APPLE_TEAM_ID=...
pnpm exec electron-builder --mac zip --arm64 --publish never
```

## Windows (Authenticode)

| Secret | Purpose |
|--------|---------|
| `WIN_CSC_LINK` | Base64 of code-signing cert (.pfx) |
| `WIN_CSC_KEY_PASSWORD` | Password |

electron-builder picks these up automatically when set.

## Without secrets

```yaml
CSC_IDENTITY_AUTO_DISCOVERY: "false"
```

Users open with **right-click → Open** (macOS) or accept SmartScreen (Windows).

## Auto-update

Packaged apps use `electron-updater` against GitHub Releases.  
CI uploads `latest*.yml` / `*.blockmap` when electron-builder emits them so updates resolve.

Disable: `TARTARUS_DISABLE_UPDATE=1`
