# Deploy FirstHandMarket

Two services, two platforms, ~15 minutes total. All free tiers.

- **Backend (Python + FastAPI)** → Railway (recommended) or Render
- **Frontend (TanStack Start + Vite)** → Vercel

---

## 1. Deploy the Backend to Railway

### Step 1 — Sign up
[railway.com](https://railway.com) → **Login with GitHub**.

### Step 2 — New project
- Click **New Project** → **Deploy from GitHub repo**
- Pick `Radictionary/firsthandmarket`
- Railway detects the monorepo. In the service settings:
  - **Root directory**: `backend`
  - **Start command** (should auto-detect from `railway.json`, but verify): `cd agent && uvicorn server:app --host 0.0.0.0 --port $PORT`

### Step 3 — Add environment variables
Click the deployed service → **Variables** tab → **Raw Editor** → paste:

```
SUPABASE_URL=https://hnmynawolirlvsvbkdod.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
OXEN_API_KEY=replace-with-your-oxen-key
OXEN_BASE_URL=https://hub.oxen.ai/api/ai
OXEN_MODEL=gpt-6-astra
```

(Paste your real values from `backend/.env` — never commit these.)

### Step 4 — Deploy + get URL
Railway redeploys automatically after saving env vars. Click **Settings** → **Networking** → **Generate Domain**. You'll get a URL like:

```
https://firsthandmarket-backend-production.up.railway.app
```

### Step 5 — Verify
```bash
curl https://YOUR-RAILWAY-URL/health
# should return: {"ok":true,"model":"gpt-6-astra","endpoint":"..."}

curl -X POST https://YOUR-RAILWAY-URL/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"How is Manila nightlife on a Tuesday?"}'
```

---

## Alternative: Deploy Backend to Render

`backend/render.yaml` is already set up. On [render.com](https://render.com):

1. **New +** → **Blueprint** → connect this repo
2. Render reads `render.yaml` → creates the web service automatically
3. Add the 3 secret env vars it prompts for (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OXEN_API_KEY`)
4. Wait ~5 min for first build → get URL

⚠️ Render's free tier sleeps after 15 min idle → first request after a nap takes ~30 sec. Fine for a demo, annoying otherwise.

---

## 2. Deploy the Frontend to Vercel

### Step 1 — Sign up
[vercel.com](https://vercel.com) → **Login with GitHub**.

### Step 2 — Import project
- **Add New** → **Project**
- Pick `Radictionary/firsthandmarket`
- **Root Directory**: `frontend`
- Framework: should auto-detect as **Vite** (or leave "Other" — `vercel.json` handles it)
- Build settings should show:
  - Build command: `npm run build`
  - Output directory: `.output/public`

### Step 3 — Environment variables
In the import screen (or later in Settings → Environment Variables), add:

```
VITE_SUPABASE_URL=https://hnmynawolirlvsvbkdod.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=hnmynawolirlvsvbkdod
VITE_AGENT_URL=https://YOUR-RAILWAY-URL

SUPABASE_URL=https://hnmynawolirlvsvbkdod.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

The `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (SSR); safe to add.

### Step 4 — Deploy
Click **Deploy**. ~2 min. You'll get:

```
https://firsthandmarket.vercel.app
```

---

## 3. Wire Them Together

- Frontend's `VITE_AGENT_URL` must point at the Railway backend URL (Step 3 above).
- Backend's CORS is already `*` — every origin can call `/ask`.
- Both hit the **same Supabase project** — no data sync issues.

---

## 4. Sanity Check End-to-End

Open the Vercel URL, scroll to **"Ask something real"**, type a question, click Ask.

If you get an error like "Agent unreachable":
- Open browser DevTools → Network → look at the failing request
- Check `VITE_AGENT_URL` is set correctly on Vercel
- Check Railway service is running (dashboard shows green)

---

## 5. Update the README With Live URLs

Once both are deployed, add to the README:

```md
- 🌐 [Live app](https://firsthandmarket.vercel.app)
- 🤖 [Backend agent API](https://YOUR-RAILWAY-URL/docs)
```

---

## Cost Reality

| Service | Free tier | What breaks it |
|---|---|---|
| Railway | 500 hrs/mo, $5 credit | Multiple always-on services |
| Render | 750 hrs/mo (with sleeps) | Non-sleeping tier costs $7/mo |
| Vercel | 100GB bandwidth/mo | Heavy traffic |
| Supabase | 500MB DB, 50k MAU | Real usage |
| Oxen `gpt-6-astra` | Pay per token (see your dashboard) | Every `/ask` call |

For a hackathon demo running for a weekend: **~$0.**

---

## Kill Switch

If you want to take the demo down:
- Railway: **Settings → Delete Service**
- Vercel: **Settings → Delete Project**
- Both are one click, one confirmation.
