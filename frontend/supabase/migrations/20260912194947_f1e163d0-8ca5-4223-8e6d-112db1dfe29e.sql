-- Roles
CREATE TYPE public.app_role AS ENUM ('operator', 'member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  headline text,
  intake_complete boolean NOT NULL DEFAULT false,
  paused boolean NOT NULL DEFAULT false,
  is_seed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Members insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Members update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mandate facts
CREATE TYPE public.fact_tier AS ENUM ('public', 'agent_visible', 'never');

CREATE TABLE public.mandate_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier public.fact_tier NOT NULL DEFAULT 'public',
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mandate_facts_user_idx ON public.mandate_facts (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandate_facts TO authenticated;
GRANT ALL ON public.mandate_facts TO service_role;
ALTER TABLE public.mandate_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own facts" ON public.mandate_facts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mandate_facts_updated_at BEFORE UPDATE ON public.mandate_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Boundaries
CREATE TABLE public.boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boundaries_user_idx ON public.boundaries (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boundaries TO authenticated;
GRANT ALL ON public.boundaries TO service_role;
ALTER TABLE public.boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own boundaries" ON public.boundaries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER boundaries_updated_at BEFORE UPDATE ON public.boundaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Intake conversation
CREATE TABLE public.intake_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('agent', 'member')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intake_messages_user_idx ON public.intake_messages (user_id, created_at);
GRANT SELECT, INSERT ON public.intake_messages TO authenticated;
GRANT ALL ON public.intake_messages TO service_role;
ALTER TABLE public.intake_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own intake" ON public.intake_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members write own intake" ON public.intake_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Introductions
CREATE TABLE public.introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'declined')),
  topic text,
  time_ask text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX introductions_pair_idx ON public.introductions (user_a, user_b);
GRANT SELECT ON public.introductions TO authenticated;
GRANT ALL ON public.introductions TO service_role;
ALTER TABLE public.introductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read introduction" ON public.introductions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b OR public.has_role(auth.uid(), 'operator'));
CREATE TRIGGER introductions_updated_at BEFORE UPDATE ON public.introductions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-side packet
CREATE TABLE public.introduction_sides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_id uuid NOT NULL REFERENCES public.introductions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  counterpart_id uuid NOT NULL,
  why_meet text NOT NULL,
  why_they_want text NOT NULL,
  the_ask text NOT NULL,
  not_asking text NOT NULL,
  recommendation text NOT NULL DEFAULT 'Accept',
  decision text NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending', 'accepted', 'declined')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (introduction_id, user_id)
);
CREATE INDEX introduction_sides_user_idx ON public.introduction_sides (user_id);
GRANT SELECT, UPDATE ON public.introduction_sides TO authenticated;
GRANT ALL ON public.introduction_sides TO service_role;
ALTER TABLE public.introduction_sides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own side" ON public.introduction_sides
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Members decide own side" ON public.introduction_sides
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER introduction_sides_updated_at BEFORE UPDATE ON public.introduction_sides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agent-to-agent transcript (operator only)
CREATE TABLE public.negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_id uuid REFERENCES public.introductions(id) ON DELETE CASCADE,
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  outcome text NOT NULL DEFAULT 'matched',
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.negotiations TO authenticated;
GRANT ALL ON public.negotiations TO service_role;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read negotiations" ON public.negotiations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operator'));

-- Pairs already evaluated, so the matcher doesn't redo work
CREATE TABLE public.match_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  result text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b)
);
GRANT SELECT ON public.match_attempts TO authenticated;
GRANT ALL ON public.match_attempts TO service_role;
ALTER TABLE public.match_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read match attempts" ON public.match_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operator'));