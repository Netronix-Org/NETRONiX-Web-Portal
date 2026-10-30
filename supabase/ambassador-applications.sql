-- Additive setup for the HNC / UGX ambassador call. Safe to re-run.
-- Prisma supplies UUIDs; no public Supabase API access to CNICs is allowed.
CREATE TABLE IF NOT EXISTS public.ambassador_applications (
  id TEXT PRIMARY KEY,
  campaign TEXT NOT NULL,
  full_name TEXT NOT NULL,
  cnic TEXT NOT NULL CHECK (cnic ~ '^[0-9]{13}$'),
  phone TEXT NOT NULL,
  email TEXT,
  university TEXT NOT NULL,
  participant_count INTEGER NOT NULL CHECK (participant_count BETWEEN 1 AND 10000),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ambassador_applications ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ambassador_applications_campaign_cnic_key
  ON public.ambassador_applications(campaign, cnic);
CREATE INDEX IF NOT EXISTS ambassador_applications_campaign_created_at_idx
  ON public.ambassador_applications(campaign, created_at);

ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassador_applications FROM anon, authenticated;
