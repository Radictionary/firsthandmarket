import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AGENT_URL = (import.meta.env.VITE_AGENT_URL as string) ?? "http://localhost:8000";
const SEEKER_KEY = "fhm_seeker_name";

type QueryRow = {
  id: string;
  seeker_name: string | null;
  question: string;
  topic_tags: string[] | null;
  location_city: string | null;
  freshness: string | null;
  status: string | null;
  created_at: string;
};

type Answer = {
  id: string;
  content: string;
  created_at: string;
  informants: {
    display_name: string;
    location_city: string;
    trust_score: number;
    avatar_url: string | null;
  } | null;
};

export const Route = createFileRoute("/requester")({
  head: () => ({
    meta: [{ title: "Requester dashboard — FirstHandMarket" }],
  }),
  component: RequesterDashboard,
});

function RequesterDashboard() {
  const [seekerName, setSeekerName] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [queries, setQueries] = useState<QueryRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [loading, setLoading] = useState(true);

  // Load remembered seeker name
  useEffect(() => {
    const remembered = localStorage.getItem(SEEKER_KEY);
    if (remembered) setSeekerName(remembered);
  }, []);

  async function loadQueries(name: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("queries")
      .select("*")
      .eq("seeker_name", name)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) toast.error(error.message);
    setQueries((data as QueryRow[]) ?? []);
    setLoading(false);
  }

  async function loadAnswers(queryId: string) {
    if (answers[queryId]) return;
    const { data, error } = await supabase
      .from("answers")
      .select("id,content,created_at,informants(display_name,location_city,trust_score,avatar_url)")
      .eq("query_id", queryId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setAnswers((prev) => ({ ...prev, [queryId]: (data as unknown as Answer[]) ?? [] }));
  }

  useEffect(() => {
    if (seekerName.trim()) loadQueries(seekerName.trim());
  }, [seekerName]);

  async function onAsk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!question.trim() || !seekerName.trim()) {
      toast.error("Add a name and a question.");
      return;
    }
    localStorage.setItem(SEEKER_KEY, seekerName.trim());
    setAsking(true);
    try {
      const res = await fetch(`${AGENT_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), seeker_name: seekerName.trim() }),
      });
      if (!res.ok) throw new Error(`agent returned ${res.status}`);
      const data = await res.json();
      toast.success(`Matched ${data.matches?.length ?? 0} informants.`);
      setQuestion("");
      await loadQueries(seekerName.trim());
      setExpanded(data.query_id);
      await loadAnswers(data.query_id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Agent unreachable: ${msg}`);
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="rule-bottom">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-xs tracking-[0.24em] uppercase">
            Firsthand<span className="text-primary">Market</span>
          </Link>
          <div className="flex gap-4 text-xs">
            <Link to="/requester" className="text-primary">Requester</Link>
            <Link to="/provider" className="text-muted-foreground hover:text-foreground">Provider</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="eyebrow">Requester dashboard</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">Your questions.</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Ask the agent something. See who it routed you to and what they said.
        </p>

        {/* Ask form */}
        <form onSubmit={onAsk} className="mt-10 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto]">
            <input
              type="text"
              value={seekerName}
              onChange={(e) => setSeekerName(e.target.value)}
              placeholder="Your name"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something about a place, a scene, a moment…"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={asking}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {asking ? "Asking…" : "Ask"}
            </button>
          </div>
        </form>

        {/* Query list */}
        <div className="mt-12">
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            History{seekerName ? ` · ${seekerName}` : ""}
          </p>
          <div className="mt-4 grid gap-3">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && queries.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {seekerName
                  ? "No questions yet — ask one above."
                  : "Enter your name above to see your history."}
              </p>
            )}
            {queries.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  const next = expanded === q.id ? null : q.id;
                  setExpanded(next);
                  if (next) loadAnswers(q.id);
                }}
                className="w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="flex-1 text-[15px]">{q.question}</p>
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] uppercase">
                    {q.status ?? "open"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {q.location_city && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px]">
                      📍 {q.location_city}
                    </span>
                  )}
                  {q.topic_tags?.map((t) => (
                    <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px]">
                      #{t}
                    </span>
                  ))}
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px]">
                    ⏱ {q.freshness ?? "now"}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(q.created_at).toLocaleString()}
                  </span>
                </div>

                {expanded === q.id && (
                  <div className="mt-5 border-t border-border pt-5">
                    {answers[q.id] == null && (
                      <p className="text-xs text-muted-foreground">Loading answers…</p>
                    )}
                    {answers[q.id]?.length === 0 && (
                      <p className="text-xs text-muted-foreground">No answers yet.</p>
                    )}
                    <div className="grid gap-3">
                      {answers[q.id]?.map((a) => (
                        <div key={a.id} className="rounded-md bg-background/50 p-4">
                          <div className="flex items-center gap-3">
                            {a.informants?.avatar_url && (
                              <img
                                src={a.informants.avatar_url}
                                alt=""
                                className="size-8 rounded-full bg-accent"
                              />
                            )}
                            <div>
                              <p className="text-xs font-medium">
                                {a.informants?.display_name ?? "Unknown"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {a.informants?.location_city} · trust {a.informants?.trust_score}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 text-[14px] leading-relaxed text-foreground/90">
                            "{a.content}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
