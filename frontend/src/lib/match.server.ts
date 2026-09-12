// Server-only agent-to-agent matching engine.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chatJson } from "./ai.server";

type Member = {
  id: string;
  headline: string | null;
  facts: Array<{ tier: string; category: string; content: string }>;
  boundaries: string[];
  is_seed: boolean;
};

type NegotiationResult = {
  match: boolean;
  reason: string;
  topic?: string;
  time_ask?: string;
  transcript?: Array<{ speaker: string; text: string }>;
  a?: SidePacket;
  b?: SidePacket;
};

type SidePacket = {
  why_meet?: string;
  why_they_want?: string;
  the_ask?: string;
  not_asking?: string;
  recommendation?: string;
};

function describe(member: Member, label: string) {
  const lines = member.facts
    .filter((f) => f.tier !== "never")
    .map((f) => `- (${f.tier}) ${f.category}: ${f.content}`)
    .join("\n");
  const rules = member.boundaries.map((b) => `- ${b}`).join("\n") || "- none stated";
  return `CLIENT ${label}\nPositioning: ${member.headline ?? "unstated"}\nMandate:\n${lines || "- nothing recorded"}\nBoundaries (hard rules):\n${rules}`;
}

async function loadMembers(limit: number): Promise<Member[]> {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, headline, is_seed")
    .eq("intake_complete", true)
    .eq("paused", false)
    .limit(limit);

  if (!profiles?.length) return [];
  const ids = profiles.map((p) => p.id);

  const [{ data: facts }, { data: boundaries }] = await Promise.all([
    supabaseAdmin
      .from("mandate_facts")
      .select("user_id, tier, category, content")
      .in("user_id", ids),
    supabaseAdmin
      .from("boundaries")
      .select("user_id, rule")
      .in("user_id", ids)
      .eq("active", true),
  ]);

  return profiles.map((p) => ({
    id: p.id,
    headline: p.headline,
    facts: (facts ?? []).filter((f) => f.user_id === p.id),
    boundaries: (boundaries ?? []).filter((b) => b.user_id === p.id).map((b) => b.rule),
    is_seed: p.is_seed,
  }));
}

const SYSTEM = `You are simulating a short, candid exchange between two professional representatives ("agents") in the Hollywood-agent sense. Each represents one client. You see both mandates; the clients never will.

Decide whether these two humans should meet. Be strict: most pairs should NOT match. Refuse the match if it violates either client's stated boundaries, if the value is one-sided, or if it is generic networking.

If they should meet, negotiate the terms: purpose, relevance, intent, what is out of bounds, how much time, and why each side benefits.

Reply ONLY with JSON:
{
  "match": true,
  "reason": "one sentence, for the operator's audit log",
  "topic": "short subject line",
  "time_ask": "e.g. 20 minutes",
  "transcript": [{"speaker": "Agent A", "text": "..."}, {"speaker": "Agent B", "text": "..."}],
  "a": {"why_meet": "...", "why_they_want": "...", "the_ask": "...", "not_asking": "...", "recommendation": "Accept"},
  "b": {"why_meet": "...", "why_they_want": "...", "the_ask": "...", "not_asking": "...", "recommendation": "Accept"}
}

"a" is written for client A, "b" for client B — each addressed to that client in second person, never naming or identifying the other person, never quoting their confidential agent_visible facts directly. Keep every field to one or two sentences. Transcript: 4 to 6 turns. If match is false, omit topic, time_ask, a and b. Recommendation must be "Accept" or "Consider".`;

export async function runMatchingPass(options?: { maxPairs?: number; memberLimit?: number }) {
  const maxPairs = options?.maxPairs ?? 8;
  const members = await loadMembers(options?.memberLimit ?? 40);

  const summary = { evaluated: 0, matched: 0, skipped: 0 };
  if (members.length < 2) return summary;

  const { data: attempts } = await supabaseAdmin.from("match_attempts").select("user_a, user_b");
  const seen = new Set((attempts ?? []).map((a) => `${a.user_a}:${a.user_b}`));

  for (let i = 0; i < members.length && summary.evaluated < maxPairs; i++) {
    for (let j = i + 1; j < members.length && summary.evaluated < maxPairs; j++) {
      const first = members[i]!;
      const second = members[j]!;
      // Two seeded demo members have nothing to gain from meeting each other.
      if (first.is_seed && second.is_seed) {
        summary.skipped++;
        continue;
      }
      const [a, b] = first.id < second.id ? [first, second] : [second, first];
      const key = `${a.id}:${b.id}`;
      if (seen.has(key)) {
        summary.skipped++;
        continue;
      }
      seen.add(key);
      summary.evaluated++;

      let result: NegotiationResult;
      try {
        result = await chatJson<NegotiationResult>([
          { role: "system", content: SYSTEM },
          { role: "user", content: `${describe(a, "A")}\n\n${describe(b, "B")}` },
        ]);
      } catch (error) {
        console.error("[match] negotiation failed", error);
        continue;
      }

      if (!result.match || !result.a || !result.b) {
        await supabaseAdmin.from("match_attempts").insert({
          user_a: a.id,
          user_b: b.id,
          result: "declined",
          reason: result.reason?.slice(0, 500) ?? null,
        });
        continue;
      }

      const { data: intro, error: introError } = await supabaseAdmin
        .from("introductions")
        .insert({
          user_a: a.id,
          user_b: b.id,
          topic: result.topic?.slice(0, 200) ?? null,
          time_ask: result.time_ask?.slice(0, 80) ?? null,
        })
        .select("id")
        .single();

      if (introError || !intro) {
        console.error("[match] could not create introduction", introError);
        continue;
      }

      const side = (
        packet: SidePacket,
        member: Member,
        counterpartId: string,
      ) => ({
        introduction_id: intro.id,
        user_id: member.id,
        counterpart_id: counterpartId,
        why_meet: packet.why_meet ?? "Your agent found a relevant conversation.",
        why_they_want: packet.why_they_want ?? "They are exploring an area you know well.",
        the_ask: packet.the_ask ?? result.time_ask ?? "A short conversation.",
        not_asking: packet.not_asking ?? "No sales pitch. No recruiting. No investment ask.",
        recommendation: packet.recommendation === "Consider" ? "Consider" : "Accept",
        // A seeded member has no human to ask, so their agent answers for them.
        decision: member.is_seed ? "accepted" : "pending",
        decided_at: member.is_seed ? new Date().toISOString() : null,
      });

      await supabaseAdmin
        .from("introduction_sides")
        .insert([side(result.a, a, b.id), side(result.b, b, a.id)]);

      await supabaseAdmin.from("negotiations").insert({
        introduction_id: intro.id,
        user_a: a.id,
        user_b: b.id,
        outcome: "matched",
        transcript: result.transcript ?? [],
      });

      await supabaseAdmin.from("match_attempts").insert({
        user_a: a.id,
        user_b: b.id,
        result: "matched",
        reason: result.reason?.slice(0, 500) ?? null,
      });

      summary.matched++;
    }
  }

  return summary;
}
