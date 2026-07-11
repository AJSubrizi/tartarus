import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { DEFAULT_HARNESSES } from "./harnesses.js";
const STATE_PATH = process.env.TARTARUS_STATE ?? join(homedir(), ".tartarus", "state.json");
function empty() {
    return {
        version: 3,
        harnesses: DEFAULT_HARNESSES.map((h) => ({ ...h })),
        jobs: [],
        projectRoot: process.cwd(),
        envCopy: [".env", ".env.local", ".env.development.local"],
        defaultTimeoutMs: 30 * 60_000,
    };
}
function migrate(raw) {
    const base = empty();
    if (!raw || typeof raw !== "object")
        return base;
    const p = raw;
    const harnesses = Array.isArray(p.harnesses) && p.harnesses.length
        ? p.harnesses
        : base.harnesses;
    const jobs = Array.isArray(p.jobs) ? p.jobs : [];
    return {
        ...base,
        harnesses,
        jobs: jobs.map((j) => ({
            ...j,
            logTail: j.logTail ?? "",
        })),
        projectRoot: p.projectRoot ?? base.projectRoot,
        envCopy: Array.isArray(p.envCopy)
            ? p.envCopy
            : p.dna?.envCopy ?? base.envCopy,
        defaultTimeoutMs: typeof p.defaultTimeoutMs === "number"
            ? p.defaultTimeoutMs
            : base.defaultTimeoutMs,
    };
}
export function loadState() {
    try {
        if (!existsSync(STATE_PATH))
            return empty();
        return migrate(JSON.parse(readFileSync(STATE_PATH, "utf8")));
    }
    catch {
        return empty();
    }
}
export function saveState(state) {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}
export function statePath() {
    return STATE_PATH;
}
export class Store {
    state;
    constructor() {
        this.state = loadState();
    }
    persist() {
        saveState(this.state);
    }
    listHarnesses() {
        return this.state.harnesses;
    }
    getHarness(id) {
        return this.state.harnesses.find((h) => h.id === id);
    }
    upsertHarness(h) {
        const i = this.state.harnesses.findIndex((x) => x.id === h.id);
        if (i >= 0)
            this.state.harnesses[i] = h;
        else
            this.state.harnesses.push(h);
        this.persist();
        return h;
    }
    removeHarness(id) {
        const n = this.state.harnesses.length;
        this.state.harnesses = this.state.harnesses.filter((h) => h.id !== id);
        this.persist();
        return this.state.harnesses.length < n;
    }
    addJob(job) {
        this.state.jobs.unshift(job);
        this.state.jobs = this.state.jobs.slice(0, 150);
        this.persist();
        return job;
    }
    updateJob(id, patch) {
        const j = this.state.jobs.find((x) => x.id === id);
        if (!j)
            return undefined;
        Object.assign(j, patch);
        this.persist();
        return j;
    }
    getJob(id) {
        return this.state.jobs.find((j) => j.id === id);
    }
    listJobs(limit = 30) {
        return this.state.jobs.slice(0, limit);
    }
    setProjectRoot(path) {
        this.state.projectRoot = path;
        this.persist();
    }
    setEnvCopy(files) {
        this.state.envCopy = files;
        this.persist();
    }
}
export const store = new Store();
