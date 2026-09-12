import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getDesk,
  addBoundary,
  removeBoundary,
  updateFact,
  setPaused,
} from "@/lib/agent.functions";

export const Route = createFileRoute("/_authenticated/desk")({
  head: () => ({
    meta: [
      { title: "Your agent's desk — FirsthandMarket" },
      {
        name: "description",
        content:
          "Your mandate, your boundaries, and every introduction your agent has negotiated on your behalf.",
      },
      { property: "og:title", content: "Your agent's desk — FirsthandMarket" },
      {
        property: "og:description",
        content: "What your agent knows, what it refuses, and what it has brought you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeskPage,
});

const TIERS = [
  { value: "public", label: "Public" },
  { value: "agent_visible", label: "Agent-visible" },
  { value: "never", label: "Never share" },
] as const;

function DeskPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDesk = useServerFn(getDesk);
  const addRule = useServerFn(addBoundary);
  const dropRule = useServerFn(removeBoundary);
  const editFact = useServerFn(updateFact);
  const pause = useServerFn(setPaused);
  const [rule, setRule] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["desk"], queryFn: () => fetchDesk() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["desk"] });

  const ruleMutation = useMutation({
    mutationFn: (value: string) => addRule({ data: { rule: value } }),
    onSuccess: () => {
      setRule("");
      invalidate();
    },
    onError: () => toast.error("That rule didn't save."),
  });

  useEffect(() => {
    if (data && !data.profile.intake_complete) navigate({ to: "/intake" });
  }, [data, navigate]);

  if (isLoading || !data) {
    return <p className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading…</p>;
  }

  const { profile, facts, boundaries, introductions } = data;
  const live = introductions.filter((i) => i.decision === "pending");
  const settled = introductions.filter((i) => i.decision !== "pending");

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <p className="eyebrow">Your agent's desk</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">
        {profile.full_name ? `Representing ${profile.full_name}.` : "Representing you."}
      </h1>
      {live.length > 0 && (
        <p className="mt-3 font-mono text-[11px] tracking-[0.18em] text-primary uppercase">
          {live.length} {live.length === 1 ? "introduction is" : "introductions are"} waiting on
          your decision
        </p>
      )}
      {profile.headline && (
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          {profile.headline}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          onClick={async () => {
            await pause({ data: { paused: !profile.paused } });
            invalidate();
          }}
          className="rounded-md border border-border px-5 py-2.5 text-sm transition-colors hover:bg-accent"
        >
          {profile.paused ? "Send my agent back out" : "Pause my agent"}
        </button>
        <span className="text-sm text-muted-foreground">
          {profile.paused
            ? "Your agent is not seeking introductions."
            : "Your agent is working the room."}
        </span>
      </div>

      {/* Introductions */}
      <section className="rule-top mt-14 pt-12">
        <p className="eyebrow">Brought to you</p>
        <h2 className="display mt-4 text-3xl">
          {live.length
            ? "Your agent found someone you should meet."
            : "Nothing worth your attention yet."}
        </h2>
        {!live.length && (
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Your agent only brings you something when there's enough signal. Silence is the
            product working.
          </p>
        )}
        <div className="mt-8 grid gap-4">
          {live.map((intro) => (
            <Link
              key={intro.id}
              to="/introductions/$id"
              params={{ id: intro.introduction_id }}
              className="block rounded-xl border border-primary/40 bg-card p-7 transition-colors hover:border-primary"
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
                Agent recommends {intro.recommendation}
              </p>
              <p className="mt-4 text-[17px] leading-relaxed">{intro.why_meet}</p>
              <p className="mt-3 text-sm text-muted-foreground">{intro.the_ask}</p>
            </Link>
          ))}
          {settled.map((intro) => (
            <Link
              key={intro.id}
              to="/introductions/$id"
              params={{ id: intro.introduction_id }}
              className="block rounded-xl border border-border bg-card p-6 transition-colors hover:bg-accent"
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                {intro.status === "connected"
                  ? "Connected"
                  : intro.decision === "accepted"
                    ? "You accepted — waiting on them"
                    : "Declined"}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {intro.why_meet}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Mandate */}
      <section className="rule-top mt-14 pt-12">
        <p className="eyebrow">Your mandate</p>
        <h2 className="display mt-4 text-3xl">What your agent knows about you.</h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Every line is yours to change. Public facts can be seen by other members.
          Agent-visible facts can only be acted on by your representative. Never-share is
          off limits entirely.
        </p>
        <ul className="mt-8 space-y-3">
          {facts.map((fact) => (
            <li key={fact.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {fact.category}
                </span>
                <select
                  value={fact.tier}
                  onChange={async (e) => {
                    await editFact({
                      data: {
                        id: fact.id,
                        tier: e.target.value as "public" | "agent_visible" | "never",
                      },
                    });
                    invalidate();
                  }}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {TIERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    await editFact({ data: { id: fact.id, remove: true } });
                    invalidate();
                  }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <textarea
                defaultValue={fact.content}
                rows={2}
                onBlur={async (e) => {
                  if (e.target.value.trim() === fact.content) return;
                  await editFact({ data: { id: fact.id, content: e.target.value.trim() } });
                  invalidate();
                }}
                className="mt-3 w-full resize-none rounded-md border border-transparent bg-transparent text-[15px] leading-relaxed outline-none focus:border-border focus:bg-background focus:px-3 focus:py-2"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Boundaries */}
      <section className="rule-top mt-14 pt-12 pb-10">
        <p className="eyebrow">Your boundaries</p>
        <h2 className="display mt-4 text-3xl">What your agent refuses on your behalf.</h2>
        <ul className="mt-8 space-y-px overflow-hidden rounded-xl border border-border bg-border">
          {boundaries.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-4 bg-card px-5 py-4 text-[15px] leading-relaxed"
            >
              <span className="font-mono text-xs text-primary">—</span>
              <span className="flex-1">{b.rule}</span>
              <button
                onClick={async () => {
                  await dropRule({ data: { id: b.id } });
                  invalidate();
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </li>
          ))}
          {!boundaries.length && (
            <li className="bg-card px-5 py-4 text-sm text-muted-foreground">
              No rules yet. Your agent will accept anything relevant.
            </li>
          )}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (rule.trim()) ruleMutation.mutate(rule.trim());
          }}
          className="mt-5 flex flex-wrap gap-3"
        >
          <input
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            placeholder="Never introduce me to vendors."
            className="min-w-[260px] flex-1 rounded-md border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={ruleMutation.isPending}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Add rule
          </button>
        </form>
      </section>
    </main>
  );
}
