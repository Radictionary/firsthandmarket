import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getIntroduction,
  decideIntroduction,
  askMyAgent,
} from "@/lib/introductions.functions";

export const Route = createFileRoute("/_authenticated/introductions/$id")({
  head: () => ({
    meta: [
      { title: "An introduction — FirsthandMarket" },
      {
        name: "description",
        content:
          "Your agent negotiated the terms of this meeting before either of you was interrupted.",
      },
      { property: "og:title", content: "An introduction — FirsthandMarket" },
      {
        property: "og:description",
        content: "Why you should meet, what's being asked, and what isn't.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntroductionPage,
});

function IntroductionPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getIntroduction);
  const decide = useServerFn(decideIntroduction);
  const ask = useServerFn(askMyAgent);

  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["introduction", id],
    queryFn: () => load({ data: { id } }),
  });

  if (isLoading || !data) {
    return <p className="mx-auto max-w-3xl px-6 py-20 text-muted-foreground">Loading…</p>;
  }

  async function respond(decision: "accepted" | "declined") {
    setBusy(true);
    try {
      await decide({ data: { id, decision } });
      await qc.invalidateQueries({ queryKey: ["introduction", id] });
      qc.invalidateQueries({ queryKey: ["desk"] });
      toast.success(
        decision === "accepted" ? "Accepted. Your agent will confirm." : "Declined.",
      );
    } catch {
      toast.error("That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function sendQuestion(event: React.FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    setAsking(true);
    try {
      const { reply } = await ask({ data: { id, question: q } });
      setAnswers((prev) => [...prev, { q, a: reply }]);
    } catch {
      toast.error("Your agent didn't answer.");
    } finally {
      setAsking(false);
    }
  }

  const connected = data.status === "connected";

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Link to="/desk" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to your desk
      </Link>

      <p className="eyebrow mt-8">Your agent found someone you should meet</p>
      <h1 className="display mt-4 text-4xl">{data.topic ?? "A conversation worth having."}</h1>

      <div className="mt-10 space-y-px overflow-hidden rounded-xl border border-border bg-border">
        <Block label="Why" body={data.why_meet} />
        <Block label="Why they may want to meet you" body={data.why_they_want} />
        <Block label="What they're asking" body={data.the_ask} />
        <Block label="What they're not asking" body={data.not_asking} />
        <Block label="Agent recommendation" body={data.recommendation} accent />
      </div>

      {data.decision === "pending" ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => respond("declined")}
            disabled={busy}
            className="rounded-md border border-border px-6 py-3 text-sm transition-colors hover:bg-accent disabled:opacity-60"
          >
            Decline
          </button>
          <button
            onClick={() => document.getElementById("ask-agent")?.focus()}
            className="rounded-md border border-border px-6 py-3 text-sm transition-colors hover:bg-accent"
          >
            Ask my agent
          </button>
          <button
            onClick={() => respond("accepted")}
            disabled={busy}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Accept
          </button>
        </div>
      ) : (
        <p className="mt-8 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          {connected
            ? "Both sides accepted"
            : data.decision === "accepted"
              ? "You accepted — waiting on their agent"
              : "You declined this one"}
        </p>
      )}

      {connected && (
        <section className="mt-10 rounded-xl border border-primary/40 bg-card p-7">
          <p className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
            Introduction made
          </p>
          <p className="display mt-4 text-3xl">
            {data.counterpart.full_name ?? "Your counterpart"}
          </p>
          {data.counterpart.headline && (
            <p className="mt-2 text-[15px] text-muted-foreground">
              {data.counterpart.headline}
            </p>
          )}
          {data.counterpart.email && (
            <p className="mt-4 font-mono text-sm text-primary">{data.counterpart.email}</p>
          )}
          {data.counterpart.public_facts.length > 0 && (
            <ul className="mt-5 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
              {data.counterpart.public_facts.map((f) => (
                <li key={f}>— {f}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rule-top mt-14 pt-12 pb-10">
        <p className="eyebrow">Ask my agent</p>
        <h2 className="display mt-4 text-3xl">Push back. Privately.</h2>
        <div className="mt-6 space-y-4">
          {answers.map((entry, i) => (
            <div key={i} className="space-y-3">
              <p className="ml-auto max-w-[85%] rounded-xl border border-primary/40 bg-primary/5 p-4 text-[15px]">
                {entry.q}
              </p>
              <p className="rounded-xl border border-border bg-card p-5 text-[15px] leading-relaxed">
                {entry.a}
              </p>
            </div>
          ))}
          {asking && (
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Your agent is thinking…
            </p>
          )}
        </div>
        <form onSubmit={sendQuestion} className="mt-6 flex flex-wrap gap-3">
          <input
            id="ask-agent"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Is this worth 20 minutes of my time?"
            className="min-w-[260px] flex-1 rounded-md border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={asking}
            className="rounded-md border border-border px-6 py-3 text-sm transition-colors hover:bg-accent disabled:opacity-60"
          >
            Ask
          </button>
        </form>
      </section>
    </main>
  );
}

function Block({
  label,
  body,
  accent,
}: {
  label: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-6">
      <p
        className={`font-mono text-[10px] tracking-[0.18em] uppercase ${accent ? "text-primary" : "text-muted-foreground"}`}
      >
        {label}
      </p>
      <p className="mt-3 text-[16px] leading-relaxed">{body}</p>
    </div>
  );
}
