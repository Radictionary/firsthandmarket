import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Bell,
  Bot,
  CalendarDays,
  Check,
  Database,
  FileVideo,
  Mail,
  PlayCircle,
  Plug,
  Send,
  Shield,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AgentMarkdown } from "@/components/AgentMarkdown";
import { supabase } from "@/integrations/supabase/client";
import {
  agentFetch,
  type ChatMessage,
  type Offer,
  type ProviderProfile,
  type ProviderTurnResponse,
} from "@/lib/agent";

type Informant = ProviderProfile & {
  bio: string | null;
  location_city: string;
  location_country: string;
  expertise_tags: string[];
  trust_score: number;
  available: boolean;
  avatar_url: string | null;
  is_demo?: boolean;
};

type MyAnswer = {
  id: string;
  content: string;
  created_at: string;
  queries: { question: string; seeker_name: string | null } | null;
};

type Connector = {
  id: string;
  name: string;
  status: "not_configured" | "connected";
};

type McpCatalog = {
  enabled: boolean;
  message: string;
  connectors: Connector[];
};

const connectorIcons = {
  gmail: Mail,
  "google-calendar": CalendarDays,
  "google-drive": Database,
};

const PROVIDER_WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "I’m your private Provider Agent. I’ll notify you when I find a fitting task, explain the contract, and help prepare your firsthand response. You always decide whether to accept.",
};

const UCLA_DEMO_RESPONSE =
  "I’m at Powell Library this afternoon. The main floor looks moderately busy—roughly three out of four tables are occupied, with a few open seats along the side walls. I filmed a wide 30-second walkthrough and avoided close-ups of faces and laptop screens.";

const UCLA_POWELL_THUMBNAIL =
  "https://upload.wikimedia.org/wikipedia/commons/f/ff/Powell_Library%2C_UCLA_%28front_view%29.jpg";

