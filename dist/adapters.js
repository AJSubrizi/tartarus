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
    // Search expanded PATH (Homebrew, go/bin, local, hermes, etc.)
    const home = process.env.HOME ?? "";
    const extra = [
        `${home}/.local/bin`,
        `${home}/go/bin`,
        `${home}/.hermes/node/bin`,
        "/opt/homebrew/bin",
        "/usr/local/bin",
    ]
        .filter(Boolean)
        .join(":");
    const r = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
        encoding: "utf8",
        env: {
            ...process.env,
            PATH: `${extra}:${process.env.PATH ?? ""}`,
        },
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
const glm = {
    kind: "glm",
    binaries: ["glm", "zcode", "zai"],
    label: "GLM / Zhipu",
    versionArgs: ["--version"],
    notes: "Best-effort headless; connect custom binary if CLI name differs.",
    build(input) {
        return {
            args: [...input.baseArgs, "-p", input.prompt, "--yes"],
            env: {},
            summary: `glm -p … --yes`,
        };
    },
};
/** pi.dev — https://pi.dev — @earendil-works/pi-coding-agent */
const pi = {
    kind: "pi",
    binaries: ["pi"],
    label: "Pi (pi.dev)",
    versionArgs: ["--version"],
    notes: "pi.dev coding agent. Headless: -p/--print --mode text --approve (trust project files for the run).",
    build(input) {
        const pf = maybePromptFile(input.prompt, "pi");
        const message = pf.useFile && pf.file
            ? `Read and execute the task in ${pf.file}`
            : input.prompt;
        const args = [
            ...input.baseArgs,
            "-p",
            "--mode",
            "text",
            // Trust project-local files for this unattended run
            "--approve",
        ];
        if (input.model) {
            args.push("--model", input.model);
        }
        args.push(message);
        return {
            args,
            env: {
                PI_OFFLINE: "0",
            },
            summary: `pi -p --mode text --approve …`,
            promptFile: pf.file,
        };
    },
};
/**
 * Zero (Gitlawb) — https://github.com/Gitlawb/zero
 * Headless: `zero exec "goal"`
 * Note: another CLI also named `zero` (AgentMesh) uses `zero run` — we detect.
 */
const zero = {
    kind: "zero",
    binaries: ["zero"],
    label: "Zero",
    versionArgs: ["version"],
    notes: "Gitlawb/zero coding agent (`zero exec`). If PATH has AgentMesh zero instead, falls back to `zero run`.",
    build(input) {
        const pf = maybePromptFile(input.prompt, "zero");
        const message = pf.useFile && pf.file
            ? `Read and execute the task in ${pf.file}`
            : input.prompt;
        const variant = detectZeroVariant("zero");
        if (variant === "agentmesh") {
            return {
                args: [...input.baseArgs, "run", message],
                env: {},
                summary: `zero run … (AgentMesh CLI on PATH)`,
                promptFile: pf.file,
            };
        }
        // Gitlawb/zero headless exec
        const args = [...input.baseArgs, "exec"];
        if (input.model) {
            args.push("--model", input.model);
        }
        // Prefer text output for logs; stream-json available for tooling later
        args.push("--output-format", "text");
        args.push(message);
        return {
            args,
            env: {},
            summary: variant === "gitlawb"
                ? `zero exec --output-format text …`
                : `zero exec … (best-effort)`,
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
    glm,
    pi,
    zero,
    custom,
};
/** Distinguish Gitlawb/zero vs AgentMesh `zero` on PATH */
function detectZeroVariant(command) {
    const help = spawnSync(command, ["--help"], {
        encoding: "utf8",
        timeout: 5_000,
    });
    const out = `${help.stdout ?? ""}${help.stderr ?? ""}`.toLowerCase();
    if (out.includes("agentmesh"))
        return "agentmesh";
    if (out.includes("zero exec") || out.includes("\n  zero exec")) {
        return "gitlawb";
    }
    // AgentMesh usage line: zero run "goal"
    if (out.includes('zero run "') || out.includes("zero run '")) {
        return "agentmesh";
    }
    const execHelp = spawnSync(command, ["exec", "--help"], {
        encoding: "utf8",
        timeout: 5_000,
    });
    const eout = `${execHelp.stdout ?? ""}${execHelp.stderr ?? ""}`.toLowerCase();
    if (execHelp.status === 0 ||
        eout.includes("output-format") ||
        eout.includes("worktree")) {
        return "gitlawb";
    }
    if (out.includes("coding agent") || out.includes("gitlawb"))
        return "gitlawb";
    return "unknown";
}
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
