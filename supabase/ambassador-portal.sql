BEGIN;

ALTER TABLE public.ambassador_applications
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS issued_password text;

UPDATE public.ambassador_applications
SET email = NULLIF(lower(btrim(email)), '')
WHERE email IS DISTINCT FROM NULLIF(lower(btrim(email)), '');

CREATE UNIQUE INDEX IF NOT EXISTS ambassador_applications_campaign_email_key
  ON public.ambassador_applications(campaign, email);

COMMIT;
