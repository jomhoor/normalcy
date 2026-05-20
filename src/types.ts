export interface PostObj {
  objID: string;
  callback_url: string;
  date: string;
  post: {
    header: string;
    body: string;
    language: "fa" | "en" | "ar" | string;
  };
}

export interface CallbackPayload {
  objID: string;
  callbackID: string;
  checked_at: string;
  verdict: "compliant" | "non_compliant";
  reason: string;
}

export interface QueueMessage {
  post: PostObj;
  callbackID: string;
}
