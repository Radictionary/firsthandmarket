-- ============================================================
-- FirstHandMarket — match_informants RPC
-- Run after 03_rls.sql
-- ============================================================

create or replace function match_informants(
  p_topic_tags text[] default '{}',
  p_city       text   default null,
  p_country    text   default null,
  p_limit      int    default 5
)
returns setof informants
language sql stable as $$
  select *
  from informants
  where available = true
    and verified = true
    and (
      cardinality(p_topic_tags) = 0
      or expertise_tags && p_topic_tags
    )
    and (p_city    is null or location_city    ilike p_city)
    and (p_country is null or location_country ilike p_country)
  order by
    cardinality(array(select unnest(expertise_tags) intersect select unnest(p_topic_tags))) desc,
    trust_score desc
  limit p_limit;
$$;
