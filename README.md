# FirstHandMarket

[![tests](https://github.com/Radictionary/firsthandmarket/actions/workflows/tests.yml/badge.svg)](https://github.com/Radictionary/firsthandmarket/actions/workflows/tests.yml)

**Ask the world. Get a firsthand answer.**

One matchmaker agent that connects information seekers with verified locals who actually live the place, scene, or moment being asked about.

Not two AI representatives negotiating on each other's behalf — **one central agent, real humans, ground-truth answers.**

---

## Monorepo Layout

```
firsthandmarket/
├── backend/          Python matchmaker agent + Supabase contract
│   ├── agent/          FastAPI service + agent loop
│   ├── supabase/       SQL migrations (schema, seed, RLS, RPC)
│   ├── docs/           Data contract, curl cheatsheet, agent tool schemas
│   └── examples/       Match + smoke-test scripts
└── frontend/         TanStack Start (React + Vite) landing site + dashboards
    ├── src/routes/     `/`, `/requester`, `/provider`, `/auth`
    ├── src/components/ AgentLiveDemo, RepresentationForm, AgentExchange, UI
    └── supabase/       Additional migrations (frontend-side tables)
```

---

## What It Does

1. **Seeker** asks a natural-language question ("How's Manila nightlife on a Tuesday?")
2. **Central agent** (Oxen `gpt-6-astra`, swappable for any OpenAI-compatible model) parses intent → tags + city + freshness
3. **Supabase RPC** `match_informants` returns the ranked verified people whose expertise + location fit
4. Each matched informant is contacted (or, in demo, an in-voice answer is generated) and posted to the `answers` table
5. Agent **synthesizes** all firsthand answers into a single reply that cites each informant

The full loop runs end-to-end in ~4 seconds against real Supabase data.

---

## Architecture

```
                    ┌───────────────────────┐
   Seeker  ──ask──▶ │  Central matchmaker   │  ──match──▶  Verified informants
                    │  agent (backend)      │
                    │  gpt-6-astra @ Oxen   │  ◀─answer──  (real humans on the ground)
                    └──────────┬────────────┘
                               │
                               ▼
                    ┌───────────────────────┐
                    │  Supabase             │  ← single source of truth
                    │  informants · queries │
                    │  · answers · RPC      │
                    └───────────────────────┘
                               ▲
                               │
                    ┌──────────┴────────────┐
                    │  Frontend             │
                    │  TanStack + Lovable   │  ← calls backend `/ask`
                    │  Landing + dashboards │     reads Supabase for history
                    └───────────────────────┘
```

---

## Quick Start

### Prerequisites
- A Supabase project (URL + publishable key + secret key)
- An Oxen API key (or any OpenAI-compatible LLM key)
- Python 3.10+ and Node 18+

### 1. Backend

```bash
cd backend
cp .env.example .env
# fill in .env with your Supabase + Oxen (or OpenAI) keys

python3 -m venv .venv
source .venv/bin/activate
pip install -r agent/requirements.txt
```

Run the SQL files in your Supabase SQL Editor, in order:
1. `supabase/01_schema.sql`
2. `supabase/02_seed.sql`
3. `supabase/02b_more_seed.sql`   *(15 informants across 12+ cities)*
4. `supabase/03_rls.sql`
5. `supabase/04_match_function.sql`
6. `supabase/05_frontend_min.sql`  *(one table the frontend homepage needs)*

Smoke test the DB:
```bash
source .env && ./examples/test_pipeline.sh
```

Run the agent test suite:
```bash
python agent/test_agent.py
```

Start the FastAPI service:
```bash
cd agent
../.venv/bin/uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Docs at http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# fill in the same Supabase project + point VITE_AGENT_URL at your backend

npm install
npm run dev
```

Open http://localhost:8080.

- **`/`** — landing page + live agent demo
- **`/requester`** — dashboard for people asking questions
- **`/provider`** — dashboard for informants (pick a persona, answer matched questions)

---

## The Stack

| Layer | Tech |
|---|---|
| Frontend | TanStack Start + Vite + React + Tailwind + shadcn/ui (Lovable-generated) |
| Backend agent | Python + FastAPI + `requests` (no SDK dependency) |
| LLM | Oxen `gpt-6-astra` (OpenAI-compatible; also works with OpenAI, Groq, etc.) |
| Database | Supabase (Postgres) + PostgREST + RLS + one RPC |
| Auth | Supabase Auth (frontend), anon key for demo |

---

## Data Model

Three core tables (see `backend/docs/CONTRACT.md`):

- **`informants`** — verified people with `location_city`, `expertise_tags[]`, `trust_score`, `available`
- **`queries`** — seeker questions with `topic_tags[]`, `location_city`, `freshness`, `status`
- **`answers`** — informant responses linked to a query + informant

One RPC: **`match_informants(topic_tags, city, country, limit)`** → ranked informants.

---

## Endpoints (Backend)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Ping + model info |
| POST | `/ask` | Full agent flow: intent → log → match → simulate answers → synthesize |
| POST | `/rpc/match` | Fast Supabase lookup, no LLM |
| POST | `/queries` | Direct query insert (no agent) |
| GET | `/queries/{id}/answers` | Read answers for a query |

See `backend/docs/CURL_CHEATSHEET.md` for copy-paste requests.

---

## Configuration

All secrets go in `.env` files at each subproject's root. Never commit these — `.gitignore` excludes them.

- `backend/.env` — Supabase URL + keys, Oxen (or OpenAI) key + model
- `frontend/.env` — same Supabase URL/publishable key, plus `VITE_AGENT_URL` pointing at the backend

Both `.env.example` files are templates.

---

## Security Notes

- Row Level Security is enabled but **demo-permissive** (`insert with check (true)`). Tighten before production.
- The publishable key is safe in the browser; the secret key is server-only.
- Rotate all keys before making the project public if any were pasted anywhere.

---

## What Makes This Different

- **Not search.** Search asks *what words match this*. FirstHandMarket asks *who lives this*.
- **Not two agents.** One central matchmaker. All the intelligence at the routing layer; the humans do the answering.
- **Not fake.** Trust score, verification flags, and location claims are first-class fields — the whole product depends on this being real.

---

## Contributing

- Backend agent: edit `backend/agent/agent.py`. Test with `python backend/agent/test_agent.py`.
- Frontend: edit `frontend/src/`. Vite hot-reloads on save.
- Schema: add a new SQL file under `backend/supabase/` and run it in Supabase SQL Editor.

---

## License

TBD.

---

## Credits

Built as a hackathon project.

- **Joe Cox** — frontend
- **Radin Khosraviani** — robust agent logic
- **Inigo Dela Vega** — backend + integration

Frontend scaffold via Lovable (TanStack Start template).
LLM inference: Oxen.ai.
