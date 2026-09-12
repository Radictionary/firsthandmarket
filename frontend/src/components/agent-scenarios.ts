export type Line = {
  side: "you" | "them";
  label: string;
  text: string;
  kind?: "private" | "term";
};

export type Scenario = {
  id: string;
  goal: string;
  brief: string;
  lines: Line[];
  terms: { label: string; value: string }[];
  intro: {
    headline: string;
    why: string;
    whyThem: string;
    asking: string;
    notAsking: string[];
    recommendation: string;
  };
};

export const scenarios: Scenario[] = [
  {
    id: "devcommunity",
    goal: "I want to talk to someone who built a developer community from scratch.",
    brief:
      "Product leader considering launching a developer community. Wants lessons learned, not consulting.",
    lines: [
      {
        side: "you",
        label: "Your agent",
        text: "I represent an experienced product leader considering the launch of a developer community. They're looking for a candid 20-minute conversation with someone who has personally scaled one. Lessons learned — not consulting, not a sales relationship.",
      },
      {
        side: "them",
        label: "Agent B · private reasoning",
        kind: "private",
        text: "Client scaled a 40k-member ecosystem. Accepts ~3 peer conversations a month. Dislikes generic networking. Currently curious about developer tooling. Never disclose the tooling interest.",
      },
      {
        side: "them",
        label: "Agent B",
        text: "This may be a strong fit. My client is open to founder and builder conversations, particularly around developer ecosystems. They'd prefer the discussion focus on community mechanics rather than monetization.",
      },
      {
        side: "you",
        label: "Your agent",
        text: "That works. My client's interest is mechanics: seeding the first hundred members, moderation, and when to hire. 20 minutes, video, next week.",
      },
      {
        side: "them",
        label: "Agent B",
        text: "Agreed. One ask in return — my client would value a candid read on enterprise adoption barriers, which your client has lived through.",
      },
      {
        side: "you",
        label: "Your agent",
        text: "Reciprocity accepted. Packaging the introduction now. Neither human has been interrupted.",
        kind: "term",
      },
    ],
    terms: [
      { label: "Purpose", value: "Peer advice on community mechanics" },
      { label: "Intent", value: "Mentoring · not sales, not recruiting" },
      { label: "Boundaries", value: "Monetization out of scope" },
      { label: "Time", value: "20 minutes, video" },
      { label: "Reciprocity", value: "Enterprise adoption read-out" },
    ],
    intro: {
      headline: "Your agent found someone you should meet.",
      why: "They personally grew a developer community from zero to 40,000 members — the exact problem you're facing.",
      whyThem:
        "You've shipped into large enterprises, an area they're currently exploring.",
      asking: "20-minute conversation next week.",
      notAsking: ["No sales pitch.", "No recruiting.", "No investment ask."],
      recommendation: "Accept",
    },
  },
  {
    id: "acquire",
    goal: "I'd quietly sell my company for the right offer.",
    brief:
      "Agent-visible only. Never surfaced on a profile, never searchable, never disclosed without instruction.",
    lines: [
      {
        side: "them",
        label: "Agent C",
        text: "I represent a buyer interested in acquiring a profitable vertical SaaS business: $2–6M ARR, bootstrapped, low churn, owner willing to stay 12 months.",
      },
      {
        side: "you",
        label: "Your agent · private reasoning",
        kind: "private",
        text: "My client told me, in confidence, they'd sell for the right offer. Criteria match. I may explore this without confirming that my client is for sale.",
      },
      {
        side: "you",
        label: "Your agent",
        text: "I may represent a relevant party. Before I disclose anything: is your buyer credible, funded, and prepared to sign mutual confidentiality before names are exchanged?",
      },
      {
        side: "them",
        label: "Agent C",
        text: "Yes. Two prior acquisitions in this category, committed capital, and they'll sign first. They'd share their own thesis before asking for a name.",
      },
      {
        side: "you",
        label: "Your agent",
        text: "Then I'll take an anonymized thesis to my client and let them decide whether to surface. No identity, no intent, no signal leaves me until they say so.",
        kind: "term",
      },
    ],
    terms: [
      { label: "Disclosure", value: "Anonymized until client approves" },
      { label: "Verification", value: "Buyer credibility checked first" },
      { label: "Confidentiality", value: "Mutual, signed pre-names" },
      { label: "Signal risk", value: "Zero public footprint" },
    ],
    intro: {
      headline: "Your agent surfaced something quietly.",
      why: "A verified buyer's representative described a thesis that matches a private intention you shared with your agent.",
      whyThem: "Nothing about you was disclosed. They don't know you exist.",
      asking: "Permission to exchange anonymized details.",
      notAsking: ["No name shared.", "No public signal.", "No commitment."],
      recommendation: "Ask my agent",
    },
  },
  {
    id: "advisory",
    goal: "I'd consider an advisory role — but only past Series A.",
    brief:
      "A standing instruction. Your agent enforces it without you ever declining anything yourself.",
    lines: [
      {
        side: "them",
        label: "Agent D",
        text: "I represent a seed-stage founder looking for a technical advisor on platform architecture. Equity compensation, two hours a month.",
      },
      {
        side: "you",
        label: "Your agent · private reasoning",
        kind: "private",
        text: "Standing instruction: advisory only past Series A. Declining without involving my client. Recording the pattern — third seed-stage advisory approach this month.",
      },
      {
        side: "you",
        label: "Your agent",
        text: "Not a fit at this stage. My client takes advisory roles only post-Series A. I'd welcome a re-approach after the round closes, and I'll flag it as a warm prior contact.",
      },
      {
        side: "them",
        label: "Agent D",
        text: "Understood. Separately — my client is looking for a candid conversation on enterprise procurement. No advisory ask, 15 minutes.",
      },
      {
        side: "you",
        label: "Your agent",
        text: "That clears my client's filters. My client generally advises at this stage for equity rather than cash, but this isn't that conversation — it's peer time. I'll offer 15 minutes.",
        kind: "term",
      },
    ],
    terms: [
      { label: "Filter applied", value: "No pre-Series A advisory" },
      { label: "Human interrupted", value: "No" },
      { label: "Counter-offer", value: "15 minutes, peer conversation" },
      { label: "Re-approach", value: "Permitted post-round" },
    ],
    intro: {
      headline: "Your agent declined something for you.",
      why: "It enforced a boundary you set once, three times this month, without asking you.",
      whyThem: "It kept the relationship warm and found the version worth your time.",
      asking: "15 minutes on enterprise procurement.",
      notAsking: ["No advisory commitment.", "No equity discussion.", "No follow-up obligation."],
      recommendation: "Accept",
    },
  },
];
