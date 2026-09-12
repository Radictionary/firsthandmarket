import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getIntake, intakeTurn, resetIntake, type IntakeMessage } from "@/lib/agent.functions";

export const Route = createFileRoute("/_authenticated/intake")({
  head: () => ({
    meta: [
      { title: "Your intake interview — FirsthandMarket" },
      {
        name: "description",
        content:
          "A short private conversation with your agent that becomes the mandate it represents you under.",
      },
      { property: "og:title", content: "Your intake interview — FirsthandMarket" },
      {
        property: "og:description",
        content: "Not a profile. A briefing with your representative.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntakePage,
});

function IntakePage() {
  const navigate = useNavigate();
  const load = useServerFn(getIntake);
  const turn = useServerFn(intakeTurn);
  const reset = useServerFn(resetIntake);
  const [messages, setMessages] = useState<IntakeMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useQuery({ queryKey: ["intake"], queryFn: () => load() });

  async function startOver() {
    if (thinking) return;
    await reset();
    setMessages([]);
    const fresh = await refetch();
    if (fresh.data) setMessages(fresh.data.messages);
    toast.success("Fresh start. Your agent is listening.");
  }

  useEffect(() => {
    if (data) setMessages(data.messages);
  }, [data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || thinking) return;
    setDraft("");
    setMessages((m) => [...m, { role: "member", content: message }]);
    setThinking(true);
    try {
      const result = await turn({ data: { message } });
      setMessages((m) => [...m, { role: "agent", content: result.reply }]);
      if (result.done) {
        toast.success("Your agent has what it needs.");
        setTimeout(() => navigate({ to: "/desk" }), 1600);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your agent went quiet.");
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="eyebrow">Intake</p>
      <h1 className="display mt-4 text-4xl">
        Your agent needs to understand you first.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Ten minutes, once. Everything you say here is private — you decide afterwards
        what your agent may share, act on quietly, or never use at all.
      </p>

      <div className="mt-10 space-y-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "agent"
                ? "rounded-xl border border-border bg-card p-6"
                : "ml-auto max-w-[85%] rounded-xl border border-primary/40 bg-primary/5 p-5"
            }
          >
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              {m.role === "agent" ? "Your agent" : "You"}
            </p>
            <p className="mt-3 text-[16px] leading-relaxed whitespace-pre-wrap">
              {m.content}
            </p>
          </div>
        ))}
        {thinking && (
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Your agent is thinking…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-8">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
          }}
          rows={3}
          placeholder="Answer in your own words…"
          className="w-full rounded-xl border border-border bg-card px-5 py-4 text-[15px] leading-relaxed outline-none focus:border-primary"
        />
        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={thinking}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Send
          </button>
          <span className="text-xs text-muted-foreground">⌘ + Enter</span>
          <button
            type="button"
            onClick={startOver}
            disabled={thinking}
            className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Start over
          </button>
        </div>
      </form>
    </main>
  );
}
