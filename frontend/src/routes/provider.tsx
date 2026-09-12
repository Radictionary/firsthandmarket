import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Informant = {
  id: string;
  display_name: string;
  bio: string | null;
  location_city: string;
  location_country: string;
  expertise_tags: string[];
  trust_score: number;
  available: boolean;
  avatar_url: string | null;
};

type QueryRow = {
  id: string;
  seeker_name: string | null;
  question: string;
  topic_tags: string[];
  location_city: string | null;
  freshness: string | null;
  status: string | null;
  created_at: string;
};

type MyAnswer = {
  id: string;
  content: string;
  created_at: string;
  queries: { question: string; seeker_name: string | null } | null;
};

export const Route = createFileRoute("/provider")({
  head: () => ({
    meta: [{ title: "Provider dashboard — FirstHandMarket" }],
  }),
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const [informants, setInformants] = useState<Informant[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [me, setMe] = useState<Informant | null>(null);
  const [openQueries, setOpenQueries] = useState<QueryRow[]>([]);
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Load all informants for the picker
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("informants")
        .select("*")
        .eq("verified", true)
        .order("display_name");
      if (error) toast.error(error.message);
      const rows = (data as Informant[]) ?? [];
      setInformants(rows);
      const remembered = localStorage.getItem("fhm_provider_id");
      if (remembered && rows.some((r) => r.id === remembered)) {
        setSelectedId(remembered);
      } else if (rows.length > 0) {
        setSelectedId(rows[0].id);
      }
    })();
  }, []);

  // Load my profile + queue when selection changes
  useEffect(() => {
    if (!selectedId) return;
    localStorage.setItem("fhm_provider_id", selectedId);
    const found = informants.find((i) => i.id === selectedId) ?? null;
    setMe(found);
    if (found) {
      loadOpenQueries(found);
      loadMyAnswers(found.id);
    }
  }, [selectedId, informants]);

  async function loadOpenQueries(informant: Informant) {
    // Queries whose topic_tags overlap the informant's expertise, most recent first
    // Uses PostgREST array-overlap operator "ov"
    const tags = informant.expertise_tags ?? [];
    if (tags.length === 0) {
      setOpenQueries([]);
      return;
    }
    const overlap = `{${tags.map((t) => `"${t}"`).join(",")}}`;
    const { data, error } = await supabase
      .from("queries")
      .select("*")
      .overlaps("topic_tags", tags)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      // fallback: fetch by unfiltered and filter client-side
      const alt = await supabase.from("queries").select("*").order("created_at", { ascending: false }).limit(50);
      const rows = (alt.data as QueryRow[]) ?? [];
      setOpenQueries(rows.filter((q) => (q.topic_tags ?? []).some((t) => tags.includes(t))));
      return;
    }
    setOpenQueries((data as QueryRow[]) ?? []);
    void overlap;
  }

  async function loadMyAnswers(informantId: string) {
    const { data, error } = await supabase
      .from("answers")
      .select("id,content,created_at,queries(question,seeker_name)")
      .eq("informant_id", informantId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) toast.error(error.message);
    setMyAnswers((data as unknown as MyAnswer[]) ?? []);
  }

  async function submitAnswer(queryId: string) {
    if (!me) return;
    const content = draft[queryId]?.trim();
    if (!content) {
      toast.error("Write something first.");
      return;
    }
    setSubmitting(queryId);
    const { error } = await supabase.from("answers").insert({
      query_id: queryId,
      informant_id: me.id,
      content,
    });
    setSubmitting(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Answer posted.");
    setDraft((d) => ({ ...d, [queryId]: "" }));
    loadMyAnswers(me.id);
  }

  return (
    <main className="min-h-screen">
      <header className="rule-bottom">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-xs tracking-[0.24em] uppercase">
            Firsthand<span className="text-primary">Market</span>
          </Link>
          <div className="flex gap-4 text-xs">
            <Link to="/requester" className="text-muted-foreground hover:text-foreground">Requester</Link>
            <Link to="/provider" className="text-primary">Provider</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="eyebrow">Provider dashboard</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">Your inbox.</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Questions matched to your expertise. Reply in your own voice.
        </p>

        {/* Persona picker (demo shortcut for auth) */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <label className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Signed in as
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {informants.map((i) => (
              <option key={i.id} value={i.id}>
                {i.display_name} — {i.location_city}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Demo shortcut. In production this comes from real auth.
          </p>
        </div>

        {/* Profile card */}
        {me && (
          <div className="mt-6 grid gap-6 md:grid-cols-[240px_1fr]">
            <div className="rounded-xl border border-border bg-card p-5">
              {me.avatar_url && (
                <img src={me.avatar_url} alt="" className="size-16 rounded-full bg-accent" />
              )}
              <p className="mt-4 text-lg font-medium">{me.display_name}</p>
              <p className="text-xs text-muted-foreground">
                📍 {me.location_city}, {me.location_country}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{me.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {me.expertise_tags?.map((t) => (
                  <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px]">
                    #{t}
                  </span>
                ))}
              </div>
              <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                Trust score {me.trust_score}
              </p>
            </div>

            {/* Open queue */}
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                Matched questions
              </p>
              <div className="mt-3 grid gap-3">
                {openQueries.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nothing routed to you yet. Have a seeker ask a question matching one of your tags.
                  </p>
                )}
                {openQueries.map((q) => {
                  const alreadyAnswered = myAnswers.some((a) => a.queries?.question === q.question);
                  return (
                    <div key={q.id} className="rounded-xl border border-border bg-card p-5">
                      <p className="text-[15px]">{q.question}</p>
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
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          from {q.seeker_name ?? "anon"} · {new Date(q.created_at).toLocaleString()}
                        </span>
                      </div>
                      {alreadyAnswered && (
                        <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                          Already answered
                        </p>
                      )}
                      <div className="mt-4 flex gap-2">
                        <textarea
                          value={draft[q.id] ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                          rows={2}
                          placeholder="Answer in your own voice…"
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => submitAnswer(q.id)}
                          disabled={submitting === q.id}
                          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {submitting === q.id ? "…" : "Send"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* My past answers */}
              <p className="mt-10 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                Your recent answers
              </p>
              <div className="mt-3 grid gap-3">
                {myAnswers.length === 0 && (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                )}
                {myAnswers.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[13px] text-muted-foreground">
                      ↳ {a.queries?.question ?? "(question deleted)"}
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed">"{a.content}"</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
