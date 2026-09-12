-- ============================================================
-- FirstHandMarket — Row Level Security (demo-permissive)
-- Run after 02_seed.sql
-- ============================================================

alter table informants enable row level security;
alter table queries    enable row level security;
alter table answers    enable row level security;

drop policy if exists "public read informants" on informants;
create policy "public read informants" on informants for select using (true);

drop policy if exists "public insert queries" on queries;
create policy "public insert queries" on queries for insert with check (true);

drop policy if exists "public read queries" on queries;
create policy "public read queries" on queries for select using (true);

drop policy if exists "public insert answers" on answers;
create policy "public insert answers" on answers for insert with check (true);

drop policy if exists "public read answers" on answers;
create policy "public read answers" on answers for select using (true);
