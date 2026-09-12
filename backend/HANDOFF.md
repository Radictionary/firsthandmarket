# FirstHandMarket Backend — Handoff

## Get Connected (60 sec)

1. Get `.env` values from the owner (secret channel — never Slack).
2. Drop into `.env` at repo root.
3. Test:
   ```bash
   source .env && ./examples/test_pipeline.sh
   ```
   You should see Maya, Rahul, Lena.

## Which Key
- **Frontend / browser** → `SUPABASE_ANON_KEY` (publishable)
- **Server / agent** → `SUPABASE_SERVICE_ROLE_KEY` (secret) — bypasses RLS

## Data Contract
See [`docs/CONTRACT.md`](docs/CONTRACT.md). Three tables (informants, queries, answers) + one RPC (`match_informants`).

## Agent
Reference implementation in [`agent/agent.py`](agent/agent.py).
Uses Oxen `gpt-6-astra` for reasoning (falls back to OpenAI).
- Setup:  `python3 -m venv .venv && source .venv/bin/activate && pip install -r agent/requirements.txt`
- Run:    `python agent/agent.py "your question"`
- Test:   `python agent/test_agent.py`

## Ownership
| Component | Owner |
|---|---|
| Backend / agent | @______ |
| Frontend (Lovable) | @______ |
| Demo video | @______ |
