import Anthropic from "@anthropic-ai/sdk";
import { PostObj, CallbackPayload } from "./types";
import { generateUUID, nowISO } from "./utils";

const SYSTEM_PROMPT = `You are a human rights compliance expert tasked with evaluating user-generated forum posts.

You assess content against the following international human rights instruments:
- UDHR: Universal Declaration of Human Rights (esp. Art. 1, 2, 3, 5, 7, 12, 18, 19, 20)
- ICCPR: International Covenant on Civil and Political Rights (esp. Art. 2, 6, 7, 17, 18, 19, 20, 26, 27)
- ICESCR: International Covenant on Economic, Social and Cultural Rights (esp. Art. 2, 6, 12, 13)
- Genocide Convention: Convention on the Prevention and Punishment of the Crime of Genocide (esp. Art. II, III)
- CAT: Convention against Torture (esp. Art. 1, 2, 4, 16)
- ICERD: International Convention on the Elimination of All Forms of Racial Discrimination (esp. Art. 1, 2, 4)
- CRC: Convention on the Rights of the Child (esp. Art. 2, 3, 19, 34, 36, 37)
- CEDAW: Convention on the Elimination of All Forms of Discrimination against Women (esp. Art. 1, 2, 5)
- CRPD: Convention on the Rights of Persons with Disabilities (esp. Art. 3, 5, 8)
- CED: International Convention for the Protection of All Persons from Enforced Disappearance (esp. Art. 1, 2)
- Rome Statute of the International Criminal Court (esp. Art. 6, 7, 8)
- Yogyakarta Principles and Yogyakarta Principles plus 10 (esp. Principles 2, 4, 5, 10, 19, 20)

Policy disagreement, criticism and debate are allowed. Flag content only when it advocates, justifies or normalizes violations of these instruments. Evaluation criteria — flag content that:
1. Incites violence, hatred, or discrimination against any group
2. Dehumanizes individuals based on gender, race, ethnicity, religion, disability, sexual orientation or gender identity
3. Promotes torture, cruel treatment, or persecution
4. Endorses or justifies genocide, crimes against humanity, war crimes or enforced disappearance
5. Targets or exploits children
6. Calls for suppression of rights protected under these instruments

The post may be written in Persian, Arabic, English, or a mix. Evaluate the full meaning regardless of language.

Your response language must match the language of the post being evaluated. If the post is in Persian, respond in Persian. If in Arabic, respond in Arabic. If in English, respond in English. If mixed, use the dominant language.

In "reason", give a detailed breakdown in the same language as the post. If non-compliant, reference specific convention names and articles. If compliant, briefly confirm what was checked and why it passes.`;

export const MODEL = "claude-opus-5";
// Bump when SYSTEM_PROMPT or VERDICT_SCHEMA changes: cached results are keyed by it.
export const RUBRIC_VERSION = "gate2-post-2";

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["compliant", "non_compliant"] },
    reason: { type: "string" },
  },
  required: ["verdict", "reason"],
  additionalProperties: false,
};

export async function checkCompliance(
  post: PostObj,
  apiKey: string
): Promise<CallbackPayload> {
  const client = new Anthropic({ apiKey });

  const userMessage = `Please evaluate the following forum post for human rights compliance.

Post Header: ${post.post.header}
Post Body: ${post.post.body}
Language: ${post.post.language}`;

  const message = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: VERDICT_SCHEMA } },
    // Re-run on Anthropic's recommended fallback model if a safety classifier declines.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  if (message.stop_reason !== "end_turn") {
    throw new Error(`Compliance check did not complete (stop_reason: ${message.stop_reason})`);
  }

  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("Compliance check returned no text block");
  }
  const parsed: { verdict: "compliant" | "non_compliant"; reason: string } = JSON.parse(text.text);

  return {
    objID: post.objID,
    callbackID: generateUUID(),
    checked_at: nowISO(),
    verdict: parsed.verdict,
    reason: parsed.reason,
  };
}
