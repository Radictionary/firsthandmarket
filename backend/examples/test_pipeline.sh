#!/usr/bin/env bash
# FirstHandMarket — end-to-end database smoke test
# Usage: source .env && ./examples/test_pipeline.sh
# Requires: curl, jq

set -euo pipefail

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "ERROR: set SUPABASE_URL and SUPABASE_ANON_KEY (source your .env)"
  exit 1
fi

H_AUTH=(-H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")
H_JSON=(-H "Content-Type: application/json" -H "Prefer: return=representation")

echo "== 1. Read informants =="
curl -sS "${SUPABASE_URL}/rest/v1/informants?select=id,display_name,location_city,expertise_tags,trust_score" \
  "${H_AUTH[@]}" | jq

echo
echo "== 2. Match [hackathons, ai] =="
curl -sS -X POST "${SUPABASE_URL}/rest/v1/rpc/match_informants" \
  "${H_AUTH[@]}" "${H_JSON[@]}" \
  -d '{"p_topic_tags": ["hackathons","ai"], "p_limit": 3}' | jq

echo
echo "== 3. Post smoke-test query =="
QUERY_JSON=$(curl -sS -X POST "${SUPABASE_URL}/rest/v1/queries" \
  "${H_AUTH[@]}" "${H_JSON[@]}" \
  -d '{"seeker_name":"Smoke Test","question":"What is a global hackathon like on day 2?","topic_tags":["hackathons"],"freshness":"now"}')
echo "$QUERY_JSON" | jq
QUERY_ID=$(echo "$QUERY_JSON" | jq -r '.[0].id')

echo
echo "== 4. Fetch Maya's id =="
MAYA_ID=$(curl -sS "${SUPABASE_URL}/rest/v1/informants?select=id&display_name=eq.Maya%20Reyes" \
  "${H_AUTH[@]}" | jq -r '.[0].id')
echo "maya_id=$MAYA_ID"

echo
echo "== 5. Post Maya's answer =="
curl -sS -X POST "${SUPABASE_URL}/rest/v1/answers" \
  "${H_AUTH[@]}" "${H_JSON[@]}" \
  -d "{\"query_id\":\"$QUERY_ID\",\"informant_id\":\"$MAYA_ID\",\"content\":\"Day 2 is chaos, the best kind.\"}" | jq

echo
echo "== 6. Read joined conversation =="
curl -sS "${SUPABASE_URL}/rest/v1/answers?select=content,informants(display_name,location_city),queries(question,seeker_name)&query_id=eq.$QUERY_ID" \
  "${H_AUTH[@]}" | jq

echo
echo "✅ All checks passed."
