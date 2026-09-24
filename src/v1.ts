import Anthropic from "@anthropic-ai/sdk";
import benchmark from "./generated/benchmark.json";
import { checkCompliance, MODEL } from "./claude";
import {
  AuditDocument, AuditResult, RUBRICS, auditHash, buildParams, checkDocument, validate,
} from "./audit";
import { generateUUID, nowISO } from "./utils";
import type { Env } from "./index";
import type { PostObj } from "./types";

// API v1. Reference texts are public; audits need a client key from API_KEYS
// ("name:key,name:key"); /v1/check is for Jomhoor and stays off until GATE2_ENABLED.

const MAX_DOCUMENTS = 50;
const MAX_REQUEST_CHARS = 4_000_000;
const TTL = 60 * 60 * 24 * 30; // jobs and submitted documents; batch results live 29 days

interface JobItem {
  id: string; // the caller's document id
  hash: string;
  state: "cached" | "pending" | "done" | "failed";
  error?: string;
}

interface Job {
  job: string;
  client: string;
  rubric: string;
  created: string;
  batch_id: string | null;
  status: "processing" | "ended";
  items: JobItem[];
}

const CORS = { "Access-Control-Allow-Origin": "*" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function client(request: Request, env: Env): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !env.API_KEYS) return null;
  const token = auth.slice(7);
  for (const pair of env.API_KEYS.split(",")) {
    const i = pair.indexOf(":");
    if (i > 0 && pair.slice(i + 1).trim() === token && token) return pair.slice(0, i).trim();
  }
  return null;
}

async function asset(env: Env, request: Request, path: string): Promise<Response | null> {
  const res = await env.ASSETS.fetch(new URL(path, request.url));
  return res.ok ? res : null;
}

async function publicJson(env: Env, request: Request, path: string): Promise<Response> {
  const res = await asset(env, request, path);
  if (!res) return json({ error: "not_found" }, 404, CORS);
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      ...CORS,
    },
  });
}

// GET /v1/provisions/{id}: one article or paragraph, e.g. ICCPR.19 or ICCPR.19.3
async function provision(env: Env, request: Request, id: string): Promise<Response> {
  if (!benchmark.ids.includes(id)) return json({ error: "unknown_provision", id }, 404, CORS);
  const instrument = id.split(".")[0];
  const res = await asset(env, request, `/data/provisions/${instrument}.json`);
  if (!res) return json({ error: "not_found" }, 404, CORS);
  const data = (await res.json()) as {
    instrument: Record<string, unknown>;
    provisions: { id: string; number: unknown; heading: string | null; text_en: string; text_fa?: string;
      paras?: { id: string; n: unknown; text_en: string; text_fa?: string }[] }[];
  };
  const meta = data.instrument;
  for (const p of data.provisions) {
    const para = p.id === id ? null : p.paras?.find((q) => q.id === id);
    if (p.id !== id && !para) continue;
    return json(
      {
        id,
        instrument: meta.id,
        article: p.id,
        number: para ? para.n : p.number,
        heading: p.heading,
        text_en: para ? para.text_en : p.text_en,
        text_fa: (para ? para.text_fa : p.text_fa) ?? null,
        fa_status: meta.fa_status,
        source_url: meta.source_url,
        source_version: meta.version,
        benchmark: benchmark.version,
      },
      200,
      { "Cache-Control": "public, max-age=3600", ...CORS }
    );
  }
  return json({ error: "unknown_provision", id }, 404, CORS);
}

// POST /v1/audit: {rubric, documents: [{id, title?, segments: [{id, label?, text}]}], refresh?}
async function submitAudit(request: Request, env: Env, who: string): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "checker_not_configured" }, 503);
  let body: { rubric?: string; documents?: AuditDocument[]; refresh?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const rubric = RUBRICS[body.rubric ?? ""];
  if (!rubric) return json({ error: "unknown_rubric", rubrics: Object.keys(RUBRICS) }, 400);
  const docs = body.documents ?? [];
  if (!Array.isArray(docs) || docs.length === 0) return json({ error: "no_documents" }, 400);
  if (docs.length > MAX_DOCUMENTS) return json({ error: "too_many_documents", max: MAX_DOCUMENTS }, 413);
  let chars = 0;
  for (const d of docs) {
    const problem = checkDocument(d);
    if (problem) return json({ error: "invalid_document", detail: problem }, 400);
    chars += d.segments.reduce((n, s) => n + s.text.length, 0);
  }
  if (chars > MAX_REQUEST_CHARS) return json({ error: "request_too_large", max_chars: MAX_REQUEST_CHARS }, 413);

  const items: JobItem[] = [];
  const requests: Anthropic.Messages.BatchCreateParams.Request[] = [];
  const queued = new Set<string>();
  for (const doc of docs) {
    const hash = await auditHash(rubric, doc);
    if (!body.refresh && (await env.CACHE.get(`audit:${hash}`))) {
      items.push({ id: doc.id, hash, state: "cached" });
      continue;
    }
    items.push({ id: doc.id, hash, state: "pending" });
    if (queued.has(hash)) continue; // same text twice in one request
    queued.add(hash);
    await env.CACHE.put(`auditdoc:${hash}`, JSON.stringify(doc), { expirationTtl: TTL });
    requests.push({ custom_id: hash, params: buildParams(rubric, doc) });
  }

  let batchId: string | null = null;
  if (requests.length) {
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      batchId = (await anthropic.messages.batches.create({ requests })).id;
    } catch (err) {
      return json({ error: "batch_failed", detail: (err as Error).message }, 502);
    }
  }
  const job: Job = {
    job: generateUUID(),
    client: who,
    rubric: rubric.name,
    created: nowISO(),
    batch_id: batchId,
    status: batchId ? "processing" : "ended",
    items,
  };
  await env.CACHE.put(`job:${job.job}`, JSON.stringify(job), { expirationTtl: TTL });
  return json(summary(job), 202);
}

