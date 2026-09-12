import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireOperator(supabase: { rpc: Function }, userId: string) {
  const { data: isOperator } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "operator",
  });
  if (!isOperator) throw new Error("Operators only.");
}

/** Provision an Ambiguous agent inbox for every represented member who lacks one. */
export const provisionAllAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOperator(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureAgentForUser } = await import("./integrations.server");

    const { data: members } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("intake_complete", true);
    const { data: existing } = await supabaseAdmin
      .from("integrations")
      .select("user_id")
      .not("agent_api_key", "is", null);
    const done = new Set((existing ?? []).map((r) => r.user_id));

    let provisioned = 0;
    for (const m of members ?? []) {
      if (done.has(m.id)) continue;
      try {
        await ensureAgentForUser(m.id);
        provisioned++;
      } catch {
        // continue with the rest
      }
    }
    return { total: members?.length ?? 0, already: done.size, provisioned };
  });

export const getIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOperator(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("integrations")
      .select("user_id, agent_username, agent_email, sync_state, crm_contact_id, created_at")
      .order("created_at", { ascending: false });
    return { integrations: data ?? [] };
  });
