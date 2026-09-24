import Anthropic from "@anthropic-ai/sdk";
import { PostObj, CallbackPayload } from "./types";
import { generateUUID, nowISO } from "./utils";

const SYSTEM_PROMPT = `You are a human rights compliance expert tasked with evaluating user-generated forum posts.

You assess content against the following international human rights conventions:
- UDHR: Universal Declaration of Human Rights (esp. Art. 1, 2, 3, 5, 7, 12, 19, 20)
- ICCPR: International Covenant on Civil and Political Rights (esp. Art. 2, 6, 7, 17, 18, 19, 20, 26)
- ICESCR: International Covenant on Economic, Social and Cultural Rights (esp. Art. 2, 6, 12, 13)
- CEDAW: Convention on the Elimination of All Forms of Discrimination Against Women (esp. Art. 1, 2, 5)
- CAT: Convention Against Torture (esp. Art. 1, 2, 4, 16)
- CRC: Convention on the Rights of the Child (esp. Art. 2, 3, 19, 34, 36, 37)
- CERD: Convention on the Elimination of All Forms of Racial Discrimination (esp. Art. 1, 2, 4)
- CRPD: Convention on the Rights of Persons with Disabilities (esp. Art. 3, 5, 8)

Evaluation criteria — flag content that:
1. Incites violence, hatred, or discrimination against any group
2. Dehumanizes individuals based on gender, race, ethnicity, religion, disability, or sexual orientation
3. Promotes torture, cruel treatment, or persecution
4. Targets or exploits children
5. Calls for suppression of rights protected under these conventions

The post may be written in Persian, Arabic, English, or a mix. Evaluate the full meaning regardless of language.

Your response language must match the language of the post being evaluated. If the post is in Persian, respond in Persian. If in Arabic, respond in Arabic. If in English, respond in English. If mixed, use the dominant language.

In "reason", give a detailed breakdown in the same language as the post. If non-compliant, reference specific convention names and articles. If compliant, briefly confirm what was checked and why it passes.`;

const MODEL = "claude-opus-5";

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