function summary(job: Job) {
  const count = (s: JobItem["state"]) => job.items.filter((i) => i.state === s).length;
  return {
    job: job.job,
    rubric: job.rubric,
    status: job.status,
    batch_id: job.batch_id,
    created: job.created,
    counts: { cached: count("cached"), pending: count("pending"), done: count("done"), failed: count("failed") },
  };
}

// Read a finished batch: validate each result and cache the good ones.
async function collect(job: Job, env: Env): Promise<void> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const batch = await anthropic.messages.batches.retrieve(job.batch_id!);
  if (batch.processing_status !== "ended") return;
  const rubric = RUBRICS[job.rubric];
  const outcome = new Map<string, { error?: string }>();

  for await (const entry of await anthropic.messages.batches.results(job.batch_id!)) {
    const hash = entry.custom_id;
    const r = entry.result;
    if (r.type !== "succeeded") {
      outcome.set(hash, {
        error: r.type === "errored" ? `errored: ${r.error.error.type}: ${r.error.error.message}` : r.type,
      });
      continue;
    }
    const msg = r.message;
    if (msg.stop_reason !== "end_turn") {
      const category = msg.stop_reason === "refusal" ? ` (${msg.stop_details?.category ?? "no category"})` : "";
      outcome.set(hash, { error: `stop_reason: ${msg.stop_reason}${category}` });
      continue;
    }
    const text = msg.content.find((b) => b.type === "text");
    const doc = (await env.CACHE.get(`auditdoc:${hash}`, "json")) as AuditDocument | null;
    if (!text || text.type !== "text" || !doc) {
      outcome.set(hash, { error: doc ? "no text block" : "submitted document expired" });
      continue;
    }
    let raw;
    try {
      raw = JSON.parse(text.text);
    } catch {
      outcome.set(hash, { error: "unparseable output" });
      continue;
    }
    const result: AuditResult = {
      hash,
      rubric: rubric.name,
      rubric_version: rubric.version,
      benchmark: benchmark.version,
      model: MODEL,
      audited_at: nowISO(),
      batch_id: job.batch_id!,
      ...validate(rubric, doc, raw),
      usage: msg.usage,
    };
    await env.CACHE.put(`audit:${hash}`, JSON.stringify(result));
    outcome.set(hash, {});
  }

  for (const item of job.items) {
    if (item.state !== "pending") continue;
    const o = outcome.get(item.hash);
    if (!o) {
      item.state = "failed";
      item.error = "missing from batch results";
    } else if (o.error) {
      item.state = "failed";
      item.error = o.error;
    } else {
      item.state = "done";
    }
  }
  job.status = "ended";
  await env.CACHE.put(`job:${job.job}`, JSON.stringify(job), { expirationTtl: TTL });
}

// GET /v1/audit/{job}
async function getAudit(env: Env, who: string, id: string): Promise<Response> {
  const job = (await env.CACHE.get(`job:${id}`, "json")) as Job | null;
  if (!job || job.client !== who) return json({ error: "unknown_job" }, 404);
  if (job.status === "processing") {
    try {
      await collect(job, env);
    } catch (err) {
      return json({ ...summary(job), error: "batch_check_failed", detail: (err as Error).message }, 502);
    }
  }
  if (job.status === "processing") return json(summary(job));

  const results = [];
  for (const item of job.items) {
    const result = item.state === "failed" ? null : await env.CACHE.get(`audit:${item.hash}`, "json");
    results.push({ id: item.id, state: item.state, error: item.error ?? null, result });
  }
  return json({ ...summary(job), results });
}

// POST /v1/check: Gate 2 post moderation for Jomhoor, off until it is ready
async function gate2(request: Request, env: Env, who: string): Promise<Response> {
  if (env.GATE2_ENABLED !== "true" || who !== "jomhoor") return json({ error: "not_enabled" }, 503);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "checker_not_configured" }, 503);
  let post: PostObj;
  try {
    post = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!post.objID || !post.post?.body) return json({ error: "missing objID or post.body" }, 400);
  try {
    return json(await checkCompliance(post, env.ANTHROPIC_API_KEY));
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
}

export async function handleV1(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...CORS, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" },
    });
  }
  if (method === "GET" && path === "/v1/instruments") return publicJson(env, request, "/data/instruments.json");
  if (method === "GET" && path === "/v1/rubrics") return publicJson(env, request, "/data/rubrics.json");
  if (method === "GET" && path.startsWith("/v1/provisions/")) {
    return provision(env, request, decodeURIComponent(path.slice("/v1/provisions/".length)));
  }

  const who = client(request, env);
  if (path === "/v1/audit" || path.startsWith("/v1/audit/") || path === "/v1/check") {
    if (!who) return json({ error: "Unauthorized" }, 401);
  }
  if (method === "POST" && path === "/v1/audit") return submitAudit(request, env, who!);
  if (method === "GET" && path.startsWith("/v1/audit/")) {
    return getAudit(env, who!, path.slice("/v1/audit/".length));
  }
  if (method === "POST" && path === "/v1/check") return gate2(request, env, who!);

  return json({ error: "Not Found" }, 404);
}
