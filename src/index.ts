import { PostObj } from "./types";
import { generateUUID, nowISO } from "./utils";
import { processQueueMessage } from "./consumer";
import { checkCompliance, MODEL, RUBRIC_VERSION } from "./claude";
import benchmark from "./generated/benchmark.json";

export interface Env {
  ANTHROPIC_API_KEY?: string;
  SHARED_SECRET: string;
  // Static site in public/ (benchmark library, checker, audits)
  ASSETS: Fetcher;
  // Cached check results, keyed by content hash + rubric + benchmark + model
  CACHE: KVNamespace;
  // Per-IP limit on the public checker
  CHECK_LIMITER: RateLimit;
  // Cloudflare Turnstile; the checker skips the challenge while these are unset
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
}

const MAX_TEXT = 6000;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalize(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

async function verifyTurnstile(env: Env, token: string, ip: string): Promise<boolean> {
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET!);
  form.append("response", token);
  form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const out = (await res.json()) as { success: boolean };
  return out.success;
}

function authorized(request: Request, env: Env): boolean {
  return Boolean(env.SHARED_SECRET) &&
    request.headers.get("Authorization") === `Bearer ${env.SHARED_SECRET}`;
}

// Public demo checker: rate-limited, Turnstile-protected when configured, results cached.
async function publicCheck(request: Request, env: Env): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "checker_not_configured" }, 503);
  }

  let body: { text?: string; header?: string; language?: string; turnstile?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const text = normalize(body.text ?? "");
  const header = normalize(body.header ?? "");
  if (!text) return json({ error: "empty_text" }, 400);
  if (text.length + header.length > MAX_TEXT) return json({ error: "text_too_long", max: MAX_TEXT }, 413);

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = [
    "check", RUBRIC_VERSION, benchmark.version, MODEL,
    await sha256(JSON.stringify([header, text])),
  ].join(":");

  // A cache hit never reaches the model, so it costs no challenge and no quota.
  const hit = await env.CACHE.get(key, "json");
  if (hit) return json({ ...(hit as object), cached: true });

  if (env.TURNSTILE_SECRET) {
    if (!body.turnstile || !(await verifyTurnstile(env, body.turnstile, ip))) {
      return json({ error: "turnstile_failed" }, 403);
    }
  }
  const { success } = await env.CHECK_LIMITER.limit({ key: ip });
  if (!success) return json({ error: "rate_limited" }, 429);

  const post: PostObj = {
    objID: generateUUID(),
    callback_url: "",
    date: nowISO(),
    post: { header, body: text, language: body.language ?? "auto" },
  };
  let result;
  try {
    result = await checkCompliance(post, env.ANTHROPIC_API_KEY);
  } catch (err) {
    return json({ error: "check_failed", detail: (err as Error).message }, 502);
  }
  const out = {
    verdict: result.verdict,
    reason: result.reason,
    checked_at: result.checked_at,
    rubric: RUBRIC_VERSION,
    benchmark: benchmark.version,
    model: MODEL,
  };
  await env.CACHE.put(key, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 90 });
  return json({ ...out, cached: false });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/config" && request.method === "GET") {
      return json(
        {
          checker: Boolean(env.ANTHROPIC_API_KEY),
          turnstile_site_key: env.TURNSTILE_SITE_KEY ?? null,
          benchmark: benchmark.version,
          rubric: RUBRIC_VERSION,
          model: MODEL,
          max_text: MAX_TEXT,
        },
        200,
        { "Cache-Control": "no-store" }
      );
    }

    if (url.pathname === "/api/check" && request.method === "POST") {
      return publicCheck(request, env);
    }

    // Async /check → fire-and-forget via waitUntil (Jomhoor / Taraaz integration)
    if (url.pathname === "/check" && request.method === "POST") {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);

      let post: PostObj;
      try {
        post = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      if (!post.objID || !post.callback_url || !post.post?.body) {
        return json({ error: "Missing required fields: objID, callback_url, post.body" }, 400);
      }
      if (!env.ANTHROPIC_API_KEY) return json({ error: "checker_not_configured" }, 503);

      const callbackID = generateUUID();

      ctx.waitUntil(
        processQueueMessage(
          { post, callbackID },
          env.ANTHROPIC_API_KEY,
          env.SHARED_SECRET
        )
      );

      return json({ status: "accepted", callbackID, queued_at: nowISO() }, 202);
    }

    // Sync /check-sync → for integration testing; same shared secret as /check
    if (url.pathname === "/check-sync" && request.method === "POST") {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      if (!env.ANTHROPIC_API_KEY) return json({ error: "checker_not_configured" }, 503);

      let post: PostObj;
      try {
        post = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      try {
        return json(await checkCompliance(post, env.ANTHROPIC_API_KEY));
      } catch (err) {
        return json({ error: (err as Error).message }, 502);
      }
    }

    // Stub /receive → echoes callback back (useful for local testing)
    if (url.pathname === "/receive" && request.method === "POST") {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      const body = await request.json();
      console.log("[/receive] Callback received:", JSON.stringify(body, null, 2));
      return json({ received: true, payload: body });
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not Found" }, 404);

    // Everything else is the static site
    return env.ASSETS.fetch(request);
  },
};
