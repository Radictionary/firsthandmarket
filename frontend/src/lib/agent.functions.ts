import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntakeMessage = { role: "agent" | "member"; content: string };

export type MandateFact = {
  id: string;
  tier: "public" | "agent_visible" | "never";
  category: string;
  content: string;
};

export type Desk = {
  profile: {
    id: string;
    full_name: string | null;
    headline: string | null;
    intake_complete: boolean;
    paused: boolean;
  };
  facts: MandateFact[];
  boundaries: Array<{ id: string; rule: string; active: boolean }>;
  introductions: Array<{
    id: string;
    introduction_id: string;
    why_meet: string;
    the_ask: string;
    recommendation: string;
    decision: string;
    status: string;
    created_at: string;
  }>;
};

const OPENER =
  "I'm your agent. Before I represent you to anyone, I need to understand you properly. Start anywhere: what are you unusually good at, and what are you trying to accomplish right now?";

export const getIntake = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: messages } = await supabase
      .from("intake_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const { data: profile } = await supabase
      .from("profiles")
      .select("intake_complete, full_name")
      .eq("id", userId)
      .maybeSingle();

    const history = (messages ?? []) as IntakeMessage[];
    if (history.length === 0) {
      await supabase
        .from("intake_messages")
        .insert({ user_id: userId, role: "agent", content: OPENER });
      history.push({ role: "agent", content: OPENER });
    }

    return {
      messages: history,
      complete: profile?.intake_complete ?? false,
      name: profile?.full_name ?? null,
    };
  });

type TurnResult = {
  reply: string;
  done: boolean;
  headline?: string;
  facts?: Array<{ tier: string; category: string; content: string }>;
  boundaries?: string[];
};

export const intakeTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) => {
    const message = String(input?.message ?? "").trim();
    if (!message) throw new Error("Say something to your agent.");
    if (message.length > 4000) throw new Error("That's too long for one message.");
    return { message };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { chatJson } = await import("./ai.server");

    const { data: prior } = await supabase
      .from("intake_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(40);

    await supabase
      .from("intake_messages")
      .insert({ user_id: userId, role: "member", content: data.message });

    const memberTurns = (prior ?? []).filter((m) => m.role === "member").length + 1;

    const system = `You are a professional representative in the Hollywood-agent sense, conducting a private intake interview with a new client on FirsthandMarket.

Your job is to understand: what they are unusually good at, what they have actually done, what they want next, who they can help, who they never want to hear from, and what their time is worth.

Rules:
- Ask ONE sharp follow-up question at a time. Never a list of questions.
- Be brief, warm and unsentimental. Two or three sentences maximum.
- Never flatter. Never say "great question".
- After about ${Math.max(5, 6)} substantive client answers, or sooner if you genuinely have enough, finish the interview.

Reply ONLY with JSON of this shape:
{
  "reply": "what you say to the client",
  "done": false,
  "headline": "one-line positioning, only when done",
  "facts": [{"tier":"public|agent_visible|never","category":"strength|experience|goal|can_help|preference|worth","content":"a single specific fact in the client's voice"}],
  "boundaries": ["a rule you will enforce on their behalf"]
}

Set "done": true only when finishing; then include headline, 5-10 facts and any boundaries. Tier rules: "public" is safe for other members to see, "agent_visible" is confidential intent only you may act on (for example considering leaving, selling, or hiring), "never" is information you must never use or disclose. The client has given ${memberTurns} answers so far.`;

    const result = await chatJson<TurnResult>([
      { role: "system", content: system },
      ...(prior ?? []).map((m) => ({
        role: (m.role === "agent" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
      { role: "user", content: data.message },
    ]);

    const reply = String(result.reply ?? "").trim() || "Tell me more.";
    await supabase
      .from("intake_messages")
      .insert({ user_id: userId, role: "agent", content: reply });

    if (result.done) {
      const tiers: Array<"public" | "agent_visible" | "never"> = [
        "public",
        "agent_visible",
        "never",
      ];
      const facts = (result.facts ?? [])
        .filter((f) => f?.content)
        .slice(0, 20)
        .map((f) => ({
          user_id: userId,
          tier: tiers.find((t) => t === f.tier) ?? "public",
          category: String(f.category ?? "general").slice(0, 40),
          content: String(f.content).slice(0, 600),
        }));
      if (facts.length) await supabase.from("mandate_facts").insert(facts);

      const rules = (result.boundaries ?? [])
        .filter(Boolean)
        .slice(0, 12)
        .map((rule) => ({ user_id: userId, rule: String(rule).slice(0, 400) }));
      if (rules.length) await supabase.from("boundaries").insert(rules);

      await supabase
        .from("profiles")
        .update({
          intake_complete: true,
          headline: result.headline ? String(result.headline).slice(0, 200) : null,
        })
        .eq("id", userId);

      // Give the member's agent its real inbox + identity (best-effort).
      const { ensureAgentForUser } = await import("./integrations.server");
      await ensureAgentForUser(userId).catch(() => {});
    }

    return { reply, done: Boolean(result.done) };
  });

export const getDesk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Desk> => {
    const { supabase, userId } = context;

    const [profileRes, factsRes, boundariesRes, sidesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, headline, intake_complete, paused")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("mandate_facts")
        .select("id, tier, category, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("boundaries")
        .select("id, rule, active")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("introduction_sides")
        .select(
          "id, introduction_id, why_meet, the_ask, recommendation, decision, created_at, introductions(status)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      profile: {
        id: userId,
        full_name: profileRes.data?.full_name ?? null,
        headline: profileRes.data?.headline ?? null,
        intake_complete: profileRes.data?.intake_complete ?? false,
        paused: profileRes.data?.paused ?? false,
      },
      facts: (factsRes.data ?? []) as MandateFact[],
      boundaries: boundariesRes.data ?? [],
      introductions: (sidesRes.data ?? []).map((s) => {
        const rel = s.introductions as unknown as { status?: string } | null;
        return {
          id: s.id,
          introduction_id: s.introduction_id,
          why_meet: s.why_meet,
          the_ask: s.the_ask,
          recommendation: s.recommendation,
          decision: s.decision,
          status: rel?.status ?? "pending",
          created_at: s.created_at,
        };
      }),
    };
  });

export const updateFact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      content?: string;
      tier?: "public" | "agent_visible" | "never";
      remove?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.remove) {
      await supabase.from("mandate_facts").delete().eq("id", data.id).eq("user_id", userId);
      return { ok: true };
    }
    const patch: {
      content?: string;
      tier?: "public" | "agent_visible" | "never";
    } = {};
    if (data.content !== undefined) patch.content = data.content.slice(0, 600);
    if (data.tier) patch.tier = data.tier;
    await supabase.from("mandate_facts").update(patch).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const addBoundary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rule: string }) => {
    const rule = String(input?.rule ?? "").trim();
    if (!rule) throw new Error("Write the rule first.");
    return { rule: rule.slice(0, 400) };
  })
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("boundaries")
      .insert({ user_id: context.userId, rule: data.rule });
    return { ok: true };
  });

export const removeBoundary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("boundaries")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const setPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paused: boolean }) => ({ paused: Boolean(input?.paused) }))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("profiles")
      .update({ paused: data.paused })
      .eq("id", context.userId);
    return { paused: data.paused };
  });

export const resetIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("intake_messages").delete().eq("user_id", userId);
    await supabase.from("mandate_facts").delete().eq("user_id", userId);
    await supabase.from("boundaries").delete().eq("user_id", userId);
    await supabase.from("profiles").update({ intake_complete: false }).eq("id", userId);
    return { ok: true };
  });
