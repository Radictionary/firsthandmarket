# FirstHandMarket — Data Contract

## Base
```
{SUPABASE_URL}/rest/v1
Headers on every request:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
```

## 1. Match Informants
`POST /rpc/match_informants`
```json
{"p_topic_tags":["hackathons","ai"], "p_city":null, "p_country":null, "p_limit":3}
```
Returns ranked `informants[]`.

## 2. Post a Query
`POST /queries` with header `Prefer: return=representation`
```json
{"seeker_name":"Alex","question":"...","topic_tags":["hackathons"],"freshness":"now"}
```

## 3. Post an Answer
`POST /answers` with `Prefer: return=representation`
```json
{"query_id":"uuid","informant_id":"uuid","content":"..."}
```

## Tables

### informants
`id · display_name · bio · location_city · location_country · lat · lng · expertise_tags[] · languages[] · verified · trust_score · available · avatar_url · created_at`

### queries
`id · seeker_name · question · location_city · location_country · topic_tags[] · freshness ('now'|'this_week'|'evergreen') · status ('open'|'matched'|'answered'|'closed') · created_at`

### answers
`id · query_id · informant_id · content · media_url · rating · created_at`
