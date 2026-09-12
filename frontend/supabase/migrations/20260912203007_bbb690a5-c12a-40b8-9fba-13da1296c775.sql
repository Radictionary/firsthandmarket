CREATE TABLE public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'ambiguous',
  agent_id text,
  agent_username text,
  agent_email text,
  agent_api_key text,
  workspace_slug text,
  coworker_id text,
  crm_contact_id text,
  sync_state text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read integrations" ON public.integrations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'operator'::app_role));
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.introductions ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;