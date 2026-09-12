-- ============================================================
-- FirstHandMarket — Extended seed (12 more informants across the world)
-- Run after 02_seed.sql. Safe to re-run: only inserts if the row is absent.
-- ============================================================

insert into informants
  (display_name, bio, location_city, location_country, lat, lng,
   expertise_tags, languages, verified, trust_score, available, avatar_url)
select v.* from (values
  ('Kenji Tanaka',
   'Software engineer in Shibuya. Six years in Tokyo, knows every ramen counter and every last-train home.',
   'Tokyo', 'Japan', 35.6595, 139.7004,
   array['tech','tokyo-food','tokyo-nightlife','ramen','startups'],
   array['en','ja'],
   true, 0.90::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=kenji'),

  ('Amara Okafor',
   'Product designer in Yaba, Lagos. Actively in the startup scene. Knows the safe rides, the good jollof, and the actual hackathon calendar.',
   'Lagos', 'Nigeria', 6.5244, 3.3792,
   array['startups','design','lagos-food','lagos-nightlife','safety','tech'],
   array['en'],
   true, 0.87::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=amara'),

  ('Sofia Alvarez',
   'Grew up in Roma Sur, Mexico City. Freelance photographer. Can tell you where to eat past midnight and which taxis to skip.',
   'Mexico City', 'Mexico', 19.4326, -99.1332,
   array['cdmx-food','cdmx-nightlife','safety','photography','culture'],
   array['en','es'],
   true, 0.89::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=sofia'),

  ('Preecha Suthep',
   'Bangkok-born, Chatuchak resident. Motorcycle taxi is my daily commute. I know every soi and every 24-hour noodle stand.',
   'Bangkok', 'Thailand', 13.7563, 100.5018,
   array['bangkok-food','bangkok-nightlife','safety','transit','markets'],
   array['en','th'],
   true, 0.91::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=preecha'),

  ('Ethan Cole',
   'NYC engineer, Brooklyn-based, works in FiDi. Six subway lines a day, three coffee shops, one bagel opinion.',
   'New York', 'United States', 40.7128, -74.0060,
   array['nyc-food','nyc-nightlife','tech','startups','transit'],
   array['en'],
   true, 0.86::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=ethan'),

  ('Priya Menon',
   'Bangalore Koramangala local. Product manager at a fintech, weekend hiker. I can tell you what monsoon actually feels like.',
   'Bangalore', 'India', 12.9352, 77.6245,
   array['tech','startups','bangalore-food','weather','hiking'],
   array['en','hi','ta'],
   true, 0.84::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=priya'),

  ('Oliver Whitfield',
   'London Shoreditch. Ex-agency creative, now indie. Ten years of pub Sunday roasts and Overground delays under my belt.',
   'London', 'United Kingdom', 51.5074, -0.1278,
   array['london-food','london-nightlife','design','tech','transit'],
   array['en'],
   true, 0.85::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=oliver'),

  ('Camille Laurent',
   'Parisienne, 11e arrondissement. Journaliste culturelle. I know which cafés welcome laptops and which absolutely do not.',
   'Paris', 'France', 48.8566, 2.3522,
   array['paris-food','paris-nightlife','culture','art','journalism'],
   array['en','fr'],
   true, 0.88::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=camille'),

  ('Zara Ahmed',
   'Cairo, Zamalek. Doctor at a public clinic. If you have a health question about Egypt, I have context.',
   'Cairo', 'Egypt', 30.0444, 31.2357,
   array['healthcare','safety','cairo-food','culture','women-solo-travel'],
   array['en','ar'],
   true, 0.93::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=zara'),

  ('Diego Ferreira',
   'São Paulo, Vila Madalena. Music producer. I know where the good bars are and which streets to walk after 2am (and which not).',
   'São Paulo', 'Brazil', -23.5505, -46.6333,
   array['sao-paulo-nightlife','music','safety','sao-paulo-food','culture'],
   array['en','pt'],
   true, 0.86::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=diego'),

  ('Chloe Nguyen',
   'SF Mission district. ML engineer. I attend two hackathons a month. I can tell you which VC actually reads cold emails.',
   'San Francisco', 'United States', 37.7749, -122.4194,
   array['tech','ai','startups','hackathons','sf-food','vc'],
   array['en','vi'],
   true, 0.89::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=chloe'),

  ('Marcus Reid',
   'Toronto Queen West. Small-business owner (coffee roaster). I know the arts scene, the streetcar quirks, and the winter survival kit.',
   'Toronto', 'Canada', 43.6532, -79.3832,
   array['toronto-food','toronto-nightlife','small-business','art','winter'],
   array['en','fr'],
   true, 0.85::numeric(3,2), true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus')
) as v (display_name, bio, location_city, location_country, lat, lng,
        expertise_tags, languages, verified, trust_score, available, avatar_url)
where not exists (
  select 1 from informants i where i.display_name = v.display_name
);
