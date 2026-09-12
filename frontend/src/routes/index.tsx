import { createFileRoute, Link } from "@tanstack/react-router";
import { RepresentationForm } from "@/components/RepresentationForm";
import { AgentLiveDemo } from "@/components/AgentLiveDemo";
import { NavAccount } from "@/components/NavAccount";
import heroImage from "@/assets/agents-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FirsthandMarket — Ask the world. Get a firsthand answer." },
      {
        name: "description",
        content:
          "Two private agents, one approved request contract, and a verified network of people who can answer from firsthand experience.",
      },
      { property: "og:title", content: "FirsthandMarket — Ask the world. Get a firsthand answer." },
      {
        property: "og:description",
        content:
          "Requester and Provider Agents coordinate through an approved contract while the humans stay in control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const brokenSources = [
  ["Google", "2018 blog posts and marketing pages."],
  ["Reddit", "Two conflicting takes and no context."],
  ["TripAdvisor", "Reviews from people who visited once, five years ago."],
  ["ChatGPT", "A plausible answer with no living source."],
];

const howItWorks = [
  [
    "01",
    "Requester Agent clarifies",
    "Talk through the deliverable, place, access, deadline, and acceptance criteria.",
  ],
  [
    "02",
    "You approve",
    "Review the structured contract. Matching stays blocked until you explicitly approve it.",
  ],
  [
    "03",
    "System matches",
    "Deterministic filters rank eligible providers, then one receives a private offer notification.",
  ],
  [
    "04",
    "Provider decides",
    "Their Provider Agent explains the job, but the human accepts or declines and supplies the answer.",
  ],
];

const informantSnapshot = [
  {
    name: "Maya Reyes",
    city: "Manila",
    tags: ["hackathons", "manila-nightlife", "ai"],
    trust: 0.92,
  },
  { name: "Kenji Tanaka", city: "Tokyo", tags: ["tokyo-food", "ramen", "tech"], trust: 0.9 },
  {
    name: "Zara Ahmed",
    city: "Cairo",
    tags: ["healthcare", "safety", "women-solo-travel"],
    trust: 0.93,
  },
  {
    name: "Diego Ferreira",
    city: "São Paulo",
    tags: ["music", "sao-paulo-nightlife", "safety"],
    trust: 0.86,
  },
  { name: "Amara Okafor", city: "Lagos", tags: ["startups", "lagos-food", "safety"], trust: 0.87 },
  {
    name: "Camille Laurent",
    city: "Paris",
    tags: ["culture", "paris-food", "journalism"],
    trust: 0.88,
  },
];

const verification = [
  ["ID-verified", "Real name, real face, real account."],
  ["GPS-confirmed", "Check-ins over time prove they actually live where they claim."],
  ["Reputation-scored", "Every answer rated. Trust score follows them."],
  ["Cross-checked", "For high-stakes questions, we ask multiple locals and flag disagreement."],
];

