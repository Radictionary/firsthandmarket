import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireOperator(supabase: unknown, userId: string) {
  const client = supabase as {
    rpc: (fn: string, args: Record<string, string>) => Promise<{ data: unknown }>;
  };
  const { data: isOperator } = await client.rpc("has_role", {
    _user_id: userId,
    _role: "operator",
  });
  if (!isOperator) throw new Error("Operators only.");
}

export const createInviteFromBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { briefId: string }) => ({ briefId: String(input?.briefId ?? "") }))
  .handler(async ({ data, context }) => {
    await requireOperator(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: brief } = await supabaseAdmin
      .from("representation_requests")
      .select("full_name, email, goal, role_title")
      .eq("id", data.briefId)
      .maybeSingle();
    if (!brief) throw new Error("That brief no longer exists.");

    const summary = `${brief.goal}${brief.role_title ? ` (${brief.role_title})` : ""}`;
    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .insert({ email: brief.email, full_name: brief.full_name, brief: summary })
      .select("token")
      .single();
    if (error || !invite) throw new Error("Couldn't create the invite.");

    return { token: invite.token };
  });

export const claimInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => ({ token: String(input?.token ?? "") }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("id, full_name, brief, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite || invite.status !== "pending") return { claimed: false };
    if (new Date(invite.expires_at).getTime() < Date.now()) return { claimed: false };

    await supabaseAdmin
      .from("invites")
      .update({ status: "claimed", claimed_by: userId })
      .eq("id", invite.id)
      .eq("status", "pending");

    await supabaseAdmin
      .from("profiles")
      .update({ full_name: invite.full_name })
      .eq("id", userId)
      .is("full_name", null);

    const { count } = await supabaseAdmin
      .from("intake_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!count) {
      await supabaseAdmin.from("intake_messages").insert({
        user_id: userId,
        role: "agent",
        content: `I'm your agent. When you first reached out you told us: "${invite.brief}". Good starting point — now I need to understand you properly before I represent you to anyone. Tell me in your own words: what are you unusually good at, and what has changed since you wrote that?`,
      });
    }

    return { claimed: true };
  });

export type OperatorStats = {
  activeMembers: number;
  totalMembers: number;
  offered: number;
  accepted: number;
  declined: number;
  connected: number;
  acceptanceRate: number | null;
};

export const getOperatorStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperatorStats> => {
    await requireOperator(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [membersRes, activeRes, sidesRes, connectedRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("intake_complete", true)
        .eq("paused", false),
      supabaseAdmin.from("introduction_sides").select("decision"),
      supabaseAdmin
        .from("introductions")
        .select("id", { count: "exact", head: true })
        .eq("status", "connected"),
    ]);

    const sides = sidesRes.data ?? [];
    const offered = sides.length;
    const decided = sides.filter((s) => s.decision !== "pending");
    const accepted = decided.filter((s) => s.decision === "accepted").length;
    const declined = decided.filter((s) => s.decision === "declined").length;

    return {
      activeMembers: activeRes.count ?? 0,
      totalMembers: membersRes.count ?? 0,
      offered,
      accepted,
      declined,
      connected: connectedRes.count ?? 0,
      acceptanceRate: decided.length ? accepted / decided.length : null,
    };
  });
