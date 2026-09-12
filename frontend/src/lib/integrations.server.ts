/**
 * Per-member Ambiguous agent lifecycle — server-only helpers.
 * Provisioning is idempotent and best-effort: when Ambiguous isn't
 * configured (no AMBIGUOUS_API_KEY), everything no-ops quietly.
 */
import { provisionAgent, sendMail, upsertCrmContact } from "./ambiguous.server";

export async function ensureAgentForUser(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("integrations")
    .select("id, agent_api_key")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.agent_api_key) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, headline")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.email) return;

  const displayName = `${profile.full_name ?? "Member"}'s agent`;
  let provisioned;
  try {
    provisioned = await provisionAgent({ displayName, humanEmail: profile.email });
  } catch {
    provisioned = null;
  }

  const row = {
    user_id: userId,
    agent_id: provisioned?.agent.id ?? null,
    agent_username: provisioned?.agent.username ?? null,
    agent_email: provisioned?.agent.workspace_email ?? null,
    agent_api_key: provisioned?.apiKey ?? null,
    workspace_slug: provisioned?.workspaceSlug ?? null,
    sync_state: provisioned ? "provisioned" : "pending",
  };

  if (existing) {
    await supabaseAdmin.from("integrations").update(row).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("integrations").insert(row);
  }

  // CRM sync (best-effort, operator workspace)
  const contactId = await upsertCrmContact({
    name: profile.full_name ?? profile.email,
    email: profile.email,
    title: profile.headline,
    customProperties: { firsthand_user_id: userId, status: "represented" },
  });
  if (contactId) {
    await supabaseAdmin.from("integrations").update({ crm_contact_id: contactId }).eq("user_id", userId);
  }
}

/**
 * After a double opt-in, each agent emails its own member from its own
 * Ambiguous address, CC'ing the counterpart. Idempotent per introduction+side.
 */
export async function sendIntroductionEmails(introductionId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: intro } = await supabaseAdmin
    .from("introductions")
    .select("id, user_a, user_b, topic")
    .eq("id", introductionId)
    .maybeSingle();
  if (!intro) return;

  const { data: sides } = await supabaseAdmin
    .from("introduction_sides")
    .select("user_id, counterpart_id, why_meet, why_they_want, the_ask")
    .eq("introduction_id", introductionId);

  for (const side of sides ?? []) {
    const [{ data: integ }, { data: me }, { data: them }] = await Promise.all([
      supabaseAdmin.from("integrations").select("agent_api_key").eq("user_id", side.user_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name, email").eq("id", side.user_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name, email").eq("id", side.counterpart_id).maybeSingle(),
    ]);
    if (!integ?.agent_api_key || !me?.email || !them?.email) continue;

    try {
      await sendMail({
        agentKey: integ.agent_api_key,
        idempotencyKey: `intro-${introductionId}-${side.user_id}`,
        to: [{ name: me.full_name, email: me.email }],
        cc: [{ name: them.full_name, email: them.email }],
        subject: `Introduction${intro.topic ? `: ${intro.topic}` : ""}`,
        bodyMarkdown: [
          `Hi ${me.full_name ?? "there"},`,
          ``,
          `As agreed, here is your introduction to ${them.full_name ?? "your counterpart"}.`,
          ``,
          `- **Why meet:** ${side.why_meet}`,
          `- **Why they'd like to meet you:** ${side.why_they_want}`,
          `- **The ask:** ${side.the_ask}`,
          ``,
          `You are both on this thread — I'll step back now. Reply here whenever you're ready to set a time.`,
        ].join("\n"),
      });
    } catch {
      // Idempotency key lets a later retry resend safely; swallow for now.
    }
  }
}
