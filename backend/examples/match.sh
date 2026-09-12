#!/usr/bin/env bash
# FirstHandMarket — raw HTTP example
# Usage: source .env && ./examples/match.sh
set -euo pipefail
curl -sS -X POST "${SUPABASE_URL}/rest/v1/rpc/match_informants" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_topic_tags": ["hackathons","ai"], "p_limit": 3}'
