import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { Harness, Job, TartarusState } from "./types.js";
import { DEFAULT_HARNESSES } from "./harnesses.js";

const STATE_PATH =
  process.env.TARTARUS_STATE ?? join(homedir(), ".tartarus", "state.json");

function empty(): TartarusState {
  return {
    version: 3,
    harnesses: DEFAULT_HARNESSES.map((h) => ({ ...h })),
    jobs: [],
    projectRoot: process.cwd(),
    envCopy: [".env", ".env.local", ".env.development.local"],
    defaultTimeoutMs: 30 * 60_000,
  };
}

function migrate(raw: unknown): TartarusState {
  const base = empty();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Record<string, unknown>;
  const harnesses = Array.isArray(p.harnesses) && p.harnesses.length
    ? (p.harnesses as Harness[])
    : base.harnesses;
  const jobs = Array.isArray(p.jobs) ? (p.jobs as Job[]) : [];
  return {
    ...base,
    harnesses,
    jobs: jobs.map((j) => ({
      ...j,
      logTail: j.logTail ?? "",
    })),
    projectRoot: (p.projectRoot as string) ?? base.projectRoot,
    envCopy: Array.isArray(p.envCopy)
      ? (p.envCopy as string[])
      : (p.dna as { envCopy?: string[] })?.envCopy ?? base.envCopy,
    defaultTimeoutMs:
      typeof p.defaultTimeoutMs === "number"
        ? p.defaultTimeoutMs
        : base.defaultTimeoutMs,
  };
}

export function loadState(): TartarusState {
  try {
    if (!existsSync(STATE_PATH)) return empty();
    return migrate(JSON.parse(readFileSync(STATE_PATH, "utf8")));
  } catch {
    return empty();
  }
}

export function saveState(state: TartarusState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export function statePath(): string {
  return STATE_PATH;
}

export class Store {
  state: TartarusState;

  constructor() {
    this.state = loadState();
  }

  persist(): void {
    saveState(this.state);
  }

  listHarnesses(): Harness[] {
    return this.state.harnesses;
  }

  getHarness(id: string): Harness | undefined {
    return this.state.harnesses.find((h) => h.id === id);
  }

  upsertHarness(h: Harness): Harness {
    const i = this.state.harnesses.findIndex((x) => x.id === h.id);
    if (i >= 0) this.state.harnesses[i] = h;
    else this.state.harnesses.push(h);
    this.persist();
    return h;
  }

  removeHarness(id: string): boolean {
    const n = this.state.harnesses.length;
    this.state.harnesses = this.state.harnesses.filter((h) => h.id !== id);
    this.persist();
    return this.state.harnesses.length < n;
  }

  addJob(job: Job): Job {
    this.state.jobs.unshift(job);
    this.state.jobs = this.state.jobs.slice(0, 150);
    this.persist();
    return job;
  }

  updateJob(id: string, patch: Partial<Job>): Job | undefined {
    const j = this.state.jobs.find((x) => x.id === id);
    if (!j) return undefined;
    Object.assign(j, patch);
    this.persist();
    return j;
  }

  getJob(id: string): Job | undefined {
    return this.state.jobs.find((j) => j.id === id);
  }

  listJobs(limit = 30): Job[] {
    return this.state.jobs.slice(0, limit);
  }

  setProjectRoot(path: string): void {
    this.state.projectRoot = path;
    this.persist();
  }

  setEnvCopy(files: string[]): void {
    this.state.envCopy = files;
    this.persist();
  }
}

export const store = new Store();
