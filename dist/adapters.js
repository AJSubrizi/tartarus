/**
 * Per-harness CLI adapters for unattended (headless) runs.
 * Tartarus does not orchestrate — it only knows how to spawn reliably.
 */
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, writeFileSync, } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
function which(bin) {
    if (bin.includes("/") || bin.includes("\\"))
        return bin;
    const r = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
        encoding: "utf8",
    });
    if (r.status !== 0)
        return null;
    return (r.stdout || "").trim().split("\n")[0] || null;
}
/** ARG_MAX safe-ish: write long prompts to a temp file when needed */
export function maybePromptFile(prompt, prefix) {
    // ~100k chars → file (many CLIs choke on huge argv)
    if (prompt.length < 80_000) {
        return { prompt, useFile: false };
    }
    const dir = join(tmpdir(), "tartarus-prompts");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${prefix}_${Date.now()}_${randomBytes(3).toString("hex")}.md`);
    writeFileSync(file, prompt, "utf8");
    return { prompt, file, useFile: true };
}
const claude = {
    kind: "claude",
    binaries: ["claude"],
    label: "Claude Code",
    versionArgs: ["--version"],
    notes: "Uses -p/--print + --dangerously-skip-permissions for unattended worktree runs.",
    build(input) {
        const pf = maybePromptFile(input.prompt, "claude");
        const args = [
            ...input.baseArgs,
            "-p",
            pf.useFile && pf.file
                ? `Read the task from ${pf.file} and execute it fully.`
                : input.prompt,
            "--output-format",
            "text",
            "--dangerously-skip-permissions",
        ];
        if (input.model) {
            args.push("--model", input.model);
        }
        return {
            args,
            env: {
                // reduce interactive noise
                CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
            },
            summary: `claude -p … --dangerously-skip-permissions`,
            promptFile: pf.file,
        };
    },
};
const codex = {
    kind: "codex",
    binaries: ["codex"],
    label: "Codex",
    versionArgs: ["--version"],
    notes: "Uses `codex exec` non-interactive. Safer mode: sandbox workspace-write. Default unattended: bypass approvals+sandbox (for isolated worktrees).",
    build(input) {
        const pf = maybePromptFile(input.prompt, "codex");
        const promptArg = pf.useFile && pf.file
            ? `Read and execute the task in ${pf.file}`
            : input.prompt;
        const args = [...input.baseArgs, "exec"];
        if (input.safer) {
            args.push("-s", "workspace-write");
        }
        else {
            args.push("--dangerously-bypass-approvals-and-sandbox");
        }
        args.push("-C", input.cwd);
        if (input.model) {
            args.push("-m", input.model);
        }
        args.push(promptArg);
        return {
            args,
            env: {},
            summary: input.safer
                ? `codex exec -s workspace-write -C …`
                : `codex exec --dangerously-bypass-approvals-and-sandbox -C …`,
            promptFile: pf.file,
        };
    },
};
const cursor = {
    kind: "cursor",
    binaries: ["cursor-agent", "agent"],
    label: "Cursor Agent",
    versionArgs: ["--version"],
    notes: "Uses --print --force --trust for headless edit+shell access.",
    build(input) {
        const pf = maybePromptFile(input.prompt, "cursor");
        const promptArg = pf.useFile && pf.file
            ? `Read and execute the task in ${pf.file}`
            : input.prompt;
        const args = [
            ...input.baseArgs,
            "-p",
            "--force",
            "--trust",
            "--output-format",
            "text",
            "--workspace",
            input.cwd,
        ];
        if (input.model)
            args.push("--model", input.model);
        args.push(promptArg);
        return {
            args,
            env: {},
            summary: `cursor-agent -p --force --trust --workspace …`,
            promptFile: pf.file,
        };
    },
};
const opencode = {
    kind: "opencode",
    binaries: ["opencode"],
    label: "OpenCode",
    versionArgs: ["--version"],
    notes: "Uses `opencode run --auto` for non-interactive permission auto-approve.",
    build(input) {
        const pf = maybePromptFile(input.prompt, "opencode");
        const message = pf.useFile && pf.file
            ? `Read and execute the task in ${pf.file}`
            : input.prompt;
        const args = [
            ...input.baseArgs,
            "run",
            "--auto",
            "--format",
            "default",
            "--dir",
            input.cwd,
        ];
        if (input.model)
            args.push("-m", input.model);
        // message as trailing args
        args.push(...message.split(/\s+/).length > 0 ? [message] : []);
        return {
            args,
            env: {},
            summary: `opencode run --auto --dir …`,
            promptFile: pf.file,
        };
    },
};
const gemini = {
    kind: "gemini",
    binaries: ["gemini"],
    label: "Gemini CLI",
    versionArgs: ["--version"],
    notes: "Best-effort -p headless; flags vary by version.",
    build(input) {
        const args = [...input.baseArgs, "-p", input.prompt, "--yolo"];
        return {
            args,
            env: {},
            summary: `gemini -p … --yolo`,
        };
    },
};
const grok = {
    kind: "grok",
    binaries: ["grok"],
    label: "Grok CLI",
    versionArgs: ["--version"],
    notes: "Uses -p/--single headless + --permission-mode bypassPermissions (or auto if safer).",
    build(input) {
        const pf = maybePromptFile(input.prompt, "grok");
        const args = [
            ...input.baseArgs,
            "-p",
            pf.useFile && pf.file
                ? `Read and execute the task in ${pf.file}`
                : input.prompt,
            "--permission-mode",
            input.safer ? "auto" : "bypassPermissions",
            "--cwd",
            input.cwd,
        ];
        return {
            args,
            env: {},
            summary: `grok -p … --permission-mode ${input.safer ? "auto" : "bypassPermissions"} --cwd …`,
            promptFile: pf.file,
        };
    },
};
const custom = {
    kind: "custom",
    binaries: [],
    label: "Custom",
    versionArgs: ["--version"],
    notes: "Passes prompt as final argv. Set command + args when connecting.",
    build(input) {
        return {
            args: [...input.baseArgs, input.prompt],
            env: {},
            summary: `custom … <prompt>`,
        };
    },
};
export const ADAPTERS = {
    claude,
    codex,
    cursor,
    opencode,
    gemini,
    grok,
    custom,
};
export function resolveBinary(kind, preferredCommand) {
    const candidates = [];
    if (preferredCommand)
        candidates.push(preferredCommand);
    candidates.push(...(ADAPTERS[kind]?.binaries ?? []));
    for (const c of candidates) {
        // Absolute / relative script paths (custom harnesses)
        if ((c.includes("/") || c.includes("\\")) && existsSync(c)) {
            try {
                accessSync(c, constants.X_OK);
            }
            catch {
                // still return — kernel may run via shebang after chmod in smoke
            }
            return { command: c, path: c };
        }
        const path = which(c);
        if (path)
            return { command: c, path };
    }
    return {
        error: `no binary on PATH for ${kind} (tried: ${candidates.join(", ") || "none"})`,
    };
}
export function probeVersion(command, versionArgs) {
    const r = spawnSync(command, versionArgs, {
        encoding: "utf8",
        timeout: 8_000,
    });
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
    if (!out)
        return undefined;
    return out.split("\n")[0]?.slice(0, 120);
}
export function buildHarnessRun(kind, input) {
    const adapter = ADAPTERS[kind] ?? custom;
    return adapter.build(input);
}
export function adapterCatalog() {
    return Object.keys(ADAPTERS)
        .filter((k) => k !== "custom")
        .map((kind) => {
        const a = ADAPTERS[kind];
        const resolved = resolveBinary(kind);
        const path = "path" in resolved ? resolved.path : undefined;
        const version = path
            ? probeVersion("command" in resolved ? resolved.command : path, a.versionArgs)
            : undefined;
        return {
            kind,
            label: a.label,
            binaries: a.binaries,
            notes: a.notes,
            resolved: path,
            version,
        };
    });
}
