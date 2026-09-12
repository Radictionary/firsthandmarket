import { useEffect, useRef, useState } from "react";
import { scenarios } from "./agent-scenarios";

export function AgentExchange() {
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const [thinking, setThinking] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scenario = scenarios[active]!;

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShown(0);
    setThinking(true);

    scenario.lines.forEach((_, i) => {
      timers.current.push(
        setTimeout(
          () => {
            setShown(i + 1);
            setThinking(i + 1 < scenario.lines.length);
          },
          700 + i * 1500,
        ),
      );
    });

    return () => timers.current.forEach(clearTimeout);
  }, [scenario]);

  const done = shown >= scenario.lines.length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap gap-1 border-b border-border bg-secondary/40 p-2">
        {scenarios.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            className={`rounded-md px-3 py-2 text-left text-[13px] leading-snug transition-colors ${
              i === active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {s.goal}
          </button>
        ))}
      </div>

      <div className="grid gap-0 md:grid-cols-[1.55fr_1fr]">
        <div className="min-h-[420px] space-y-4 border-b border-border p-5 md:border-r md:border-b-0 md:p-7">
          <p className="text-xs text-muted-foreground">
            <span className="eyebrow">Brief</span>{" "}
            <span className="ml-2">{scenario.brief}</span>
          </p>

          {scenario.lines.slice(0, shown).map((line, i) => (
            <div
              key={`${scenario.id}-${i}`}
              className={`rise flex ${line.side === "you" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[88%] rounded-lg border px-4 py-3 ${
                  line.kind === "private"
                    ? "border-dashed border-[var(--private)]/50 bg-[var(--private)]/8"
                    : line.side === "you"
                      ? "border-border bg-secondary"
                      : "border-border bg-background"
                }`}
              >
                <p
                  className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                    line.kind === "private"
                      ? "text-[var(--private)]"
                      : "text-muted-foreground"
                  }`}
                >
                  {line.label}
                </p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/90">
                  {line.text}
                </p>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-1.5 pl-1">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="thinking-dot inline-block size-1.5 rounded-full bg-primary"
                  style={{ animationDelay: `${d * 0.18}s` }}
                />
              ))}
              <span className="ml-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                Agents negotiating
              </span>
            </div>
          )}
        </div>

        <div className="bg-background/40 p-5 md:p-7">
          <p className="eyebrow">The packaged meeting</p>
          <dl className="mt-4 space-y-3">
            {scenario.terms.map((t, i) => (
              <div
                key={t.label}
                className={`rule-top pt-3 transition-opacity duration-500 ${
                  done ? "opacity-100" : "opacity-25"
                }`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <dt className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {t.label}
                </dt>
                <dd className="mt-1 text-sm text-foreground/90">{t.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <IntroPitch scenarioId={scenario.id} intro={scenario.intro} ready={done} />
    </div>
  );
}

function IntroPitch({
  scenarioId,
  intro,
  ready,
}: {
  scenarioId: string;
  intro: (typeof scenarios)[number]["intro"];
  ready: boolean;
}) {
  const [decision, setDecision] = useState<string | null>(null);

  useEffect(() => {
    setDecision(null);
  }, [scenarioId]);

  return (
    <div
      className={`border-t border-border bg-secondary/30 p-5 transition-opacity duration-700 md:p-7 ${
        ready ? "opacity-100" : "pointer-events-none opacity-30"
      }`}
    >
      <p className="eyebrow">Now the human gets the pitch</p>
      <h3 className="display mt-2 text-2xl md:text-3xl">{intro.headline}</h3>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="Why">{intro.why}</Field>
        <Field label="Why they may want to meet you">{intro.whyThem}</Field>
        <Field label="What they're asking">{intro.asking}</Field>
        <Field label="What they're not asking">
          {intro.notAsking.map((n) => (
            <span key={n} className="block">
              {n}
            </span>
          ))}
        </Field>
      </div>

      <div className="rule-top mt-6 flex flex-wrap items-center gap-3 pt-5">
        <p className="mr-auto text-sm text-muted-foreground">
          Agent recommendation:{" "}
          <span className="font-medium text-primary">{intro.recommendation}</span>
        </p>
        {decision ? (
          <p className="rise font-mono text-xs tracking-[0.14em] text-[var(--signal)] uppercase">
            {decision}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDecision("Declined — your agent will handle it")}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Decline
            </button>
            <button
              onClick={() => setDecision("Asked your agent — it's pressing for detail")}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            >
              Ask My Agent
            </button>
            <button
              onClick={() => setDecision("Accepted — your agent is scheduling")}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}
