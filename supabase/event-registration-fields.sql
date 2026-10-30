-- Compatible update: preserve all existing recruitment and ambassador records.
BEGIN;

ALTER TABLE public.registrations
  ALTER COLUMN registration_number DROP NOT NULL,
  ALTER COLUMN batch DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS cnic TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS ambassador TEXT,
  ADD COLUMN IF NOT EXISTS university TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS registrations_event_id_cnic_key
  ON public.registrations(event_id, cnic);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.registrations'::regclass AND conname = 'registrations_cnic_valid') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_cnic_valid CHECK (cnic IS NULL OR cnic ~ '^[0-9]{13}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.registrations'::regclass AND conname = 'registrations_identity_required') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_identity_required CHECK (registration_number IS NOT NULL OR cnic IS NOT NULL);
  END IF;
END $$;

-- Nullable for historical applications; all new applications require email.
ALTER TABLE public.ambassador_applications ADD COLUMN IF NOT EXISTS email TEXT;

COMMIT;
