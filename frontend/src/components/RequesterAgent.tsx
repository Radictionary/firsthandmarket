import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Check, Clock3, PlayCircle, Send, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AgentMarkdown } from "@/components/AgentMarkdown";
import {
  agentFetch,
  type ChatMessage,
  type FirsthandAnswer,
  type RequestContract,
  type RequesterTurnResponse,
} from "@/lib/agent";

const REQUESTER_KEY = "fhm_requester_name";

const suggestions = [
  "I need a 30-second video showing how busy UCLA's Powell Library is this afternoon, before 5 PM PT. Avoid close-ups of faces or screens.",
  "Find a student at a global hackathon who can describe what day two feels like.",
  "I need a current photo of the vegetarian options at a night market in Bangkok.",
];

export function RequesterAgent({ compact = false }: { compact?: boolean }) {
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Tell me what you need from a real person. I’ll clarify the deliverable, access, deadline, and what counts as a good answer before you approve anything.",
    },
  ]);
  const [draft, setDraft] = useState<RequestContract | null>(null);
  const [ready, setReady] = useState(false);
  const [offer, setOffer] = useState<RequesterTurnResponse["offer"]>(null);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<FirsthandAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const turnId = useRef("");

  useEffect(() => {
    const remembered = localStorage.getItem(REQUESTER_KEY);
    if (remembered) setName(remembered);
  }, []);

  useEffect(() => {
    if (!queryId) return;
    let cancelled = false;
    async function refresh() {
      try {
        const result = await agentFetch<{ answers: FirsthandAnswer[] }>(
          "/queries/" + queryId + "/answers",
        );
        if (!cancelled) setAnswers(result.answers ?? []);
      } catch {
        // A pending offer commonly has no answer yet.
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [queryId]);

  useEffect(() => {
    if (!offer?.id || offer.status === "declined" || offer.status === "completed") return;
    let cancelled = false;
    async function refreshOffer() {
      try {
        const current = await agentFetch<RequesterTurnResponse["offer"]>("/offers/" + offer.id);
        if (!cancelled) setOffer(current);
      } catch {
        // Keep the last known status if the demo backend restarts.
      }
    }
    const timer = window.setInterval(refreshOffer, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [offer?.id, offer?.status]);

  function ensureTurnId() {
    if (!turnId.current) turnId.current = crypto.randomUUID();
    return turnId.current;
  }

  async function send(message: string, approved = false) {
    const cleanName = name.trim();
    const cleanMessage = message.trim();
    if (!cleanName) {
      toast.error("Add your name so the provider knows who sent the request.");
      return;
    }
    if (!cleanMessage || loading) return;

    localStorage.setItem(REQUESTER_KEY, cleanName);
    const priorHistory = messages.slice(-12);
    setMessages((current) => [...current, { role: "user", content: cleanMessage }]);
    setInput("");
    setLoading(true);
    try {
      const data = await agentFetch<RequesterTurnResponse>("/agent/requester/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_name: cleanName,
          message: cleanMessage,
          turn_id: ensureTurnId(),
          history: priorHistory,
          draft,
          ready_for_approval: ready,
          approved,
        }),
      });
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
      setDraft(data.draft);
      setReady(data.ready_for_approval);
      setOffer(data.offer);
      setQueryId(data.query_id);
      if (data.offer) toast.success("Offer sent to " + data.offer.provider.display_name + ".");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I couldn't reach the agent service: " + errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  const contractRows: Array<[string, string]> = draft
    ? [
        ["Deliverable", draft.deliverable + ": " + draft.subject],
        [
          "Where",
          [draft.location_city, draft.location_country].filter(Boolean).join(", ") ||
            "Any location",
        ],
        ["Deadline", draft.deadline || "No hard deadline"],
        [
          "Access",
          [...draft.required_affiliations, ...draft.required_access].join(", ") ||
            "No special access",
        ],
      ]
    : [];

  return (
    <div className={compact ? "mt-8" : "mt-10"}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.75fr)]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">Your Requester Agent</p>
                <p className="text-[11px] text-muted-foreground">
                  Private workspace · Oxen / Gemini
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-signal uppercase">
              <span className="size-1.5 rounded-full bg-signal" /> live
            </span>
          </div>

          <div
            className={compact ? "h-[350px] overflow-y-auto p-5" : "h-[430px] overflow-y-auto p-5"}
          >
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.role + "-" + index}
                  className={
                    "flex gap-3 " + (message.role === "user" ? "justify-end" : "justify-start")
                  }
                >
                  {message.role === "assistant" && (
                    <Bot className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  <div
                    className={
                      "max-w-[86%] rounded-lg px-4 py-3 text-[13px] leading-relaxed " +
                      (message.role === "user"
                        ? "whitespace-pre-line bg-primary text-primary-foreground"
                        : "bg-background text-foreground/90")
                    }
                  >
                    {message.role === "assistant" ? (
                      <AgentMarkdown content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Bot className="size-4 text-primary" aria-hidden="true" />
                  <span className="thinking-dot">Refining the request…</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={onSubmit} className="border-t border-border p-4">
            <div className="mb-3 flex gap-2">
              <UserRound
                className="mt-2.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="w-40 rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe what you need…"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pl-6">
                {suggestions.slice(0, compact ? 2 : 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-border px-3 py-1.5 text-left text-[10px] text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
                Request contract
              </p>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" /> you approve
              </span>
            </div>
            {!draft && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The agent will turn your conversation into a checkable contract. No provider is
                contacted before approval.
              </p>
            )}
            {draft && (
              <>
                <p className="mt-4 text-[14px] leading-relaxed">{draft.objective}</p>
                <dl className="mt-5 space-y-3">
                  {contractRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-4 border-t border-border pt-3"
                    >
                      <dt className="text-[10px] text-muted-foreground uppercase">{label}</dt>
                      <dd className="max-w-[65%] text-right text-xs">{value}</dd>
                    </div>
                  ))}
                </dl>
                {draft.acceptance_criteria.length > 0 && (
                  <div className="mt-4 rounded-md bg-background p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Done means</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {draft.acceptance_criteria.map((criterion) => (
                        <li key={criterion}>• {criterion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ready && !offer && (
                  <button
                    type="button"
                    onClick={() =>
                      void send("I approve this request contract. Match it now.", true)
                    }
                    disabled={loading}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="size-4" aria-hidden="true" /> Approve &amp; find provider
                  </button>
                )}
              </>
            )}
          </div>

          {offer && (
            <div className="rise rounded-xl border border-primary/40 bg-card p-5">
              <p className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
                Offer delivered
              </p>
              <div className="mt-4 flex items-center gap-3">
                {offer.provider.avatar_url ? (
                  <img
                    src={offer.provider.avatar_url}
                    alt=""
                    className="size-11 rounded-full bg-accent object-cover"
                  />
                ) : (
                  <span className="grid size-11 place-items-center rounded-full bg-accent text-sm">
                    {offer.provider.display_name.slice(0, 1)}
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium">{offer.provider.display_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {offer.provider.location_city || "Remote"} · trust{" "}
                    {offer.provider.trust_score ?? "new"}
                  </p>
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {offer.status === "proposed"
                  ? "Waiting for the provider to accept. Their private agent has the full contract."
                  : "Provider " + offer.status + " the request."}
              </p>
            </div>
          )}

          {answers.length > 0 && (
            <div className="rise rounded-xl border border-signal/50 bg-card p-5">
              <p className="font-mono text-[10px] tracking-[0.18em] text-signal uppercase">
                Firsthand answer
              </p>
              {answers.map((answer, index) => (
                <div
                  key={answer.created_at + "-" + index}
                  className="mt-4 border-t border-border pt-4 first:border-0 first:pt-0"
                >
                  {answer.thumbnail_url && (
                    <div className="relative mb-4 overflow-hidden rounded-lg border border-border bg-background">
                      <img
                        src={answer.thumbnail_url}
                        alt="Powell Library at UCLA"
                        className="aspect-video w-full object-cover"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/15">
                        <span className="grid size-12 place-items-center rounded-full bg-black/70 text-white">
                          <PlayCircle className="size-7" aria-hidden="true" />
                        </span>
                      </div>
                      <span className="absolute right-2 bottom-2 rounded bg-black/75 px-2 py-1 font-mono text-[8px] text-white uppercase">
                        0:30 demo preview
                      </span>
                    </div>
                  )}
                  {answer.media_url && (
                    <video
                      src={answer.media_url}
                      controls
                      className="mb-4 aspect-video w-full rounded-lg bg-background object-cover"
                    />
                  )}
                  {!answer.thumbnail_url &&
                    !answer.media_url &&
                    answer.demo &&
                    answer.deliverable === "video" && (
                      <div className="grain mb-4 grid aspect-video place-items-center rounded-lg border border-border bg-background">
                        <div className="text-center">
                          <PlayCircle className="mx-auto size-9 text-primary" aria-hidden="true" />
                          <p className="mt-2 text-xs font-medium">
                            {answer.duration_seconds || 30}-second video response
                          </p>
                          <p className="mt-1 font-mono text-[8px] tracking-[0.14em] text-muted-foreground uppercase">
                            Simulated demo delivery
                          </p>
                        </div>
                      </div>
                    )}
                  <p className="text-[14px] leading-relaxed">{answer.content}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {answer.informants?.display_name || "Verified provider"}
                    {answer.demo ? " · fake demo person" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
