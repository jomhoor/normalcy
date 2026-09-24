import Anthropic from "@anthropic-ai/sdk";
import benchmark from "./generated/benchmark.json";
import generated from "./generated/rubrics.json";
import { MODEL } from "./claude";

// Document audits against the benchmark (متن بالادستی), one scoring guide per
// document type. Guides are built by benchmark/rubrics.py from rubrics/*.json.

export type Verdict = "guaranteed" | "restricted_clawback" | "contradicted" | "silent";

export interface Rubric {
  name: string;
  version: string;
  en: string;
  fa: string;
  applies_to: string[];
  benchmark: string;
  instructions: string;
  rights: { id: string; en: string; fa: string; provisions: string[] }[];
  reference: string;
}

export interface Segment {
  id: string;
  label?: string;
  text: string;
}

export interface AuditDocument {
  id: string;
  title?: string;
  segments: Segment[];
}

export interface RightFinding {
  verdict: Verdict;
  segments: string[];
  provisions: string[];
  quote: string;
  note_en: string;
  note_fa: string;
  // ok: every citation checks out; rejected: a cited ID does not exist, so the verdict is not usable
  check: "ok" | "rejected";
  problems: string[];
}

export interface AuditResult {
  hash: string;
  rubric: string;
  rubric_version: string;
  benchmark: string;
  model: string;
  audited_at: string;
  batch_id: string;
  rights: Record<string, RightFinding>;
  summary_en: string;
  summary_fa: string;
  rejected: number;
  warnings: number;
  usage: Anthropic.Usage;
}

export const RUBRICS = generated.rubrics as unknown as Record<string, Rubric>;
const BENCHMARK_IDS = new Set<string>(benchmark.ids);
const VERDICTS: Verdict[] = ["guaranteed", "restricted_clawback", "contradicted", "silent"];

export const MAX_SEGMENTS = 2000;
export const MAX_DOC_CHARS = 600_000;
const SEGMENT_ID = /^[A-Za-z0-9_.-]{1,40}$/;

// Returns a problem description, or null when the document can be audited.
export function checkDocument(doc: AuditDocument): string | null {
  if (!doc || typeof doc.id !== "string" || !doc.id) return "document id missing";
  if (!Array.isArray(doc.segments) || doc.segments.length === 0) return `${doc.id}: no segments`;
  if (doc.segments.length > MAX_SEGMENTS) return `${doc.id}: more than ${MAX_SEGMENTS} segments`;
  const ids = new Set<string>();
  let chars = 0;
  for (const s of doc.segments) {
    if (typeof s?.id !== "string" || !SEGMENT_ID.test(s.id)) return `${doc.id}: bad segment id ${s?.id}`;
    if (ids.has(s.id)) return `${doc.id}: duplicate segment id ${s.id}`;
    if (typeof s.text !== "string") return `${doc.id}: segment ${s.id} has no text`;
    ids.add(s.id);
    chars += s.text.length;
  }
  if (chars > MAX_DOC_CHARS) return `${doc.id}: longer than ${MAX_DOC_CHARS} characters`;
  return null;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Cache key: document content + scoring-guide version + benchmark version + model.
// The document id and title are left out, so identical text is audited once.
export function auditHash(rubric: Rubric, doc: AuditDocument): Promise<string> {
  const content = doc.segments.map((s) => [s.id, s.label ?? "", s.text.normalize("NFC")]);
  return sha256(JSON.stringify([rubric.version, benchmark.version, MODEL, content]));
}

function schema(rubric: Rubric) {
  const ids = rubric.rights.map((r) => r.id);
  return {
    type: "object",
    properties: {
      rights: {
        type: "object",
        properties: Object.fromEntries(ids.map((id) => [id, { $ref: "#/$defs/finding" }])),
        required: ids,
        additionalProperties: false,
      },
      summary_en: { type: "string" },
      summary_fa: { type: "string" },
    },
    required: ["rights", "summary_en", "summary_fa"],
    additionalProperties: false,
    $defs: {
      finding: {
        type: "object",
        properties: {
          verdict: { type: "string", enum: VERDICTS },
          segments: { type: "array", items: { type: "string" } },
          provisions: { type: "array", items: { type: "string" } },
          quote: { type: "string" },
          note_en: { type: "string" },
          note_fa: { type: "string" },
        },
        required: ["verdict", "segments", "provisions", "quote", "note_en", "note_fa"],
        additionalProperties: false,
      },
    },
  };
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function buildParams(rubric: Rubric, doc: AuditDocument): Anthropic.MessageCreateParamsNonStreaming {
  const body = doc.segments
    .map((s) => {
      const label = s.label ? ` label="${escapeAttr(s.label)}"` : "";
      return `<segment id="${s.id}"${label}>\n${s.text}\n</segment>`;
    })
    .join("\n");
  const title = doc.title ? `Title: ${doc.title}\n\n` : "";
  return {
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: schema(rubric) } },
    // Instructions + checklist + benchmark texts are identical for every document
    // audited with this guide: a stable prefix, cached for the length of a batch.
    system: [
      { type: "text", text: rubric.instructions },
      { type: "text", text: rubric.reference, cache_control: { type: "ephemeral", ttl: "1h" } },
    ],
    messages: [
      {
        role: "user",
        content: `${title}Audit this document against every item in the checklist.\n\n<document>\n${body}\n</document>`,
      },
    ],
  };
}

