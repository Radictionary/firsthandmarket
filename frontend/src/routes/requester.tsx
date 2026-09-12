import { createFileRoute, Link } from "@tanstack/react-router";
import { RequesterAgent } from "@/components/RequesterAgent";

export const Route = createFileRoute("/requester")({
  head: () => ({
    meta: [{ title: "Requester Agent — FirstHandMarket" }],
  }),
  component: RequesterDashboard,
});

function RequesterDashboard() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-xs tracking-[0.24em] uppercase">
            Firsthand<span className="text-primary">Market</span>
          </Link>
          <div className="flex gap-4 text-xs">
            <Link to="/requester" className="text-primary">
              Requester
            </Link>
            <Link to="/provider" className="text-muted-foreground hover:text-foreground">
              Provider
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="eyebrow">Requester workspace</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">Define it. Approve it. Send it.</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Your Requester Agent helps make the request precise. Matching stays blocked until you
          explicitly approve the contract.
        </p>
        <RequesterAgent />
      </section>
    </main>
  );
}
