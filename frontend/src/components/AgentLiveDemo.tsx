import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const AGENT_URL = (import.meta.env.VITE_AGENT_URL as string) ?? "http://localhost:8000";

type Answer = {
  informant_id: string;
  display_name: string;
  city: string;
  avatar_url?: string | null;
  trust_score?: number | null;
  answer: string;
};

type AskResponse = {
  query_id: string;
  intent: { topic_tags: string[]; city?: string | null; freshness?: string };
  matches: Array<{ id: string; display_name: string; location_city: string; avatar_url?: string | null; trust_score?: number }>;
  answers: Answer[];
  reply: string;
};

const SUGGESTIONS = [
  "What's a global hackathon actually like on day 2?",
  "How's Manila nightlife on a Tuesday?",
  "What's the food scene like in Bangalore right now?",
  "Anyone in Berlin who can tell me about the design community?",
  "Is Bangkok safe for a solo woman traveler at night?",
];

export function AgentLiveDemo() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`${AGENT_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`agent returned ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`Agent unreachable: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    ask(question.trim());
  }

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
          Live · Our agent, your question
        </p>
        <h2 className="display mt-4 text-4xl leading-tight sm:text-5xl">
          Ask something real. Watch the agent find someone who lives it.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          The agent parses your intent, matches verified people on the ground, and returns their
          first-hand answers. No blogs, no marketing pages — only humans in the context.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about a place, a scene, a moment…"
            className="flex-1 rounded-md border border-border bg-card px-4 py-3 text-[15px] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Matching…" : "Ask"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setQuestion(s); ask(s); }}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-6 text-sm text-destructive">
            {error} — make sure the backend agent is running at {AGENT_URL}.
          </p>
        )}

        {data && (
          <div className="mt-10 grid gap-6">
            {/* Intent */}
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                Extracted intent
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {data.intent.topic_tags?.map((t) => (
                  <span key={t} className="rounded-full bg-accent px-2.5 py-1">#{t}</span>
                ))}
                {data.intent.city && (
                  <span className="rounded-full bg-accent px-2.5 py-1">📍 {data.intent.city}</span>
                )}
                {data.intent.freshness && (
                  <span className="rounded-full bg-accent px-2.5 py-1">⏱ {data.intent.freshness}</span>
                )}
              </div>
            </div>

            {/* Synthesized reply */}
            <div className="rounded-xl border border-primary/40 bg-card p-6">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                Agent synthesis
              </p>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">
                {data.reply}
              </p>
            </div>

            {/* Answers */}
            {data.answers?.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.answers.map((a) => (
                  <div key={a.informant_id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      {a.avatar_url && (
                        <img src={a.avatar_url} alt="" className="size-10 rounded-full bg-accent" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{a.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.city}{a.trust_score != null ? ` · trust ${a.trust_score}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                      "{a.answer}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
