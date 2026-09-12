# Deployment Handoff Context

**Target:** finish deploying FirstHandMarket to a public URL so judges can try it.
**Audience:** whoever picks up deployment (probably one of Joe / Taras / Radin).
**Author:** Inigo (built the backend + this monorepo). Reach me if anything is unclear.

Read [`README.md`](README.md) first for the what/why. This file is the how-to-ship.

---

## Where things stand right now

| Piece | Status | Where it lives |
|---|---|---|
| Supabase schema + seed data | ✅ Deployed to project `hnmynawolirlvsvbkdod` | Supabase dashboard |
| Supabase RLS + `match_informants` RPC | ✅ Live | Same Supabase project |
| 15 verified informants across 12 cities | ✅ Seeded | `informants` table |
| Python matchmaker agent (Oxen `gpt-6-astra`) | ✅ Working end-to-end | `backend/agent/` |
| FastAPI HTTP wrapper | ✅ Working locally | `backend/agent/server.py` |
| Test suite (5/5 passing) | ✅ Green | `backend/agent/test_agent.py` — see [`TEST_RESULTS.md`](TEST_RESULTS.md) |
| Frontend landing page (rewritten) | ✅ Working locally | `frontend/src/routes/index.tsx` |
| Live agent demo on homepage | ✅ Working locally | `frontend/src/components/AgentLiveDemo.tsx` |
| Requester + Provider dashboards | ✅ Working locally | `frontend/src/routes/requester.tsx`, `provider.tsx` |
| CI workflow | ✅ Present, needs GitHub secrets | `.github/workflows/tests.yml` |
| Deploy configs | ✅ Written | `backend/{Procfile,railway.json,render.yaml}`, `frontend/vercel.json` |
| **Actual public deployment** | ❌ **NOT DONE — this is what you're picking up** | — |
| Domain / branding polish | ❌ Not done | — |

---

## What you need to do

Two deploys, ~15 minutes. Full walkthrough in [`DEPLOY.md`](DEPLOY.md).

### Backend → Railway

1. https://railway.com → **Login with GitHub**
2. **New Project → Deploy from GitHub repo** → `Radictionary/firsthandmarket`
3. Set **Root directory** to `backend` in the service Settings
4. Under **Variables → Raw Editor**, paste (ask Inigo for the real values via secure channel — 1Password / Signal / DM):
   ```
   SUPABASE_URL=https://hnmynawolirlvsvbkdod.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_<ask-inigo>
   OXEN_API_KEY=<ask-inigo>
   OXEN_BASE_URL=https://hub.oxen.ai/api/ai
   OXEN_MODEL=gpt-6-astra
   ```
5. **Settings → Networking → Generate Domain**. Copy that URL — call it `RAILWAY_URL` below.
6. Verify:
   ```bash
   curl $RAILWAY_URL/health
   # {"ok":true,"model":"gpt-6-astra","endpoint":"..."}
   ```

### Frontend → Vercel

1. https://vercel.com → **Login with GitHub**
2. **Add New → Project** → same repo
3. **Root Directory**: `frontend`
4. Add env vars (same secure channel for the real values):
   ```
   VITE_SUPABASE_URL=https://hnmynawolirlvsvbkdod.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<ask-inigo>
   VITE_SUPABASE_PROJECT_ID=hnmynawolirlvsvbkdod
   VITE_AGENT_URL=<the RAILWAY_URL from above>

   SUPABASE_URL=<same as above>
   SUPABASE_PUBLISHABLE_KEY=<same as above>
   SUPABASE_SERVICE_ROLE_KEY=<ask-inigo — this is a secret>
   ```
5. Click **Deploy**. Get a URL like `https://firsthandmarket.vercel.app`.

### Wire it up

- Frontend calls `${VITE_AGENT_URL}/ask` — that's the only cross-service call.
- Backend CORS is `*` for demo. If you want to lock it down, edit `backend/agent/server.py` and set `allow_origins=["https://firsthandmarket.vercel.app"]`.

### After deploy — update the README

Add these two lines near the top of [`README.md`](README.md):
```md
- 🌐 [Live app](https://firsthandmarket.vercel.app)
- 🤖 [Backend API](https://YOUR-RAILWAY-URL/docs)
```

