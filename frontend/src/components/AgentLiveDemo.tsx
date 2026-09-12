import { RequesterAgent } from "@/components/RequesterAgent";

export function AgentLiveDemo() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="eyebrow">Live · Requester Agent</p>
        <h2 className="display mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
          Turn a vague need into a request a real person can actually fulfill.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Talk through the details, review the contract, and approve it. Only then does the system
          match one provider and notify their agent.
        </p>
        <RequesterAgent compact />
      </div>
    </section>
  );
}