export const Route = createFileRoute("/provider")({
  head: () => ({
    meta: [{ title: "Provider Agent — FirstHandMarket" }],
  }),
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const [informants, setInformants] = useState<Informant[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([PROVIDER_WELCOME]);
  const [chatInput, setChatInput] = useState("");
  const [responseDraft, setResponseDraft] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [answerBusy, setAnswerBusy] = useState(false);
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([]);
  const [catalog, setCatalog] = useState<McpCatalog | null>(null);
  const [requestedConnector, setRequestedConnector] = useState<string | null>(null);
  const announcedOfferId = useRef("");
  const latestOfferId = useRef("");

  const me = useMemo(
    () => informants.find((informant) => informant.id === selectedId) ?? null,
    [informants, selectedId],
  );
  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.id === selectedOfferId) ?? offers[0] ?? null,
    [offers, selectedOfferId],
  );

  useEffect(() => {
    void (async () => {
      const demoPromise = agentFetch<{ providers: Informant[] }>("/providers/demo").catch(() => ({
        providers: [],
      }));
      const { data, error } = await supabase
        .from("informants")
        .select("*")
        .eq("verified", true)
        .order("display_name");
      if (error) toast.error(error.message);
      const demo = await demoPromise;
      const databaseRows = (data as Informant[]) ?? [];
      const demoIds = new Set(demo.providers.map((provider) => provider.id));
      const rows = [
        ...demo.providers,
        ...databaseRows.filter((provider) => !demoIds.has(provider.id)),
      ];
      setInformants(rows);
      const remembered = localStorage.getItem("fhm_provider_id");
      const demoProvider = rows.find((row) => row.is_demo);
      if (demoProvider) {
        setSelectedId(demoProvider.id);
      } else if (remembered && rows.some((row) => row.id === remembered)) {
        setSelectedId(remembered);
      } else if (rows.length > 0) {
        setSelectedId(rows[0].id);
      }
    })();

    void agentFetch<McpCatalog>("/integrations/mcp")
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    localStorage.setItem("fhm_provider_id", selectedId);
    let cancelled = false;

    async function loadOffers() {
      try {
        const result = await agentFetch<{ offers: Offer[] }>(
          "/providers/" + selectedId + "/offers",
        );
        if (cancelled) return;
        setInboxError(null);
        setOffers(result.offers ?? []);
        const newestId = result.offers[0]?.id ?? "";
        if (newestId && newestId !== latestOfferId.current) {
          latestOfferId.current = newestId;
          setSelectedOfferId(newestId);
        } else {
          setSelectedOfferId((current) =>
            current && result.offers.some((offer) => offer.id === current) ? current : newestId,
          );
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setInboxError(message);
        }
      }
    }

    async function loadAnswers() {
      const { data, error } = await supabase
        .from("answers")
        .select("id,content,created_at,queries(question,seeker_name)")
        .eq("informant_id", selectedId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (!cancelled && !error) setMyAnswers((data as unknown as MyAnswer[]) ?? []);
    }

    setChat((current) => current.slice(0, 1));
    setResponseDraft("");
    setOffers([]);
    void loadOffers();
    void loadAnswers();
    const timer = window.setInterval(loadOffers, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId]);

  const activeOfferId = selectedOffer?.id ?? "";
  const activeOfferMessage = selectedOffer?.provider_agent_message ?? "";
  const activeOfferSubject = selectedOffer?.contract.subject ?? "";
  const activeOfferIsDemo = selectedOffer?.provider.is_demo ?? false;

  useEffect(() => {
    setChat(
      activeOfferMessage
        ? [PROVIDER_WELCOME, { role: "assistant", content: activeOfferMessage }]
        : [PROVIDER_WELCOME],
    );
    setResponseDraft(activeOfferIsDemo ? UCLA_DEMO_RESPONSE : "");
    if (activeOfferId && announcedOfferId.current !== activeOfferId) {
      announcedOfferId.current = activeOfferId;
      toast.info("Your Provider Agent found a new task: " + activeOfferSubject);
    }
  }, [activeOfferId, activeOfferIsDemo, activeOfferMessage, activeOfferSubject]);

  async function respond(decision: "accept" | "decline") {
    if (!me || !selectedOffer || decisionBusy) return;
    setDecisionBusy(true);
    try {
      const updated = await agentFetch<Offer>("/offers/" + selectedOffer.id + "/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: me.id, decision }),
      });
      setOffers((current) => current.map((offer) => (offer.id === updated.id ? updated : offer)));
      toast.success(decision === "accept" ? "Offer accepted." : "Offer declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setDecisionBusy(false);
    }
  }

  async function askProviderAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me || !selectedOffer || !chatInput.trim() || agentBusy) return;
    const message = chatInput.trim();
    const history = chat.slice(-12);
    setChat((current) => [...current, { role: "user", content: message }]);
    setChatInput("");
    setAgentBusy(true);
    try {
      const result = await agentFetch<ProviderTurnResponse>("/agent/provider/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: me.id,
          offer_id: selectedOffer.id,
          message,
          history,
          response_draft: responseDraft,
        }),
      });
      setChat((current) => [...current, { role: "assistant", content: result.reply }]);
      setResponseDraft(result.response_draft);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      toast.error(messageText);
      setChat((current) => [
        ...current,
        { role: "assistant", content: "I couldn't reach the agent service: " + messageText },
      ]);
    } finally {
      setAgentBusy(false);
    }
  }

  async function submitAnswer() {
    if (!me || !selectedOffer || !responseDraft.trim() || answerBusy) return;
    if (selectedOffer.status !== "accepted") {
      toast.error("Accept the offer before submitting an answer.");
      return;
    }
    setAnswerBusy(true);
    try {
      const result = await agentFetch<{ offer: Offer }>("/offers/" + selectedOffer.id + "/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: me.id,
          content: responseDraft.trim(),
          media_url: null,
        }),
      });
      setOffers((current) =>
        current.map((offer) => (offer.id === result.offer.id ? result.offer : offer)),
      );
      toast.success("Demo response sent to the requester.");
      if (!me.is_demo) {
        const { data } = await supabase
          .from("answers")
          .select("id,content,created_at,queries(question,seeker_name)")
          .eq("informant_id", me.id)
          .order("created_at", { ascending: false })
          .limit(12);
        setMyAnswers((data as unknown as MyAnswer[]) ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setAnswerBusy(false);
    }
  }

  function requestConnector(connector: Connector) {
    setRequestedConnector(connector.id);
    toast.info(
      connector.name +
        " needs the MCP OAuth endpoint. The UI slot is ready; no data was connected.",
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-xs tracking-[0.24em] uppercase">
            Firsthand<span className="text-primary">Market</span>
          </Link>
          <div className="flex gap-4 text-xs">
            <Link to="/requester" className="text-muted-foreground hover:text-foreground">
              Requester
            </Link>
            <Link to="/provider" className="text-primary">
              Provider
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Provider workspace</p>
            <h1 className="display mt-4 text-4xl md:text-5xl">Offers, on your terms.</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              The Requester Agent found a fit. Your Provider Agent helps you evaluate and answer,
              but only you can accept or decline.
            </p>
          </div>
          <label className="w-full md:w-72">
            <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
              Demo identity
            </span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {informants.map((informant) => (
                <option key={informant.id} value={informant.id}>
                  {informant.display_name} — {informant.location_city}
                  {informant.is_demo ? " (demo)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)_300px]">
          <aside className="space-y-5">
            {me && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  {me.avatar_url ? (
                    <img
                      src={me.avatar_url}
                      alt=""
                      className="size-12 rounded-full bg-accent object-cover"
                    />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-full bg-accent">
                      {me.display_name.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium">{me.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {me.location_city} · trust {me.trust_score}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{me.bio}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {me.expertise_tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-accent px-2 py-1 text-[9px]">
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-muted-foreground">
                  Demo picker only. Production identity comes from auth.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
                  Offer inbox
                </p>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bell className="size-3.5" aria-hidden="true" /> {offers.length}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {offers.length === 0 && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    No offers yet. Approve a matching request in the Requester workspace, then
                    return as the selected provider.
                  </p>
                )}
                {inboxError && (
                  <p className="rounded-md bg-destructive/10 p-2 text-[10px] leading-relaxed text-destructive">
                    Agent service unavailable: {inboxError}
                  </p>
                )}
                {offers.map((offer) => (
                  <button
                    key={offer.id}
                    type="button"
                    onClick={() => setSelectedOfferId(offer.id)}
                    className={
                      "w-full rounded-lg border p-3 text-left transition-colors " +
                      (selectedOffer?.id === offer.id
                        ? "border-primary bg-accent"
                        : "border-border bg-background hover:border-primary/60")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-xs font-medium">{offer.contract.subject}</p>
                      <span className="shrink-0 font-mono text-[8px] uppercase text-primary">
                        {offer.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[9px] text-muted-foreground">
                      From {offer.requester_name} · free demo request
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {!selectedOffer && (
              <div className="grid min-h-[430px] place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <div>
                  <Bell className="mx-auto size-7 text-primary" aria-hidden="true" />
                  <p className="display mt-4 text-2xl">Waiting for an offer</p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Offers appear only when a requester approves a contract and the deterministic
                    matcher selects this profile.
                  </p>
                </div>
              </div>
            )}

            {selectedOffer && (
              <>
                <div className="rounded-xl border border-primary/40 bg-card p-6 shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
                        Incoming offer
                      </p>
                      <h2 className="display mt-3 text-3xl">{selectedOffer.contract.subject}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        {selectedOffer.contract.objective}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent px-3 py-1 font-mono text-[9px] uppercase">
                      {selectedOffer.status}
                    </span>
                  </div>

                  <dl className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                    {[
                      ["Deliverable", selectedOffer.contract.deliverable],
                      [
                        "Location",
                        [
                          selectedOffer.contract.location_city,
                          selectedOffer.contract.location_country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Anywhere",
                      ],
                      ["Deadline", selectedOffer.contract.deadline || "Flexible"],
                      ["Cost", "Free during the demo"],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-background p-4">
                        <dt className="text-[9px] text-muted-foreground uppercase">{label}</dt>
                        <dd className="mt-1 text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-5">
                    <p className="text-[9px] text-muted-foreground uppercase">Done means</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {selectedOffer.contract.acceptance_criteria.map((criterion) => (
                        <li key={criterion}>• {criterion}</li>
                      ))}
                    </ul>
                  </div>

                  {selectedOffer.status === "proposed" && (
                    <div className="mt-6 flex gap-3 border-t border-border pt-5">
                      <button
                        type="button"
                        onClick={() => void respond("accept")}
                        disabled={decisionBusy}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        <Check className="size-4" aria-hidden="true" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void respond("decline")}
                        disabled={decisionBusy}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm disabled:opacity-50"
                      >
                        <X className="size-4" aria-hidden="true" /> Decline
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                    <span className="grid size-9 place-items-center rounded-full bg-private/20 text-private">
                      <Bot className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Your Provider Agent</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Shield className="size-3" aria-hidden="true" /> Private from the requester
                      </p>
                    </div>
                  </div>
                  <div className="h-72 overflow-y-auto p-5">
                    <div className="space-y-4">
                      {chat.map((message, index) => (
                        <div
                          key={message.role + "-" + index}
                          className={
                            "flex " + (message.role === "user" ? "justify-end" : "justify-start")
                          }
                        >
                          <div
                            className={
                              "max-w-[86%] rounded-lg px-4 py-3 text-[13px] leading-relaxed " +
                              (message.role === "user"
                                ? "whitespace-pre-line bg-private/20 text-foreground"
                                : "bg-background")
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
                      {agentBusy && (
                        <p className="thinking-dot text-xs text-muted-foreground">
                          Provider Agent is thinking…
                        </p>
                      )}
                    </div>
                  </div>
                  <form
                    onSubmit={askProviderAgent}
                    className="flex gap-2 border-t border-border p-4"
                  >
                    <input
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Ask what is required, or give it facts to polish…"
                      className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-private"
                    />
                    <button
                      type="submit"
                      disabled={agentBusy || !chatInput.trim()}
                      aria-label="Send to Provider Agent"
                      className="grid size-10 place-items-center rounded-md bg-private/20 text-private disabled:opacity-40"
                    >
                      <Send className="size-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
                    Your firsthand answer
                  </p>
                  <textarea
                    value={responseDraft}
                    onChange={(event) => setResponseDraft(event.target.value)}
                    rows={5}
                    placeholder="Give the Provider Agent your firsthand facts, or write the answer directly here."
                    className="mt-4 w-full rounded-md border border-border bg-background px-3 py-3 text-sm leading-relaxed outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => void submitAnswer()}
                    disabled={
                      answerBusy || selectedOffer.status !== "accepted" || !responseDraft.trim()
                    }
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
                  >
                    {selectedOffer.contract.deliverable === "video" ? (
                      <FileVideo className="size-4" aria-hidden="true" />
                    ) : (
                      <Send className="size-4" aria-hidden="true" />
                    )}
                    {selectedOffer.status === "completed"
                      ? "Response sent to requester"
                      : selectedOffer.status === "accepted"
                        ? answerBusy
                          ? "Sending…"
                          : selectedOffer.contract.deliverable === "video"
                            ? "Send demo response"
                            : "Send firsthand answer"
                        : "Accept before sending"}
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-xl border border-primary/40 bg-card p-5">
              <div className="flex items-center gap-2">
                <FileVideo className="size-4 text-primary" aria-hidden="true" />
                <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
                  Built-in demo preview
                </p>
              </div>
              <div className="relative mt-4 overflow-hidden rounded-lg border border-border bg-background">
                <img
                  src={UCLA_POWELL_THUMBNAIL}
                  alt="Powell Library at UCLA"
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-0 grid place-items-center bg-black/15">
                  <div className="grid size-11 place-items-center rounded-full bg-black/70 text-white">
                    <PlayCircle className="size-6" aria-hidden="true" />
                  </div>
                </div>
                <span className="absolute right-2 bottom-2 rounded bg-black/75 px-2 py-1 font-mono text-[8px] text-white uppercase">
                  0:30 demo
                </span>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                Powell Library preview is already attached. No upload or setup is needed during the
                demo.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Plug className="size-4 text-primary" aria-hidden="true" />
                <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
                  Agent context
                </p>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Connect MCP tools later so your Provider Agent can understand what you know and when
                you are available. Raw private data never goes to the requester.
              </p>
              <div className="mt-4 space-y-2">
                {(
                  catalog?.connectors ?? [
                    { id: "gmail", name: "Gmail", status: "not_configured" as const },
                    {
                      id: "google-calendar",
                      name: "Google Calendar",
                      status: "not_configured" as const,
                    },
                    {
                      id: "google-drive",
                      name: "Google Drive",
                      status: "not_configured" as const,
                    },
                  ]
                ).map((connector) => {
                  const Icon = connectorIcons[connector.id as keyof typeof connectorIcons] ?? Plug;
                  return (
                    <div
                      key={connector.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                    >
                      <span className="flex items-center gap-2 text-xs">
                        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {connector.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => requestConnector(connector)}
                        className="text-[9px] text-primary hover:underline"
                      >
                        {requestedConnector === connector.id ? "Needs endpoint" : "Connect"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                {catalog?.message ?? "MCP OAuth transports are not configured in this local demo."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                Recent answers
              </p>
              <div className="mt-4 space-y-3">
                {myAnswers.length === 0 && (
                  <p className="text-xs text-muted-foreground">No answers sent yet.</p>
                )}
                {myAnswers.slice(0, 4).map((answer) => (
                  <div
                    key={answer.id}
                    className="border-t border-border pt-3 first:border-0 first:pt-0"
                  >
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">
                      {answer.queries?.question || "Request"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed">{answer.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
