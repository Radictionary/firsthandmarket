# FirstHandMarket Current Context

This file is the handoff for teammates working in parallel.

## Current Architecture

The active branch implements two private role agents using the Python OpenAI
Agents SDK:

- Requester Agent: clarifies a request, saves a structured contract, and blocks
  matching until the requester approves.
- Provider Agent: privately explains an assigned offer and can polish only facts
  supplied by the provider. It cannot accept or decline.

The agents do not hand off or directly message one another. The shared contract
and offer record are the boundary between them. Supabase matching is
deterministic; human approval and provider decisions are explicit endpoints.

Model: Gemini 3.8 Flash through Oxen's OpenAI-compatible API.

## Demo Flow

1. Open /requester and chat with the Requester Agent.
2. Review the populated contract and click Approve & find provider.
3. The matcher selects one eligible Supabase informant and creates an offer.
4. Open /provider and choose that demo identity.
5. The provider sees the offer notification, can privately chat with the
   Provider Agent, and personally accepts or declines.
6. After acceptance, the provider submits a firsthand answer.
7. The requester workspace polls and displays the answer.

Everything is free in this demo. There is no credit, pricing, reward,
compensation, or payment layer.

## Important Files

- backend/agent/agents_runtime.py — role agents, tools, prompts, and tag
  normalization
- backend/agent/offers.py — in-memory offer state machine and idempotency
- backend/agent/server.py — FastAPI contract
- backend/agent/db.py — Supabase REST adapter
- backend/agent/test_architecture.py — deterministic boundary tests
- frontend/src/components/RequesterAgent.tsx — requester conversation and
  approval UI
- frontend/src/routes/provider.tsx — notification, provider agent, decision,
  answer, and future MCP UI
- frontend/src/lib/agent.ts — shared frontend API types

## Known Boundaries

- Offer state resets when the backend process restarts.
- Provider identity is a demo picker, not production auth.
- MCP cards are honest placeholders; OAuth transports are not implemented.
- Supabase stores queries and answers, while offers remain in memory.
- RLS is demo-permissive and is not production-ready.
- Do not expose the service-role key to the browser.

## Local Verification

- Changed frontend files pass ESLint.
- The production frontend build passes.
- Python architecture tests cover explicit approval/decision boundaries,
  idempotency, truthful MCP status, and singular/plural tag normalization.
- Live Oxen inference has been verified with the configured Gemini model.

No Cloudflare deployment is part of this pass.
