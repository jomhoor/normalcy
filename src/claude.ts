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

Respond ONLY with a valid JSON object in this exact format, no extra text:
{
  "verdict": "compliant" or "non_compliant",
  "reason": "Detailed breakdown in the same language as the post. If non-compliant, reference specific convention names and articles. If compliant, briefly confirm what was checked and why it passes."
}`;

export async function checkCompliance(
  post: PostObj,
  apiKey: string
): Promise<CallbackPayload> {
  const client = new Anthropic({ apiKey });

  const userMessage = `Please evaluate the following forum post for human rights compliance.

Post Header: ${post.post.header}
Post Body: ${post.post.body}
Language: ${post.post.language}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: { verdict: "compliant" | "non_compliant"; reason: string };

  try {
    // Strip possible markdown code fences if Claude wraps the JSON
    const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      verdict: "non_compliant",
      reason: `Claude response could not be parsed. Raw response: ${text}`,
    };
  }

  return {
    objID: post.objID,
    callbackID: generateUUID(),
    checked_at: nowISO(),
    verdict: parsed.verdict,
    reason: parsed.reason,
  };
}
