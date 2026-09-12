# FirstHandMarket

**Ask the world. Get a firsthand answer.**

FirstHandMarket turns a real-world information need into a clear request, finds
one relevant person, and lets that person answer from direct experience.

The demo uses two private role agents and one shared request contract:

1. The **Requester Agent** clarifies the deliverable, place, access, deadline,
   restrictions, freshness, and acceptance criteria.
2. The requester reviews and explicitly approves that contract.
3. The application applies deterministic filters and ranks eligible providers.
4. One provider receives an in-app offer notification.
5. The **Provider Agent** privately explains the offer and can polish facts that
   the provider supplies.
6. The provider personally accepts or declines, then submits the answer.

The agents do not freely negotiate or talk to one another. The approved contract
is their shared protocol, and the consequential decisions remain explicit human
actions.

**Everything is free during the demo. There are no credits, prices, rewards, or
payment flows.**

## Architecture

    Requester
       |
       v
    Requester Agent (OpenAI Agents SDK)
       |
       v
    approved request contract
       |
       v
    deterministic Supabase matcher
       |
       v
    in-memory demo offer ----> Provider inbox
                                  |
                                  v
                              Provider Agent
                                  |
                                  v
                         human accept / decline
                                  |
                                  v
                          firsthand answer

Both agents use Gemini 3.8 Flash through Oxen's OpenAI-compatible endpoint.

## Monorepo

- backend/agent — FastAPI service, Agents SDK runtime, matcher adapter, and offer
  state machine
- backend/supabase — existing tables, seed data, RLS, and match RPC
- frontend — TanStack Start / React landing page and role workspaces

## Quick Start

Prerequisites: Python 3.10+, Node 18+, Supabase credentials, and an Oxen API key.

Backend:

    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    .venv/bin/uvicorn server:app --app-dir agent --host 127.0.0.1 --port 8000

Frontend:

    cd frontend
    npm install
    npm run dev -- --host 127.0.0.1 --port 3000

Local environment files are ignored by Git:

- backend/.env — OXEN_API_KEY, OXEN_BASE_URL, OXEN_MODEL, SUPABASE_URL,
  SUPABASE_ANON_KEY, and optional server-only SUPABASE_SERVICE_ROLE_KEY
- frontend/.env — public Supabase configuration and VITE_AGENT_URL

Never put the Supabase service-role key in the frontend.

## Agent API

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Runtime and model status |
| POST | /agent/requester/turn | Refine a contract or match after approval |
| GET | /providers/{provider_id}/offers | Poll provider notifications |
| GET | /offers/{offer_id} | Read current offer status |
| POST | /offers/{offer_id}/respond | Explicit provider accept or decline |
| POST | /agent/provider/turn | Private provider-agent conversation |
| POST | /offers/{offer_id}/answer | Submit an answer after acceptance |
| GET | /queries/{query_id}/answers | Poll requester answers |
| GET | /integrations/mcp | Honest MCP connector capability catalog |

## Current Demo Boundaries

- Offer state is in memory and resets when FastAPI restarts.
- The provider picker is a demo replacement for authentication.
- Gmail, Google Calendar, and Google Drive connection controls are visible, but
  no MCP OAuth transport is configured yet.
- Existing Supabase RLS is demo-permissive and must be tightened before launch.
- No billing or compensation system exists in this demo.

## Tests

    PYTHONPATH=backend/agent backend/.venv/bin/python -m unittest discover \
      -s backend/agent -p 'test_*.py' -v

    cd frontend
    npm run build
    npx eslint src/lib/agent.ts src/components/RequesterAgent.tsx \
      src/components/AgentLiveDemo.tsx src/routes/requester.tsx \
      src/routes/provider.tsx src/routes/index.tsx

## Project Team

- Joe Cox — frontend
- Taras Pomazan — frontend
- Radin Khosraviani — agent architecture and implementation
- Inigo Dela Vega — backend, Supabase, initial agent logic, and integration

Frontend scaffold via Lovable. Model inference via Oxen.
