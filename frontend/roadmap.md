# Roadmap

## Ambiguous integration (plan approved 2026-09-12)
- [x] Foundation: integrations table, Ambiguous server client, operator-only access
- [x] Agent inboxes: provisioned on intake completion; operator sweep button on the floor
- [x] Intro emails sent from agent inboxes on double opt-in (idempotency-keyed)
- [x] CRM contact sync (best-effort, runs during provisioning)
- [x] Webhook endpoint /api/public/webhooks/ambiguous (signature-ready)
- [ ] BLOCKED: AMBIGUOUS_API_KEY secret — user declined the secret form; all Ambiguous calls no-op until saved (Project Settings → Secrets)
- [ ] Calendar booking (step 3) — needs live key to verify availability/event shapes
- [ ] Coworker-hosted negotiation (step 5) — needs live key
- [ ] Wire webhook events (reply detection, execution results) once events are observable

## Other
- [ ] Grant operator role to user's account — blocked until user signs up at /auth and tells me
