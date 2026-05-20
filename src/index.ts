import { PostObj } from "./types";
import { generateUUID, nowISO } from "./utils";
import { processQueueMessage } from "./consumer";
import { checkCompliance } from "./claude";

export interface Env {
  ANTHROPIC_API_KEY: string;
  SHARED_SECRET: string;
}

const TEST_UI = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Normalcy — Test UI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f0f;
      color: #f0f0f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
    }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; color: #fff; }
    p.sub { color: #888; margin-bottom: 2rem; font-size: 0.9rem; }
    .container {
      width: 100%;
      max-width: 960px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 700px) { .container { grid-template-columns: 1fr; } }
    .panel {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .panel h2 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #666;
      margin-bottom: 1rem;
    }
    label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.4rem; margin-top: 1rem; }
    label:first-of-type { margin-top: 0; }
    input, textarea, select {
      width: 100%;
      background: #111;
      border: 1px solid #333;
      border-radius: 8px;
      color: #f0f0f0;
      padding: 0.65rem 0.85rem;
      font-size: 0.95rem;
      outline: none;
      transition: border 0.2s;
      font-family: inherit;
    }
    input:focus, textarea:focus, select:focus { border-color: #c8860a; }
    textarea { resize: vertical; min-height: 180px; line-height: 1.5; }
    select option { background: #1a1a1a; }
    button {
      margin-top: 1.5rem;
      width: 100%;
      padding: 0.8rem;
      background: #c8860a;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s, opacity 0.2s;
      letter-spacing: 0.02em;
    }
    button:hover:not(:disabled) { background: #a86e08; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    .output-wrap { position: relative; }
    pre {
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 1rem;
      font-size: 0.82rem;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 280px;
      color: #c8ffc8;
      overflow: auto;
      font-family: 'SF Mono', 'Fira Code', monospace;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    .badge-compliant { background: #1a3d1a; color: #4caf50; border: 1px solid #4caf50; }
    .badge-non { background: #3d1a1a; color: #f44336; border: 1px solid #f44336; }
    .status { font-size: 0.78rem; color: #555; margin-top: 0.6rem; text-align: right; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #fff3; border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>Normalcy</h1>
  <p class="sub">Human Rights Compliance Checker &mdash; Local Test UI</p>
  <div class="container">
    <div class="panel">
      <h2>📝 Input</h2>
      <label>Post Header</label>
      <input type="text" id="header" placeholder="Enter post title..." />
      <label>Post Body</label>
      <textarea id="body" placeholder="Enter post content in Persian, English, or Arabic..."></textarea>
      <label>Language</label>
      <select id="language">
        <option value="fa">Persian (fa)</option>
        <option value="en">English (en)</option>
        <option value="ar">Arabic (ar)</option>
      </select>
      <button id="checkBtn" onclick="runCheck()">Check Compliance</button>
      <p class="status" id="status"></p>
    </div>
    <div class="panel">
      <h2>📤 Output</h2>
      <div id="badge"></div>
      <pre id="output">// Result will appear here after running a check...</pre>
    </div>
  </div>

  <script>
    async function runCheck() {
      const header = document.getElementById('header').value.trim();
      const body = document.getElementById('body').value.trim();
      const language = document.getElementById('language').value;
      const btn = document.getElementById('checkBtn');
      const status = document.getElementById('status');
      const output = document.getElementById('output');
      const badge = document.getElementById('badge');

      if (!header || !body) {
        output.textContent = '// Please fill in both header and body.';
        badge.innerHTML = '';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Checking with Claude...';
      status.textContent = '';
      output.textContent = '// Processing...';
      badge.innerHTML = '';

      const payload = {
        objID: crypto.randomUUID(),
        callback_url: window.location.origin + '/receive',
        date: new Date().toISOString(),
        post: { header, body, language }
      };

      const start = Date.now();
      try {
        const res = await fetch('/check-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        if (result.verdict === 'compliant') {
          badge.innerHTML = '<span class="badge badge-compliant">✅ COMPLIANT</span>';
        } else {
          badge.innerHTML = '<span class="badge badge-non">🚫 NON-COMPLIANT</span>';
        }

        output.textContent = JSON.stringify(result, null, 2);
        status.textContent = 'Completed in ' + elapsed + 's — ' + new Date().toLocaleTimeString();
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
        badge.innerHTML = '';
        status.textContent = 'Request failed.';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Check Compliance';
      }
    }

    // Allow Cmd/Ctrl+Enter to submit
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runCheck();
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve test UI
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/test")) {
      return new Response(TEST_UI, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Async /check → fire-and-forget via waitUntil
    if (url.pathname === "/check" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.SHARED_SECRET}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      let post: PostObj;
      try {
        post = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!post.objID || !post.callback_url || !post.post?.body) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: objID, callback_url, post.body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const callbackID = generateUUID();

      ctx.waitUntil(
        processQueueMessage(
          { post, callbackID },
          env.ANTHROPIC_API_KEY,
          env.SHARED_SECRET
        )
      );

      return new Response(
        JSON.stringify({ status: "accepted", callbackID, queued_at: nowISO() }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sync /check-sync → for local test UI only (no auth guard)
    if (url.pathname === "/check-sync" && request.method === "POST") {
      let post: PostObj;
      try {
        post = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await checkCompliance(post, env.ANTHROPIC_API_KEY);
      return new Response(JSON.stringify(result, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stub /receive → echoes callback back (useful for local testing)
    if (url.pathname === "/receive" && request.method === "POST") {
      const body = await request.json();
      console.log("[/receive] Callback received:", JSON.stringify(body, null, 2));
      return new Response(JSON.stringify({ received: true, payload: body }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
