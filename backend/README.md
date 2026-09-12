# FirstHandMarket — Backend

Supabase data layer + minimal Python matchmaker agent that plugs into it.

The **frontend** lives in a separate folder (`~/Downloads/FirsthandMarket`) and connects to the same Supabase project via the contract in [`docs/CONTRACT.md`](docs/CONTRACT.md).

---

## Quick Start

### 1. Make sure `.env` is filled in
```bash
open -e .env
```
Confirm all `PASTE_YOUR_..._KEY_HERE` placeholders are replaced with real keys.

### 2. Confirm Supabase has the schema
If the tables already exist in your Supabase project (from the prior session), skip this. Otherwise, run each file in the Supabase SQL Editor:
1. `supabase/01_schema.sql`
2. `supabase/02_seed.sql`
3. `supabase/03_rls.sql`
4. `supabase/04_match_function.sql`

### 3. Smoke test the DB
```bash
chmod +x examples/*.sh
source .env && ./examples/test_pipeline.sh
```
Should print Maya, Rahul, Lena.

### 4. Set up the agent
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r agent/requirements.txt
```

### 5. Run the agent
```bash
python agent/agent.py "What is a global hackathon like on day 2?"
```

### 6. Run the test suite
```bash
python agent/test_agent.py
```

---

## Structure

```
firstHandMarketBackend/
├── README.md
├── HANDOFF.md              ← for teammates
├── .env / .env.example
├── supabase/               ← SQL migrations
├── docs/                   ← contracts + cheatsheets
├── examples/               ← curl scripts
└── agent/                  ← Python matchmaker agent
```
