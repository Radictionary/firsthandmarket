CREATE TABLE public.representation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_title TEXT,
  goal TEXT NOT NULL,
  boundaries TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.representation_requests TO anon, authenticated;
GRANT ALL ON public.representation_requests TO service_role;

ALTER TABLE public.representation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a representation request"
ON public.representation_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(full_name) BETWEEN 1 AND 120
  AND length(email) BETWEEN 3 AND 254
  AND email LIKE '%_@_%.__%'
  AND length(goal) BETWEEN 1 AND 2000
  AND (role_title IS NULL OR length(role_title) <= 200)
  AND (boundaries IS NULL OR length(boundaries) <= 2000)
);