Also add CI secrets so the badge turns green — Settings → Secrets → Actions:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OXEN_API_KEY`, `OXEN_BASE_URL`, `OXEN_MODEL`.

---

## How the pieces connect

```
       user's browser
             │
             ▼
   [Vercel: frontend]
    · landing page
    · /requester
    · /provider
             │
             │ POST /ask, /rpc/match, /queries, /answers
             ▼
   [Railway: FastAPI backend]  ── LLM ──▶  Oxen (gpt-6-astra)
    · agent loop
    · calls Supabase RPC
             │
             ▼
   [Supabase: hnmynawolirlvsvbkdod]
    · informants (15 rows)
    · queries + answers
    · match_informants RPC
    · representation_requests (frontend form)
```

Both frontend and backend hit the **same** Supabase project. Don't accidentally point the frontend at a different one — that's a real hazard that already bit us once.

---

## Key files to know

**Backend**
- `backend/agent/agent.py` — the ReAct loop, prompts, tag expansion
- `backend/agent/server.py` — FastAPI endpoints (`/ask`, `/rpc/match`, `/queries`, `/health`)
- `backend/agent/db.py` — Supabase client (no SDK, just `requests`)
- `backend/agent/test_agent.py` — 5-scenario test suite
- `backend/supabase/*.sql` — schema + seed (already deployed to Supabase; here for reference)
- `backend/docs/CONTRACT.md` — public API contract for anyone integrating

**Frontend**
- `frontend/src/routes/index.tsx` — landing page (rewritten to reflect actual product)
- `frontend/src/routes/requester.tsx` — seeker dashboard
- `frontend/src/routes/provider.tsx` — informant dashboard
- `frontend/src/components/AgentLiveDemo.tsx` — homepage widget that hits `/ask`
- `frontend/src/integrations/supabase/client.ts` — Supabase browser client

---

## Gotchas we already learned

- **Astra + tools + `reasoning_effort`**: `gpt-6-astra` on Oxen doesn't support native tool-calling in `/chat/completions`, so the agent uses a two-shot text pattern (intent-JSON extract → match → synthesize). Do NOT try to switch to native function tools without also switching model.
- **Tag matching**: seed tags are city-prefixed (`manila-nightlife`, `bangalore-food`). The agent auto-expands `[nightlife]` + city `Manila` → `[nightlife, manila-nightlife]`. See `expand_tags()` in `agent.py`. If you add new informants, keep the same tag shape.
- **Frontend crashes on `_authenticated` routes**: those routes need Lovable-generated tables we didn't seed (introductions, negotiations, etc). We only seeded the minimum for the homepage (`representation_requests`). If you want auth flows to work, run the full frontend migrations from the Lovable project.
- **Bun vs npm**: the Lovable scaffold prefers Bun but the lockfile also works with npm. On machines without Bun, use `npm install`.
- **HOME dir git noise**: `git status` in `~/Desktop/` or `~/Downloads/` shows tons of "deleted" files — an accidental `git init` in `$HOME` a while back. Ignore it. Only `git status` inside the monorepo directory matters.

---

## Ownership map

| Area | Owner |
|---|---|
| Frontend (landing, dashboards, styling) | @Joe, @Taras |
| Robust agent logic + prompt engineering | @Radin |
| Backend / Supabase / integration / deploy prep | @Inigo |
| Deployment (Railway + Vercel) | **you, picking this up now** |

---

## Where secrets live

**NEVER commit any of these:**

- Supabase URL: safe to share (it's a public URL)
- Supabase publishable key (`sb_publishable_...`): safe to share (meant to be public)
- Supabase secret key (`sb_secret_...`): **never share publicly**
- Oxen API key: **never share publicly**

Real values for all four are in Inigo's local `.env`. Share via 1Password vault, Signal, or an encrypted note. Not Slack, not GitHub, not screenshots.

---

## If you hit trouble

1. Read [`DEPLOY.md`](DEPLOY.md) — the platform-specific gotchas are there
2. Check [`TEST_RESULTS.md`](TEST_RESULTS.md) — shows the whole flow working locally
3. Check the Railway/Vercel logs — 90% of deploy failures show up there
4. Ping Inigo

---

## The 60-second pitch that maps to the codebase

- **Seeker** hits `POST /ask` from the frontend
- Central agent parses intent (`INTENT_PROMPT` in `agent.py`)
- Logs to Supabase `queries` table
- Calls `match_informants` RPC → gets Maya, Rahul, Lena, Kenji, etc.
- For the demo, generates in-voice answers using `ANSWER_PROMPT`
- Synthesizes them with `SYNTH_PROMPT`
- Returns everything to the frontend as JSON — intent chips, informant cards, agent synthesis

**One agent. Real humans. Ground truth.** That's the whole product.