// Letters that OCR and Persian keyboards spell several ways, plus invisible joiners.
function fold(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ـ​-‏ً-ٟ]/g, "")
    .replace(/[\s ]+/g, " ")
    .trim();
}

// Check every citation against the stored texts. An unknown provision or segment
// ID rejects that verdict; a quote that is not in the document is only flagged.
export function validate(
  rubric: Rubric,
  doc: AuditDocument,
  raw: { rights: Record<string, Omit<RightFinding, "check" | "problems">>; summary_en: string; summary_fa: string }
): Pick<AuditResult, "rights" | "summary_en" | "summary_fa" | "rejected" | "warnings"> {
  const segments = new Map(doc.segments.map((s) => [s.id, s.text]));
  let folded: string | null = null;
  const rights: Record<string, RightFinding> = {};
  let rejected = 0;
  let warnings = 0;

  for (const right of rubric.rights) {
    const f = raw.rights[right.id];
    const problems: string[] = [];
    let check: RightFinding["check"] = "ok";
    if (!f) {
      rejected++;
      rights[right.id] = {
        verdict: "silent", segments: [], provisions: [], quote: "", note_en: "", note_fa: "",
        check: "rejected", problems: ["missing from the model output"],
      };
      continue;
    }
    const badProv = f.provisions.filter((p) => !BENCHMARK_IDS.has(p));
    const badSeg = f.segments.filter((s) => !segments.has(s));
    if (badProv.length) problems.push(`unknown provision IDs: ${badProv.join(", ")}`);
    if (badSeg.length) problems.push(`unknown segment IDs: ${badSeg.join(", ")}`);
    if (f.provisions.length === 0) problems.push("no benchmark provision cited");
    if (f.verdict !== "silent" && f.segments.length === 0) problems.push("no document segment cited");
    if (problems.length) check = "rejected";

    if (f.quote.trim()) {
      const q = fold(f.quote);
      const cited = f.segments.filter((s) => segments.has(s)).map((s) => fold(segments.get(s)!));
      if (!cited.some((t) => t.includes(q))) {
        folded ??= fold(doc.segments.map((s) => s.text).join(" "));
        if (!folded.includes(q)) {
          problems.push("quote not found in the document");
          warnings++;
        }
      }
    }
    if (check === "rejected") rejected++;
    rights[right.id] = { ...f, check, problems };
  }
  return { rights, summary_en: raw.summary_en, summary_fa: raw.summary_fa, rejected, warnings };
}
