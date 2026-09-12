INSERT INTO public.profiles (id, email, full_name, headline, intake_complete, is_seed) VALUES
  ('11111111-1111-4111-8111-111111111111', 'maya@seed.firsthandmarket.test', 'Maya Okonkwo', 'Built and scaled a 60,000-person developer community from zero; now advising on developer ecosystems.', true, true),
  ('22222222-2222-4222-8222-222222222222', 'daniel@seed.firsthandmarket.test', 'Daniel Reiss', 'Sold a profitable vertical SaaS business after eleven years; now operates quietly and invests.', true, true),
  ('33333333-3333-4333-8333-333333333333', 'priya@seed.firsthandmarket.test', 'Priya Raghavan', 'Enterprise sales leader who has taken three infrastructure products from first customer to nine figures.', true, true),
  ('44444444-4444-4444-8444-444444444444', 'tom@seed.firsthandmarket.test', 'Tom Aldridge', 'Machine learning infrastructure engineer looking for a founding technical role, discreetly.', true, true);

INSERT INTO public.mandate_facts (user_id, tier, category, content) VALUES
  ('11111111-1111-4111-8111-111111111111', 'public', 'strength', 'Grew a developer community from nothing to 60,000 active members over four years.'),
  ('11111111-1111-4111-8111-111111111111', 'public', 'experience', 'Ran developer relations through two platform migrations and one pricing change that nearly broke trust.'),
  ('11111111-1111-4111-8111-111111111111', 'public', 'can_help', 'Community mechanics, moderation, early contributor incentives, and what not to automate.'),
  ('11111111-1111-4111-8111-111111111111', 'agent_visible', 'goal', 'Wants a part-time advisory portfolio rather than another full-time role.'),
  ('22222222-2222-4222-8222-222222222222', 'public', 'experience', 'Bootstrapped a vertical SaaS company to profitability and sold it to a strategic acquirer.'),
  ('22222222-2222-4222-8222-222222222222', 'public', 'can_help', 'Founders deciding whether to sell, and how earnouts actually play out afterwards.'),
  ('22222222-2222-4222-8222-222222222222', 'agent_visible', 'goal', 'Quietly interested in acquiring another small profitable software business.'),
  ('22222222-2222-4222-8222-222222222222', 'public', 'worth', 'Takes a handful of founder conversations a month, no more.'),
  ('33333333-3333-4333-8333-333333333333', 'public', 'strength', 'Understands enterprise purchasing behaviour and why technically superior products still lose deals.'),
  ('33333333-3333-4333-8333-333333333333', 'public', 'experience', 'Built the first sales motion at three infrastructure companies, twice before there was a product.'),
  ('33333333-3333-4333-8333-333333333333', 'agent_visible', 'goal', 'Open to a board seat or an operating partner role at a fund.'),
  ('44444444-4444-4444-8444-444444444444', 'public', 'strength', 'Builds training and inference infrastructure that stays cheap under load.'),
  ('44444444-4444-4444-8444-444444444444', 'public', 'experience', 'Spent six years on ML platform teams at two large companies.'),
  ('44444444-4444-4444-8444-444444444444', 'agent_visible', 'goal', 'Wants to co-found something; has not told his current employer.');

INSERT INTO public.boundaries (user_id, rule) VALUES
  ('11111111-1111-4111-8111-111111111111', 'No recruiters. No vendor pitches.'),
  ('11111111-1111-4111-8111-111111111111', 'Conversations should be about community mechanics, not monetisation.'),
  ('22222222-2222-4222-8222-222222222222', 'Never disclose that I am looking to acquire unless the other side raises it first.'),
  ('22222222-2222-4222-8222-222222222222', 'No investment pitches from funds.'),
  ('33333333-3333-4333-8333-333333333333', 'Advisory only for companies past Series A.'),
  ('44444444-4444-4444-8444-444444444444', 'Do not tell anyone I am considering leaving my company.'),
  ('44444444-4444-4444-8444-444444444444', 'No recruiters. Founders only.');