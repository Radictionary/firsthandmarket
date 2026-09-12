// Server-only helper for the Lovable AI gateway.

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chat(messages: ChatMessage[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (response.status === 429) throw new Error("The agent is busy. Try again shortly.");
  if (response.status === 402) throw new Error("AI credits are exhausted.");
  if (!response.ok) {
    const detail = await response.text();
    console.error("[ai] gateway error", response.status, detail);
    throw new Error("The agent could not respond.");
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return body.choices?.[0]?.message?.content ?? "";
}

/** Asks the model for JSON and parses it, tolerating code fences. */
export async function chatJson<T>(messages: ChatMessage[]): Promise<T> {
  const raw = await chat(messages);
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(slice) as T;
  } catch {
    console.error("[ai] unparseable response", raw.slice(0, 500));
    throw new Error("The agent returned something unreadable.");
  }
}
