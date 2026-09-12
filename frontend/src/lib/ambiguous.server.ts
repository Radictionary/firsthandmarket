/**
 * Ambiguous AI client — server-only.
 * All calls to https://app.ambiguous.ai go through here.
 * Never import from client code; keys are read from env inside handlers.
 */

const BASE_URL = "https://app.ambiguous.ai";

export type AmbiguousAgent = {
  id: string;
  username: string;
  display_name: string;
  workspace_email: string;
};

export type ProvisionedAgent = {
  apiKey: string;
  agent: AmbiguousAgent;
  workspaceSlug: string | null;
};

export class AmbiguousError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(
  path: string,
  opts: { method?: string; key: string; body?: unknown; idempotencyKey?: string } ,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.key}`,
      "API-Version": "1",
      ...(opts.idempotencyKey ? { "Idotency-Key": opts.idempotencyKey } : {}),
    },
    body: opts.body === undefined ? null : JSON.stringify(opts.body),
  });

  if (res.status === 429 || res.status >= 500) {
    const retryAfter = res.headers.get("Retry-After");
    throw new AmbiguousError(res.status, `Ambiguous busy (${res.status})${retryAfter ? `; retry after ${retryAfter}s` : ""}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AmbiguousError(res.status, `Ambiguous ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export function operatorKey(): string {
  const key = process.env["AMBIGUOUS_API_KEY"];
  if (!key) throw new AmbiguousError(0, "Ambiguous is not connected yet (missing operator API key).");
  return key;
}

/** Provision an agent identity with its own inbox. Returns null when Ambiguous isn't configured. */
export async function provisionAgent(input: {
  displayName: string;
  humanEmail: string;
  workspaceName?: string;
}): Promise<ProvisionedAgent | null> {
  const key = process.env["AMBIGUOUS_API_KEY"];
  if (!key) return null;

  const res = await call<{
    api_key: string;
    agent: AmbiguousAgent;
    workspace?: { slug?: string };
  }>("/api/auth/signup-agent", {
    method: "POST",
    key,
    body: {
      agent_display_name: input.displayName,
      human_email: input.humanEmail,
      workspace_name: input.workspaceName ?? "FirsthandMarket",
    },
  });

  return {
    apiKey: res.api_key,
    agent: res.agent,
    workspaceSlug: res.workspace?.slug ?? null,
  };
}

/** Send email from an agent's own address, idempotency-keyed. */
export async function sendMail(opts: {
  agentKey: string;
  idempotencyKey: string;
  to: { name?: string | null; email: string }[];
  cc?: { name?: string | null; email: string }[];
  subject: string;
  bodyMarkdown: string;
}): Promise<void> {
  await call<unknown>("/api/mail/send", {
    method: "POST",
    key: opts.agentKey,
    idempotencyKey: opts.idempotencyKey,
    body: {
      to: opts.to,
      cc: opts.cc,
      subject: opts.subject,
      body_markdown: opts.bodyMarkdown,
    },
  });
}

/** Upsert a CRM contact (operator's workspace). Best-effort; returns contact id or null. */
export async function upsertCrmContact(input: {
  name: string;
  email: string | null;
  title?: string | null;
  lifecycleStage?: string;
  customProperties?: Record<string, unknown>;
}): Promise<string | null> {
  const key = process.env["AMBIGUOUS_API_KEY"];
  if (!key) return null;
  try {
    const res = await call<{ id?: string; contact?: { id?: string } }>("/api/crm/contacts", {
      method: "POST",
      key,
      body: {
        name: input.name,
        email: input.email,
        title: input.title ?? null,
        ...(input.lifecycleStage ? { lifecycle_stage: input.lifecycleStage } : {}),
        custom_properties: input.customProperties ?? {},
      },
    });
    return res.id ?? res.contact?.id ?? null;
  } catch {
    return null;
  }
}
