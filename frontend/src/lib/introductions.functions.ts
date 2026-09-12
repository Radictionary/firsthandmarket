import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntroductionView = {
  id: string;
  status: string;
  topic: string | null;
  time_ask: string | null;
  decision: string;
  why_meet: string;
  why_they_want: string;
  the_ask: string;
  not_asking: string;
  recommendation: string;
  counterpart: {
    revealed: boolean;
    full_name: string | null;
    headline: string | null;
    email: string | null;
    public_facts: string[];
  };
};

export const getIntroduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }): Promise<IntroductionView> => {
    const { supabase, userId } = context;

    const { data: side } = await supabase
      .from("introduction_sides")
      .select("*")
      .eq("introduction_id", data.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!side) throw new Error("That introduction isn't yours.");

    const { data: intro } = await supabase
      .from("introductions")
      .select("status, topic, time_ask")
      .eq("id", data.id)
      .maybeSingle();

    const revealed = intro?.status === "connected";
    const counterpart: IntroductionView["counterpart"] = {
      revealed,
      full_name: null,
      headline: null,
      email: null,
      public_facts: [],
    };

    if (revealed) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: profile }, { data: facts }] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("full_name, headline, email")
          .eq("id", side.counterpart_id)
          .maybeSingle(),
        supabaseAdmin
          .from("mandate_facts")
          .select("content")
          .eq("user_id", side.counterpart_id)
          .eq("tier", "public")
          .limit(6),
      ]);
      counterpart.full_name = profile?.full_name ?? null;
      counterpart.headline = profile?.headline ?? null;
      counterpart.email = profile?.email ?? null;
      counterpart.public_facts = (facts ?? []).map((f) => f.content);
    }

    return {
      id: data.id,
      status: intro?.status ?? "pending",
      topic: intro?.topic ?? null,
      time_ask: intro?.time_ask ?? null,
      decision: side.decision,
      why_meet: side.why_meet,
      why_they_want: side.why_they_want,
      the_ask: side.the_ask,
      not_asking: side.not_asking,
      recommendation: side.recommendation,
      counterpart,
    };
  });

export const decideIntroduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; decision: "accepted" | "declined" }) => {
    if (input?.decision !== "accepted" && input?.decision !== "declined") {
      throw new Error("Unknown decision.");
    }
    return { id: String(input.id), decision: input.decision };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("introduction_sides")
      .update({ decision: data.decision, decided_at: new Date().toISOString() })
      .eq("introduction_id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error("That decision didn't save.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sides } = await supabaseAdmin
      .from("introduction_sides")
      .select("decision")
      .eq("introduction_id", data.id);

    const decisions = (sides ?? []).map((s) => s.decision);
    let status = "pending";
    if (decisions.includes("declined")) status = "declined";
    else if (decisions.length === 2 && decisions.every((d) => d === "accepted"))
      status = "connected";

    if (status !== "pending") {
      await supabaseAdmin.from("introductions").update({ status }).eq("id", data.id);
    }

    if (status === "connected") {
      const { sendIntroductionEmails } = await import("./integrations.server");
      await sendIntroductionEmails(data.id);
    }

    return { status };
  });

export const askMyAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; question: string }) => {
    const question = String(input?.question ?? "").trim();
    if (!question) throw new Error("Ask your agent something.");
    return { id: String(input.id), question: question.slice(0, 1000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { chat } = await import("./ai.server");

    const { data: side } = await supabase
      .from("introduction_sides")
      .select("why_meet, why_they_want, the_ask, not_asking, recommendation")
      .eq("introduction_id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!side) throw new Error("That introduction isn't yours.");

    const { data: boundaries } = await supabase
      .from("boundaries")
      .select("rule")
      .eq("user_id", userId)
      .eq("active", true);

    const reply = await chat([
      {
        role: "system",
        content: `You are this person's professional representative. You negotiated an introduction for them and are now answering their private question about it. Be brief, direct and protective of their interests. Never reveal or invent the other person's identity. Three sentences maximum.

The pitch you gave them:
- Why meet: ${side.why_meet}
- Why they may want to meet you: ${side.why_they_want}
- The ask: ${side.the_ask}
- Not asking: ${side.not_asking}
- Your recommendation: ${side.recommendation}

Their standing boundaries: ${(boundaries ?? []).map((b) => b.rule).join("; ") || "none stated"}`,
      },
      { role: "user", content: data.question },
    ]);

    return { reply: reply.trim() };
  });

export const runMatchingNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOperator } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "operator",
    });
    if (!isOperator) throw new Error("Operators only.");

    const { runMatchingPass } = await import("./match.server");
    return runMatchingPass({ maxPairs: 6 });
  });

export const getOperatorView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOperator } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "operator",
    });
    if (!isOperator) throw new Error("Operators only.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: members }, { data: intros }, { data: negotiations }, { data: briefs }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, headline, intake_complete, paused, is_seed, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabaseAdmin
          .from("introductions")
          .select("id, status, topic, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("negotiations")
          .select("id, introduction_id, transcript, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("representation_requests")
          .select("id, full_name, email, role_title, goal, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    return {
      members: members ?? [],
      introductions: intros ?? [],
      negotiations: negotiations ?? [],
      briefs: briefs ?? [],
    };
  });
