BEGIN;

CREATE TABLE IF NOT EXISTS public.participant_accounts (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  password_hash text NOT NULL,
  issued_password text NOT NULL
);

ALTER TABLE public.participant_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.participant_accounts FROM PUBLIC, anon, authenticated;

ALTER TABLE public.participant_accounts
  ADD COLUMN IF NOT EXISTS password_reminder_requested_at timestamptz(3);

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS payment_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_proof_path text;

CREATE INDEX IF NOT EXISTS registrations_email_idx ON public.registrations(email);

COMMIT;
