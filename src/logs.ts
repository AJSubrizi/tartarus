import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const LOG_DIR =
  process.env.TARTARUS_LOG_DIR ?? join(homedir(), ".tartarus", "logs");

export function logDir(): string {
  return LOG_DIR;
}

export function jobLogPath(jobId: string): string {
  return join(LOG_DIR, `${jobId}.log`);
}

export function ensureLogDir(): void {
  mkdirSync(LOG_DIR, { recursive: true });
}

export function writeJobLogHeader(jobId: string, header: string): void {
  ensureLogDir();
  writeFileSync(jobLogPath(jobId), header, "utf8");
}

export function appendJobLog(jobId: string, chunk: string): void {
  ensureLogDir();
  const path = jobLogPath(jobId);
  if (!existsSync(path)) {
    writeFileSync(path, chunk, "utf8");
    return;
  }
  appendFileSync(path, chunk, "utf8");
}

export function readJobLog(
  jobId: string,
  opts?: { tail?: number },
): { path: string; exists: boolean; content: string } {
  const path = jobLogPath(jobId);
  if (!existsSync(path)) {
    return { path, exists: false, content: "" };
  }
  let content = readFileSync(path, "utf8");
  const tail = opts?.tail;
  if (tail != null && tail > 0 && content.length > tail) {
    content = content.slice(-tail);
  }
  return { path, exists: true, content };
}
