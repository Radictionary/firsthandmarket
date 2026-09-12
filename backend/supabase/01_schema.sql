-- ============================================================
-- FirstHandMarket — Schema
-- Run this first in the Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists informants (
  id               uuid primary key default gen_random_uuid(),
  display_name     text not null,
  bio              text,
  location_city    text not null,
  location_country text not null,
  lat              double precision,
  lng              double precision,
  expertise_tags   text[] not null default '{}',
  languages        text[] not null default '{en}',
  verified         boolean not null default false,
  trust_score      numeric(3,2) not null default 0.50,
  available        boolean not null default true,
  avatar_url       text,
  created_at       timestamptz not null default now()
);

create index if not exists informants_expertise_idx on informants using gin (expertise_tags);
create index if not exists informants_city_idx on informants (location_city);
create index if not exists informants_available_idx on informants (available) where available = true;

create table if not exists queries (
  id               uuid primary key default gen_random_uuid(),
  seeker_name      text,
  question         text not null,
  location_city    text,
  location_country text,
  topic_tags       text[] not null default '{}',
  freshness        text check (freshness in ('now','this_week','evergreen')) default 'now',
  status           text check (status in ('open','matched','answered','closed')) default 'open',
  created_at       timestamptz not null default now()
);

create index if not exists queries_status_idx on queries (status);

create table if not exists answers (
  id            uuid primary key default gen_random_uuid(),
  query_id      uuid not null references queries(id) on delete cascade,
  informant_id  uuid not null references informants(id) on delete cascade,
  content       text not null,
  media_url     text,
  rating        int check (rating between 1 and 5),
  created_at    timestamptz not null default now()
);

create index if not exists answers_query_idx on answers (query_id);
create index if not exists answers_informant_idx on answers (informant_id);
