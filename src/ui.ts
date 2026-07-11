/** Setup GUI — connect subscriptions, install MCP on hosts. */

export function renderUiHtml(opts: {
  bootstrapJson: string;
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
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --void: #050506;
      --panel: #0e0e14;
      --line: rgba(255,255,255,0.08);
      --line2: rgba(255,255,255,0.14);
      --text: #f2f0eb;
      --dim: #8b8796;
      --faint: #5c5868;
      --ember: #ff4d2e;
      --ember-soft: rgba(255,77,46,0.14);
      --green: #34d399;
      --green-soft: rgba(52,211,153,0.12);
      --amber: #fbbf24;
      --red: #f87171;
      --radius: 14px;
      --font: Syne, system-ui, sans-serif;
      --mono: "IBM Plex Mono", ui-monospace, monospace;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--void); color: var(--text); font-family: var(--font); }
    body {
      background:
        radial-gradient(ellipse 70% 40% at 50% -5%, rgba(255,77,46,0.16), transparent 55%),
        var(--void);
    }
    .app { max-width: 720px; margin: 0 auto; padding: 36px 20px 64px; }
    header {
      text-align: center;
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .mark {
      width: 44px; height: 44px; margin: 0 0 14px; border-radius: 12px;
      border: 1px solid rgba(255,77,46,0.4); background: #0a0a0e;
      display: grid; place-items: center;
      box-shadow: 0 0 28px rgba(255,77,46,0.25);
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-align: center;
      /* letter-spacing adds space after last glyph — cancel it so title stays optically centered */
      margin-inline-end: -0.18em;
      width: max-content;
      max-width: 100%;
    }
    .tagline {
      margin: 10px 0 0; color: var(--dim); font-size: 14px; line-height: 1.5;
      text-align: center;
      max-width: 28rem;
    }
    .tagline em { font-style: normal; color: var(--ember); }
    .steps {
      display: flex; gap: 8px; justify-content: center; margin: 22px 0 0;
      font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--faint);
    }
    .steps span { padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); }
    .steps span.on { color: var(--ember); border-color: rgba(255,77,46,0.35); background: var(--ember-soft); }
    section {
      margin-top: 22px; padding: 18px; border-radius: var(--radius);
      border: 1px solid var(--line); background: rgba(14,14,20,0.85);
    }
    section h2 {
      margin: 0 0 6px; font-size: 13px; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--dim);
    }
    section p.hint { margin: 0 0 14px; font-size: 13px; color: var(--faint); line-height: 1.45; }
    .list { display: flex; flex-direction: column; gap: 8px; }
    .row {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      border-radius: 12px; border: 1px solid var(--line); background: rgba(0,0,0,0.25);
    }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--faint); flex-shrink: 0; }
    .dot.ready, .dot.ok { background: var(--green); box-shadow: 0 0 10px rgba(52,211,153,0.45); }
    .dot.missing, .dot.no { background: var(--red); }
    .dot.busy { background: var(--ember); animation: pulse 1.2s infinite; }
    @keyframes pulse { 50% { opacity: 0.45; } }
    .meta { flex: 1; min-width: 0; text-align: left; }
    .meta strong { display: block; font-size: 14px; font-weight: 700; }
    .meta small { display: block; margin-top: 3px; font-family: var(--mono); font-size: 11px; color: var(--faint); }
    .badge {
      font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em;
      text-transform: uppercase; padding: 4px 8px; border-radius: 999px;
      border: 1px solid var(--line); color: var(--dim);
    }
    .badge.on { color: var(--green); border-color: rgba(52,211,153,0.35); background: var(--green-soft); }
    .badge.off { color: var(--faint); }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button {
      font: inherit; cursor: pointer; border-radius: 10px; border: 1px solid var(--line2);
      background: rgba(255,255,255,0.03); color: var(--text);
      padding: 10px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.03em;
    }
    button:hover { filter: brightness(1.08); }
    button:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }
    button.primary {
      background: linear-gradient(180deg, #ff5a3c, #e53e20); border-color: transparent; color: #fff;
      box-shadow: 0 8px 24px rgba(255,77,46,0.25);
    }
    button.ghost { color: var(--dim); }
    button.sm { padding: 7px 11px; font-size: 11px; }
    .host-card {
      padding: 16px; border-radius: 12px; border: 1px solid var(--line);
      background: rgba(0,0,0,0.28); margin-bottom: 10px;
    }
    .host-card:last-child { margin-bottom: 0; }
    .host-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .host-top h3 { margin: 0; font-size: 16px; font-weight: 750; }
    .host-top p { margin: 6px 0 0; font-size: 12.5px; color: var(--dim); line-height: 1.4; }
    .host-actions { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .toast {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      max-width: min(520px, 92vw); padding: 12px 16px; border-radius: 12px;
      background: #14141e; border: 1px solid var(--line2); font-size: 13px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.45); display: none; z-index: 50;
    }
    .toast.show { display: block; }
    .toast.ok { border-color: rgba(52,211,153,0.4); }
    .toast.err { border-color: rgba(248,113,113,0.45); }
    footer {
      margin-top: 28px; text-align: center; font-size: 11px; color: var(--faint);
      font-family: var(--mono);
    }
    footer a { color: var(--dim); }
    .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div class="mark" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
          <path d="M2 13 L8 2 L14 13 Z" stroke="#ff4d2e" stroke-width="1.6"/>
          <circle cx="8" cy="10" r="1.5" fill="#ff4d2e"/>
        </svg>
      </div>
      <h1>TARTARUS</h1>
      <p class="tagline">
        Collega i tuoi abbonamenti.<br />
        Installa l’MCP dove vuoi <em>orchestrare</em>.
      </p>
      <div class="steps">
        <span class="on">1 · Apri</span>
        <span class="on">2 · Collega</span>
        <span class="on">3 · Installa MCP</span>
      </div>
    </header>

    <section>
      <div class="toolbar">
        <button type="button" class="ghost sm" id="btn-refresh">Rileva di nuovo</button>
      </div>
      <h2>I tuoi agent / abbonamenti</h2>
      <p class="hint">CLI già installati (Claude, Codex, Cursor, Pi, Zero, OpenCode, Grok, GLM…). Non servono API key a Tartarus — usi i piani che paghi già.</p>
      <div class="list" id="harnesses"></div>
    </section>

    <section>
      <h2>Installa MCP — scegli dove orchestrare</h2>
      <p class="hint">
        L’orchestratore è l’app in cui lavori (Claude Code, Codex, Cursor).
        Un click registra Tartarus come MCP lì — come gli altri MCP.
      </p>
      <div id="hosts"></div>
    </section>

    <section>
      <h2>Dopo l’install</h2>
      <p class="hint" style="margin-bottom: 10px;">
        Riavvia Claude / Codex / Cursor e scrivi:
      </p>
      <pre style="margin:0;padding:12px;border-radius:10px;background:#0a0a0c;border:1px solid var(--line);font-family:var(--mono);font-size:12px;color:var(--dim);white-space:pre-wrap;">usa tartarus_help e tartarus_refresh</pre>
    </section>

    <footer>
      you orchestrate · we only run ·
      <a href="https://github.com/AJSubrizi/tartarus" target="_blank" rel="noreferrer">GitHub</a>
    </footer>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    const bootstrap = ${opts.bootstrapJson};

    function toast(msg, ok) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.className = 'toast show ' + (ok ? 'ok' : 'err');
      clearTimeout(window.__tt);
      window.__tt = setTimeout(() => el.classList.remove('show'), 4200);
    }

    function esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function renderHarnesses(list) {
      const root = document.getElementById('harnesses');
      if (!list.length) {
        root.innerHTML = '<div class="row"><div class="meta"><strong>Nessun agent rilevato</strong><small>Installa Claude Code, Codex, Cursor CLI, …</small></div></div>';
        return;
      }
      root.innerHTML = list.map(h => \`
        <div class="row">
          <span class="dot \${h.status}"></span>
          <div class="meta">
            <strong>\${esc(h.label)}</strong>
            <small>\${esc(h.command)}\${h.version ? ' · ' + esc(h.version) : ''}\${h.status === 'missing' ? ' · non trovato' : ' · collegato'}</small>
          </div>
          <span class="badge \${h.status === 'ready' || h.status === 'busy' ? 'on' : 'off'}">\${esc(h.status)}</span>
        </div>
      \`).join('');
    }

    function renderHosts(hosts) {
      const root = document.getElementById('hosts');
      root.innerHTML = hosts.map(h => {
        const can = h.installed;
        const installed = h.mcpInstalled;
        return \`
          <div class="host-card" data-host="\${esc(h.id)}">
            <div class="host-top">
              <div>
                <h3>\${esc(h.label)}</h3>
                <p>\${esc(h.description)}</p>
                <p style="margin-top:4px;font-family:var(--mono);font-size:11px;color:var(--faint)">\${esc(h.detail || '')}</p>
              </div>
              <span class="badge \${installed ? 'on' : 'off'}">\${installed ? 'MCP on' : 'MCP off'}</span>
            </div>
            <div class="host-actions">
              <button type="button" class="primary sm btn-install" data-host="\${esc(h.id)}" \${can ? '' : 'disabled'}>
                \${installed ? 'Reinstalla MCP' : 'Installa MCP'}
              </button>
              <button type="button" class="ghost sm btn-remove" data-host="\${esc(h.id)}" \${installed ? '' : 'disabled'}>
                Rimuovi
              </button>
              \${!can && h.installHint ? '<span style="font-size:11px;color:var(--faint)">' + esc(h.installHint) + '</span>' : ''}
            </div>
          </div>
        \`;
      }).join('');

      root.querySelectorAll('.btn-install').forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            const r = await fetch('/api/hosts/install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host: btn.dataset.host, preferLocal: true }),
            });
            const data = await r.json();
            toast(data.message || (data.ok ? 'OK' : 'Errore'), !!data.ok);
            await pull();
          } catch (e) {
            toast(String(e), false);
          } finally {
            btn.disabled = false;
          }
        };
      });

      root.querySelectorAll('.btn-remove').forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            const r = await fetch('/api/hosts/uninstall', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host: btn.dataset.host }),
            });
            const data = await r.json();
            toast(data.message || (data.ok ? 'OK' : 'Errore'), !!data.ok);
            await pull();
          } catch (e) {
            toast(String(e), false);
          } finally {
            btn.disabled = false;
          }
        };
      });
    }

    function render(data) {
      renderHarnesses(data.harnesses || []);
      renderHosts(data.hosts || []);
    }

    async function pull() {
      const data = await (await fetch('/api/dashboard')).json();
      render(data);
      return data;
    }

    document.getElementById('btn-refresh').onclick = async () => {
      await fetch('/api/refresh', { method: 'POST' });
      await pull();
      toast('Rilevamento aggiornato', true);
    };

    render(bootstrap);
    pull().catch(() => {});
  </script>
</body>
</html>`;
}

export function mcpConfigSnippet(_repoRoot?: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        tartarus: {
          command: "npx",
          args: ["-y", "github:AJSubrizi/tartarus", "mcp"],
        },
      },
    },
    null,
    2,
  );
}
