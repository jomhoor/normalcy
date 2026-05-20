import { checkCompliance } from "./claude";
import { QueueMessage, CallbackPayload } from "./types";

export async function processQueueMessage(
  msg: QueueMessage,
  apiKey: string,
  sharedSecret: string
): Promise<void> {
  const result: CallbackPayload = await checkCompliance(msg.post, apiKey);

  const response = await fetch(msg.post.callback_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sharedSecret}`,
    },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    throw new Error(
      `Callback to ${msg.post.callback_url} failed with status ${response.status}`
    );
  }
}
