import { createServer, } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { store, statePath } from "./state.js";
import { getJobLog, inspectJobs, killJob, listJobsFiltered, refreshHarnesses, snapshot, } from "./runtime.js";
import { renderUiHtml } from "./ui.js";
import { onBus } from "./bus.js";
import { dashboardState, installHostMcp, listHosts, uninstallHostMcp, } from "./hosts.js";
import { VERSION } from "./doctor.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}
export function startHttpServer(port = Number(process.env.PORT ?? 7340), opts) {
    refreshHarnesses();
    const server = createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
        try {
            if (url.pathname === "/api/dashboard" && req.method === "GET") {
                return json(res, {
                    version: VERSION,
                    harnesses: store.listHarnesses(),
                    ...dashboardState(),
                    jobs: listJobsFiltered({ limit: 40 }),
                    projectRoot: store.state.projectRoot,
                    statePath: statePath(),
                });
            }
            if (url.pathname === "/api/state" && req.method === "GET") {
                return json(res, {
                    harnesses: store.listHarnesses(),
                    hosts: listHosts(),
                    jobs: listJobsFiltered({ limit: 30 }),
                    projectRoot: store.state.projectRoot,
                    statePath: statePath(),
                });
            }
            if (url.pathname === "/api/refresh" && req.method === "POST") {
                refreshHarnesses();
                return json(res, {
                    harnesses: store.listHarnesses(),
                    hosts: listHosts(),
                });
            }
            if (url.pathname === "/api/hosts" && req.method === "GET") {
                return json(res, { hosts: listHosts() });
            }
            if (url.pathname === "/api/hosts/install" && req.method === "POST") {
                const body = JSON.parse((await readBody(req)) || "{}");
                if (!body.host) {
                    return json(res, { ok: false, message: "host required" }, 400);
                }
                const result = installHostMcp(body.host, {
                    preferLocal: body.preferLocal !== false,
                });
                return json(res, { ...result, hosts: listHosts() });
            }
            if (url.pathname === "/api/hosts/uninstall" && req.method === "POST") {
                const body = JSON.parse((await readBody(req)) || "{}");
                if (!body.host) {
                    return json(res, { ok: false, message: "host required" }, 400);
                }
                const result = uninstallHostMcp(body.host);
                return json(res, { ...result, hosts: listHosts() });
            }
            if (url.pathname === "/api/snapshot" && req.method === "GET") {
                return json(res, snapshot());
            }
            if (url.pathname === "/api/jobs" && req.method === "GET") {
                return json(res, {
                    jobs: listJobsFiltered({
                        limit: Number(url.searchParams.get("limit") ?? 40),
                        tag: url.searchParams.get("tag") ?? undefined,
                        status: url.searchParams.get("status") ?? undefined,
                    }),
                });
            }
            if (url.pathname.startsWith("/api/jobs/") && req.method === "GET") {
                const parts = url.pathname.split("/").filter(Boolean);
                // /api/jobs/:id or /api/jobs/:id/log
                const jobId = parts[2];
                if (parts[3] === "log") {
                    return json(res, getJobLog(jobId, Number(url.searchParams.get("tail") ?? 20_000)));
                }
                const job = store.getJob(jobId);
                if (!job) {
                    res.writeHead(404);
                    res.end("not found");
                    return;
                }
                return json(res, { job });
            }
            if (url.pathname.startsWith("/api/jobs/") &&
                url.pathname.endsWith("/kill") &&
                req.method === "POST") {
                const parts = url.pathname.split("/").filter(Boolean);
                const jobId = parts[2];
                const killed = killJob(jobId);
                const job = store.getJob(jobId);
                return json(res, {
                    ok: killed || (job && ["killed", "done", "failed", "timed_out"].includes(job.status)),
                    killed,
                    job,
                });
            }
            if (url.pathname === "/api/inspect" && req.method === "GET") {
                const tag = url.searchParams.get("tag") ?? undefined;
                return json(res, inspectJobs({ tag }));
            }
            if (url.pathname === "/api/events" && req.method === "GET") {
                return sse(req, res);
            }
            if (url.pathname === "/" || url.pathname === "/index.html") {
                const bootstrap = {
                    version: VERSION,
                    harnesses: store.listHarnesses(),
                    jobs: listJobsFiltered({ limit: 40 }),
                    ...dashboardState(),
                };
                const html = renderUiHtml({
                    bootstrapJson: JSON.stringify(bootstrap),
                    port,
                });
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                });
                res.end(html);
                return;
            }
            res.writeHead(404);
            res.end("not found");
        }
        catch (e) {
            json(res, { ok: false, message: e instanceof Error ? e.message : String(e) }, 500);
        }
    });
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            const url = `http://127.0.0.1:${port}`;
            console.log(`
  TARTARUS

  Open  ${url}
  1. Collega abbonamenti (rilevati automaticamente)
  2. Installa MCP su Claude / Codex / Cursor
  3. Apri quell'app e orchestra da lì

  state ${statePath()}
`);
            if (opts?.open !== false && process.env.TARTARUS_NO_OPEN !== "1") {
                openBrowser(url);
            }
            resolve({ port, url });
        });
    });
}
function openBrowser(url) {
    const plat = process.platform;
    const cmd = plat === "darwin" ? "open" : plat === "win32" ? "start" : "xdg-open";
    try {
        spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
    }
    catch {
        /* ignore */
    }
}
function json(res, data, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}
function sse(req, res) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ type: "hello", ts: Date.now() })}\n\n`);
    const off = onBus((ev) => {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
    });
    const ping = setInterval(() => {
        res.write(`: ping ${Date.now()}\n\n`);
    }, 15_000);
    req.on("close", () => {
        clearInterval(ping);
        off();
    });
}
