import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const LOG_DIR = process.env.TARTARUS_LOG_DIR ?? join(homedir(), ".tartarus", "logs");
export function logDir() {
    return LOG_DIR;
}
export function jobLogPath(jobId) {
    return join(LOG_DIR, `${jobId}.log`);
}
export function ensureLogDir() {
    mkdirSync(LOG_DIR, { recursive: true });
}
export function writeJobLogHeader(jobId, header) {
    ensureLogDir();
    writeFileSync(jobLogPath(jobId), header, "utf8");
}
export function appendJobLog(jobId, chunk) {
    ensureLogDir();
    const path = jobLogPath(jobId);
    if (!existsSync(path)) {
        writeFileSync(path, chunk, "utf8");
        return;
    }
    appendFileSync(path, chunk, "utf8");
}
export function readJobLog(jobId, opts) {
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
