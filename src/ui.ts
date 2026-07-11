import { existsSync } from "node:fs";
import { join } from "node:path";

export function renderUiHtml(opts: {
  harnessesJson: string;
  jobsJson: string;
  mcpSnippet: string;
  port: number;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#050506" />
  <title>Tartarus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --void: #050506; --ember: #ff4d2e; --text: #f2f0eb; --dim: #6b6675;
      --line: rgba(255,255,255,0.08); --green: #34d399; --amber: #fbbf24; --red: #f87171;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; background: var(--void); color: var(--text);
      font-family: Syne, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    body {
      display: grid; place-items: center; min-height: 100%; padding: 32px 20px 48px;
      background: radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,77,46,0.12), transparent 55%), var(--void);
    }
    .wrap { width: min(480px, 100%); text-align: center; }
    h1 { margin: 0; font-size: clamp(42px, 12vw, 64px); font-weight: 800;
      letter-spacing: 0.18em; text-indent: 0.18em; line-height: 1; }
    .sub { margin: 14px 0 0; font-family: "IBM Plex Mono", monospace; font-size: 11px;
      letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); line-height: 1.6; }
    .sub em { font-style: normal; color: var(--ember); }
    .live { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px;
      font-family: "IBM Plex Mono", monospace; font-size: 10px; color: var(--dim); letter-spacing: 0.08em; }
    .live i { width: 6px; height: 6px; border-radius: 50%; background: var(--dim); }
    .live.on i { background: var(--green); box-shadow: 0 0 8px rgba(52,211,153,.6); }
    .list { margin: 28px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; text-align: left; }
    .row { display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,0.02); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dim); flex-shrink: 0; }
    .dot.ready { background: var(--green); box-shadow: 0 0 10px rgba(52,211,153,0.5); }
    .dot.busy { background: var(--ember); box-shadow: 0 0 10px rgba(255,77,46,0.5); animation: pulse 1.2s infinite; }
    .dot.missing, .dot.error { background: var(--red); }
    .dot.unknown { background: var(--amber); }
    @keyframes pulse { 50% { opacity: 0.45; } }
    .meta { flex: 1; min-width: 0; }
    .label { font-size: 14px; font-weight: 600; }
    .cmd { font-family: "IBM Plex Mono", monospace; font-size: 11px; color: var(--dim); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .status { font-family: "IBM Plex Mono", monospace; font-size: 10px; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--dim); }
    .actions { margin-top: 24px; display: flex; flex-direction: column; gap: 10px; }
    button { font: inherit; cursor: pointer; border: 1px solid var(--line); background: transparent;
      color: var(--text); border-radius: 10px; padding: 12px 16px; font-size: 12px; font-weight: 600;
      letter-spacing: 0.06em; text-transform: uppercase; }
    button.primary { background: linear-gradient(180deg, #ff5a3c, #e53e20); border-color: transparent; color: #fff; }
    button:hover { filter: brightness(1.08); }
    details { margin-top: 18px; text-align: left; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
    summary { cursor: pointer; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); font-weight: 600; }
    pre { margin: 12px 0 0; padding: 12px; border-radius: 8px; background: #0a0a0c; border: 1px solid var(--line);
      overflow: auto; font-family: "IBM Plex Mono", monospace; font-size: 10.5px; line-height: 1.45; color: #c8c4bc;
      white-space: pre-wrap; word-break: break-all; max-height: 200px; }
    .jobs { margin-top: 22px; text-align: left; }
    .jobs h2 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
    .job { font-family: "IBM Plex Mono", monospace; font-size: 11px; padding: 10px 0; border-top: 1px solid var(--line); color: var(--dim); }
    .job strong { color: var(--text); font-weight: 500; }
    .job .st-done { color: var(--green); }
    .job .st-failed, .job .st-killed, .job .st-timed_out { color: var(--red); }
    .job .st-running { color: var(--ember); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>TARTARUS</h1>
    <p class="sub">
      harness for the <em>harnesses</em><br/>
      you orchestrate · we only run
    </p>
    <div class="live" id="live"><i></i> SSE offline</div>
    <ul class="list" id="list"></ul>
    <div class="actions">
      <button type="button" class="primary" id="refresh">Probe agents</button>
      <button type="button" id="copy">Copy MCP config</button>
    </div>
    <details>
      <summary>Wire into Claude / Codex / Cursor</summary>
      <pre id="mcp">${escapeHtml(opts.mcpSnippet)}</pre>
    </details>
    <div class="jobs" id="jobs"></div>
  </div>
  <script>
    const initial = { harnesses: ${opts.harnessesJson}, jobs: ${opts.jobsJson} };
    const mcp = ${JSON.stringify(opts.mcpSnippet)};

    function render(data) {
      document.getElementById('list').innerHTML = (data.harnesses || []).map(h => \`
        <li class="row">
          <span class="dot \${h.status}"></span>
          <div class="meta">
            <div class="label">\${esc(h.label)}</div>
            <div class="cmd">\${esc(h.command)}\${h.version ? ' · ' + esc(h.version) : (h.model ? ' · ' + esc(h.model) : '')}</div>
          </div>
          <span class="status">\${esc(h.status)}</span>
        </li>\`).join('');
      const jobs = document.getElementById('jobs');
      if (!data.jobs || !data.jobs.length) { jobs.innerHTML = ''; return; }
      jobs.innerHTML = '<h2>Jobs (spawned by your agent)</h2>' + data.jobs.slice(0,10).map(j => \`
        <div class="job">
          <strong>\${esc(j.harnessId)}</strong>
          <span class="st-\${esc(j.status)}"> · \${esc(j.status)}</span>
          \${j.tag ? ' · tag:' + esc(j.tag) : ''}
          <div>\${esc((j.prompt||'').slice(0,90))}</div>
          \${j.adapterSummary ? '<div>' + esc(j.adapterSummary) + '</div>' : ''}
        </div>\`).join('');
    }

    function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

    async function pull() {
      try {
        const data = await (await fetch('/api/state')).json();
        render(data);
      } catch {}
    }

    render(initial);

    document.getElementById('refresh').onclick = async () => {
      render(await (await fetch('/api/refresh',{method:'POST'})).json());
    };
    document.getElementById('copy').onclick = async () => {
      await navigator.clipboard.writeText(mcp);
      const b = document.getElementById('copy'); b.textContent = 'Copied';
      setTimeout(() => b.textContent = 'Copy MCP config', 1500);
    };

    // Live updates via SSE; fallback poll
    const live = document.getElementById('live');
    try {
      const es = new EventSource('/api/events');
      es.onopen = () => { live.classList.add('on'); live.innerHTML = '<i></i> live'; };
      es.onmessage = () => { pull(); };
      es.onerror = () => { live.classList.remove('on'); live.innerHTML = '<i></i> SSE reconnecting'; };
    } catch {
      setInterval(pull, 2500);
    }
    setInterval(pull, 8000);
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function mcpConfigSnippet(repoRoot: string): string {
  const distCli = join(repoRoot, "dist", "cli.js");
  if (existsSync(distCli)) {
    return JSON.stringify(
      {
        mcpServers: {
          tartarus: {
            command: "node",
            args: [distCli, "mcp"],
          },
        },
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      mcpServers: {
        tartarus: {
          command: "npx",
          args: ["tsx", `${repoRoot}/src/cli.ts`, "mcp"],
        },
      },
    },
    null,
    2,
  );
}
