-- ============================================================
-- FirstHandMarket — Seed data (3 filler informants)
-- Run after 01_schema.sql
-- Safe to re-run: only inserts if the table is empty.
-- ============================================================

insert into informants
  (display_name, bio, location_city, location_country, lat, lng,
   expertise_tags, languages, verified, trust_score, available, avatar_url)
select * from (values
  ('Maya Reyes',
   'Third-time hackathon hacker. Currently at the AI track. Loves ramen and edge cases.',
   'Manila', 'Philippines', 14.5995, 120.9842,
   array['hackathons','ai','student-life','manila-nightlife'],
   array['en','tl'],
   true, 0.92::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=maya'),

  ('Rahul Kapoor',
   'Software engineer, 5 hackathons deep. Can tell you what conference food is actually edible.',
   'Bangalore', 'India', 12.9716, 77.5946,
   array['hackathons','backend','startups','bangalore-food'],
   array['en','hi'],
   true, 0.88::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul'),

  ('Lena Weber',
   'Design student who has attended every Berlin hackathon since 2022.',
   'Berlin', 'Germany', 52.5200, 13.4050,
   array['hackathons','design','berlin-culture','ux'],
   array['en','de'],
   true, 0.85::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=lena')
) as v
where not exists (select 1 from informants);
