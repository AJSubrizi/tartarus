import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { store, statePath } from "./state.js";
import {
  getJobLog,
  inspectJobs,
  listJobsFiltered,
  refreshHarnesses,
  snapshot,
} from "./runtime.js";
import { mcpConfigSnippet, renderUiHtml } from "./ui.js";
import { onBus } from "./bus.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

export function startHttpServer(port = Number(process.env.PORT ?? 7340)): void {
  refreshHarnesses();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

    if (url.pathname === "/api/state" && req.method === "GET") {
      return json(res, {
        harnesses: store.listHarnesses(),
        jobs: listJobsFiltered({ limit: 30 }),
        projectRoot: store.state.projectRoot,
        statePath: statePath(),
        role: "You orchestrate. Tartarus only runs primitives.",
      });
    }

    if (url.pathname === "/api/refresh" && req.method === "POST") {
      refreshHarnesses();
      return json(res, {
        harnesses: store.listHarnesses(),
        jobs: listJobsFiltered({ limit: 30 }),
      });
    }

    if (url.pathname === "/api/snapshot" && req.method === "GET") {
      return json(res, snapshot());
    }

    if (url.pathname === "/api/jobs" && req.method === "GET") {
      return json(res, {
        jobs: listJobsFiltered({
          limit: Number(url.searchParams.get("limit") ?? 40),
          tag: url.searchParams.get("tag") ?? undefined,
          status: (url.searchParams.get("status") as never) ?? undefined,
        }),
      });
    }

    if (url.pathname.startsWith("/api/jobs/") && req.method === "GET") {
      const jobId = url.pathname.split("/")[3];
      if (url.pathname.endsWith("/log")) {
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

    if (url.pathname === "/api/inspect" && req.method === "GET") {
      const tag = url.searchParams.get("tag") ?? undefined;
      return json(res, inspectJobs({ tag }));
    }

    if (url.pathname === "/api/events" && req.method === "GET") {
      return sse(req, res);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = renderUiHtml({
        harnessesJson: JSON.stringify(store.listHarnesses()),
        jobsJson: JSON.stringify(listJobsFiltered({ limit: 20 })),
        mcpSnippet: mcpConfigSnippet(REPO_ROOT),
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
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`
  TARTARUS — the harness for the harnesses

  UI    http://127.0.0.1:${port}
  MCP   node dist/cli.js mcp
  state ${statePath()}

  Orchestrator = your main agent (Claude / Codex / Cursor).
  Tartarus     = primitives only.
`);
  });
}

function json(res: ServerResponse, data: unknown): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sse(req: IncomingMessage, res: ServerResponse): void {
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