function Index() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="grain relative overflow-hidden">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative mx-auto max-w-5xl px-6 pt-10 pb-24 md:pt-14 md:pb-32">
          <nav className="flex items-center justify-between">
            <span className="font-mono text-xs tracking-[0.24em] uppercase">
              Firsthand<span className="text-primary">Market</span>
            </span>
            <div className="flex items-center gap-5 text-xs">
              <Link to="/requester" className="text-muted-foreground hover:text-foreground">
                Requester
              </Link>
              <Link to="/provider" className="text-muted-foreground hover:text-foreground">
                Provider
              </Link>
              <NavAccount />
            </div>
          </nav>

          <p className="eyebrow mt-20 md:mt-28">
            Two private agents · One shared contract · Real people
          </p>
          <h1 className="display mt-5 text-[clamp(2.75rem,8vw,6rem)]">
            Ask the world.
            <br />
            Get a firsthand answer.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
            The internet gives you old blog posts and Reddit guesses. FirstHandMarket connects you
            with verified people who actually live the place, the scene, or the moment you're asking
            about.
          </p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed">
            Your Requester Agent defines the need. Their Provider Agent helps them respond.{" "}
            <em className="display text-2xl text-primary">One contract. Humans decide.</em>
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#try"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try it live
            </a>
            <a
              href="#how"
              className="rounded-md border border-border px-6 py-3 text-sm transition-colors hover:bg-accent"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section eyebrow="The problem">
        <h2 className="display max-w-3xl text-4xl md:text-5xl">
          When you have a real question about a real place, the internet doesn't have a real answer.
        </h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {brokenSources.map(([label, sub]) => (
            <div key={label} className="bg-card p-6">
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-3 text-[17px] leading-snug">{sub}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Meanwhile — right now — someone in the exact place you're asking about is living the
          answer. FirstHandMarket is how you reach them.
        </p>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="How it works">
        <h2 className="display max-w-3xl text-4xl md:text-5xl">
          Two role agents, without a game of telephone.
        </h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          The agents do not freely negotiate or message one another. They work from the same
          approved request contract, while matching and user decisions stay deterministic and
          auditable.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map(([step, title, body]) => (
            <div key={step} className="bg-card p-7">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                Step {step}
              </p>
              <p className="display mt-3 text-2xl">{title}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        {/* Flow diagram */}
        <div className="mt-10 rounded-xl border border-border bg-card p-8 font-mono text-sm shadow-[var(--shadow-card)]">
          <pre className="overflow-x-auto leading-7 text-muted-foreground">{`  Requester
      │ private conversation
      ▼
  Requester Agent ──▶ approved request contract
                              │
                              ▼
                    deterministic matcher
                              │ offer notification
                              ▼
  Firsthand answer ◀── Provider human ◀── Provider Agent
                           │
                           └── accepts or declines`}</pre>
          <p className="mt-6 border-t border-border pt-5 font-sans text-[15px] leading-relaxed text-foreground/90">
            Agents clarify and coach. The application matches. Humans approve, accept, and answer.
          </p>
        </div>
      </Section>

      {/* Live demo */}
      <div id="try">
        <AgentLiveDemo />
      </div>

      {/* Who's on the network */}
      <Section eyebrow="Who's on the network">
        <h2 className="display max-w-3xl text-4xl md:text-5xl">
          Verified people who actually live the context.
        </h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Not tourists. Not one-time visitors. Locals with expertise, on the ground, available now.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {informantSnapshot.map((i) => (
            <div key={i.name} className="bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium">{i.name}</p>
                <span className="font-mono text-[10px] text-primary">trust {i.trust}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">📍 {i.city}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {i.tags.map((t) => (
                  <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px]">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Verification */}
      <Section id="verification" eyebrow="How we know they're real">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="display text-4xl md:text-5xl">The whole product is trust.</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
              Anyone can build a Q&A site. What makes FirstHandMarket work is the verification
              layer: informants aren't anonymous, and we can prove they're actually where they claim
              to be.
            </p>
          </div>
          <ul className="space-y-px overflow-hidden rounded-xl border border-border bg-border">
            {verification.map(([label, body]) => (
              <li key={label} className="bg-card px-5 py-4">
                <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
                  {label}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* The product isn't search */}
      <Section eyebrow="The product isn't search">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-8">
            <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              Search asks
            </p>
            <p className="display mt-4 text-3xl text-muted-foreground">What words match this?</p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-card p-8">
            <p className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
              FirstHandMarket asks
            </p>
            <p className="display mt-4 text-3xl">Who lives this?</p>
          </div>
        </div>
        <div className="mt-10 max-w-2xl">
          <p className="display text-2xl">
            "Is Khlong Toei market safe for a solo woman traveler at 9pm on a Tuesday?"
          </p>
          <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground">
            Search returns blog posts. Our agent finds someone in Khlong Toei tonight, asks them,
            and reports back. That's the shape of every question the platform is built for.
          </p>
        </div>
      </Section>

      {/* Join as informant */}
      <Section id="join" eyebrow="Join as an informant">
        <h2 className="display max-w-3xl text-4xl md:text-5xl">
          You know your city. Share what is happening now.
        </h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Tell us where you live, what you know first-hand, and what you're happy to answer about.
          During the demo, every request is free. You choose which requests to accept and answer in
          your own voice, on your own time.
        </p>
        <div className="mt-10">
          <RepresentationForm />
        </div>
      </Section>

      {/* Close */}
      <section className="grain rule-top">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center">
          <p className="eyebrow">The big idea</p>
          <h2 className="display mx-auto mt-6 max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)]">
            Every question deserves a firsthand answer.
          </h2>
          <p className="mx-auto mt-7 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
            Two private agents. One approved contract. Real answers from people who are actually
            there.
          </p>
          <p className="mt-8 font-mono text-xs tracking-[0.24em] text-primary uppercase">
            Not search · Not scraping · Human-approved ground truth
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="#try"
              className="inline-block rounded-md bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try the agent
            </a>
            <a
              href="#join"
              className="inline-block rounded-md border border-border px-8 py-3.5 text-sm transition-colors hover:bg-accent"
            >
              Become an informant
            </a>
          </div>
        </div>
      </section>

      <footer className="rule-top">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase">
            Firsthand<span className="text-primary">Market</span>
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Ask the world. Get a firsthand answer.
          </span>
        </div>
      </footer>
    </main>
  );
}

function Section({
  id,
  eyebrow,
  children,
}: {
  id?: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rule-top scroll-mt-8">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <p className="eyebrow mb-6">{eyebrow}</p>
        {children}
      </div>
    </section>
  );
}
