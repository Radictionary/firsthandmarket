import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getOperatorView, runMatchingNow } from "@/lib/introductions.functions";
import { createInviteFromBrief, getOperatorStats } from "@/lib/invites.functions";
import { getIntegrations, provisionAllAgents } from "@/lib/integrations.functions";

export const Route = createFileRoute("/_authenticated/operator")({
  head: () => ({
    meta: [
      { title: "Operator — FirsthandMarket" },
      {
        name: "description",
        content: "Review members, run a matching pass, and read the agent-to-agent transcripts.",
      },
      { property: "og:title", content: "Operator — FirsthandMarket" },
      {
        property: "og:description",
        content: "Members, introductions and negotiation transcripts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperatorPage,
});

function OperatorPage() {
  const qc = useQueryClient();
  const load = useServerFn(getOperatorView);
  const run = useServerFn(runMatchingNow);
  const loadStats = useServerFn(getOperatorStats);
  const invite = useServerFn(createInviteFromBrief);
  const [running, setRunning] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: ["operator"],
    queryFn: () => load(),
    retry: false,
  });

  const { data: stats } = useQuery({
    queryKey: ["operator-stats"],
    queryFn: () => loadStats(),
    retry: false,
  });

  const loadAgents = useServerFn(getIntegrations);
  const provision = useServerFn(provisionAllAgents);
  const [provisioning, setProvisioning] = useState(false);

  const { data: agentData } = useQuery({
    queryKey: ["operator-integrations"],
    queryFn: () => loadAgents(),
    retry: false,
  });

  async function provisionAgents() {
    setProvisioning(true);
    try {
      const r = await provision();
      toast.success(`Agents: ${r.provisioned} new inbox(es), ${r.already} already had one.`);
      qc.invalidateQueries({ queryKey: ["operator-integrations"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Provisioning failed.");
    } finally {
      setProvisioning(false);
    }
  }

  async function sendInvite(briefId: string) {
    setInvitingId(briefId);
    try {
      const { token } = await invite({ data: { briefId } });
      const url = `${window.location.origin}/auth?invite=${token}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success("Invite link copied to your clipboard.", { description: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the invite.");
    } finally {
      setInvitingId(null);
    }
  }

  if (isLoading) {
    return <p className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading…</p>;
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-20">
        <h1 className="display text-3xl">Operators only.</h1>
        <p className="mt-4 text-muted-foreground">
          This view is limited to the people running the network.
        </p>
      </main>
    );
  }

  async function matchNow() {
    setRunning(true);
    try {
      const summary = await run();
      toast.success(
        `${summary.evaluated} pairs evaluated, ${summary.matched} introductions created.`,
      );
      qc.invalidateQueries({ queryKey: ["operator"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The pass failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <p className="eyebrow">Operator</p>
      <h1 className="display mt-4 text-4xl">The floor.</h1>

      <button
        onClick={matchNow}
        disabled={running}
        className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {running ? "Agents are negotiating…" : "Run a matching pass"}
      </button>

      {stats && (
        <Panel title="The number that matters">
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
            <Stat label="Active members" value={String(stats.activeMembers)} />
            <Stat label="Offers made" value={String(stats.offered)} />
            <Stat
              label="Acceptance rate"
              value={
                stats.acceptanceRate === null ? "—" : `${Math.round(stats.acceptanceRate * 100)}%`
              }
            />
            <Stat label="Accepted" value={String(stats.accepted)} />
            <Stat label="Declined" value={String(stats.declined)} />
            <Stat label="Connected" value={String(stats.connected)} />
          </div>
        </Panel>
      )}

      <Panel title="Agent inboxes">
        <div className="bg-card px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Each member's agent gets a real email address via Ambiguous. Introduction emails go
              out from the agent's own inbox.
            </span>
            <button
              type="button"
              onClick={provisionAgents}
              disabled={provisioning}
              className="rounded-md border border-border px-4 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors hover:bg-accent disabled:opacity-60"
            >
              {provisioning ? "Provisioning…" : "Provision missing inboxes"}
            </button>
          </div>
        </div>
        {(agentData?.integrations ?? []).map((a) => (
          <Row
            key={a.user_id}
            left={a.agent_username ?? "Pending"}
            right={a.sync_state}
            sub={a.agent_email ?? "Inbox not provisioned yet"}
          />
        ))}
      </Panel>

      <Panel title={`Members (${data.members.length})`}>
        {data.members.map((m) => (
          <Row
            key={m.id}
            left={m.full_name ?? "Unnamed"}
            right={
              m.intake_complete ? (m.paused ? "Paused" : "Represented") : "Intake unfinished"
            }
            sub={m.headline ?? ""}
          />
        ))}
      </Panel>

      <Panel title={`Introductions (${data.introductions.length})`}>
        {data.introductions.map((i) => (
          <Row key={i.id} left={i.topic ?? "Untitled"} right={i.status} />
        ))}
      </Panel>

      <Panel title={`Waitlist briefs (${data.briefs.length})`}>
        {data.briefs.map((b) => (
          <div key={b.id} className="bg-card px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[15px]">{`${b.full_name} · ${b.email}`}</span>
              <button
                type="button"
                onClick={() => sendInvite(b.id)}
                disabled={invitingId === b.id}
                className="rounded-md border border-border px-4 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors hover:bg-accent disabled:opacity-60"
              >
                {invitingId === b.id ? "Creating…" : "Invite"}
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{b.goal}</p>
          </div>
        ))}
      </Panel>

      <Panel title="Latest negotiations">
        {data.negotiations.map((n) => (
          <div key={n.id} className="bg-card p-5">
            <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {new Date(n.created_at).toLocaleString()}
            </p>
            <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
              {(Array.isArray(n.transcript) ? n.transcript : []).map(
                (turn: unknown, index: number) => {
                  const t = turn as { speaker?: string; text?: string };
                  return (
                    <p key={index}>
                      <span className="font-mono text-xs text-primary">
                        {t.speaker ?? "Agent"}:
                      </span>{" "}
                      {t.text}
                    </p>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </Panel>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rule-top mt-12 pt-10">
      <p className="eyebrow">{title}</p>
      <div className="mt-5 space-y-px overflow-hidden rounded-xl border border-border bg-border">
        {children}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="display text-2xl">{value}</p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

function Row({ left, right, sub }: { left: string; right: string; sub?: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[15px]">{left}</span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {right}
        </span>
      </div>
      {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
