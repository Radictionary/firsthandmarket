export const AGENT_URL =
  (import.meta.env.VITE_AGENT_URL as string | undefined) ?? "http://localhost:8000";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RequestContract = {
  objective: string;
  deliverable: string;
  subject: string;
  location_city?: string | null;
  location_country?: string | null;
  topic_tags: string[];
  required_affiliations: string[];
  required_access: string[];
  deadline?: string | null;
  acceptance_criteria: string[];
  restrictions: string[];
  freshness: "now" | "this_week" | "evergreen";
};

export type ProviderProfile = {
  id: string;
  display_name: string;
  bio?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  expertise_tags?: string[];
  trust_score?: number | null;
  available?: boolean;
  avatar_url?: string | null;
  is_demo?: boolean;
};

export type Offer = {
  id: string;
  query_id: string;
  requester_name: string;
  provider_id: string;
  provider: ProviderProfile;
  contract: RequestContract;
  reasons: string[];
  status: "proposed" | "accepted" | "declined" | "completed";
  created_at: string;
  responded_at?: string | null;
  completed_at?: string | null;
  provider_agent_message?: string | null;
  demo_answer?: FirsthandAnswer | null;
};

export type RequesterTurnResponse = {
  reply: string;
  draft: RequestContract | null;
  ready_for_approval: boolean;
  approved: boolean;
  matches: ProviderProfile[];
  selected_provider: ProviderProfile | null;
  offer: Offer | null;
  query_id: string | null;
};

export type ProviderTurnResponse = {
  reply: string;
  response_draft: string;
  offer: Offer;
};

export type FirsthandAnswer = {
  content: string;
  created_at: string;
  media_url?: string | null;
  thumbnail_url?: string | null;
  deliverable?: string;
  duration_seconds?: number | null;
  demo?: boolean;
  informants?: {
    display_name?: string;
    location_city?: string;
    trust_score?: number;
    is_demo?: boolean;
  } | null;
};

export async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(AGENT_URL + path, init);
  if (!response.ok) {
    let detail = "Agent service returned " + response.status;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep the status message when the response is not JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}
