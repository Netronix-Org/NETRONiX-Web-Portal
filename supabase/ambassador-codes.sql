BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.ambassador_code_seq
  AS integer MINVALUE 1000 MAXVALUE 9999 START WITH 1000 NO CYCLE;

ALTER TABLE public.ambassador_applications
  ADD COLUMN IF NOT EXISTS code integer CHECK (code BETWEEN 1000 AND 9999);

ALTER SEQUENCE public.ambassador_code_seq OWNED BY public.ambassador_applications.code;
REVOKE ALL ON SEQUENCE public.ambassador_code_seq FROM PUBLIC, anon, authenticated;

ALTER TABLE public.ambassador_applications
  ALTER COLUMN code SET DEFAULT nextval('public.ambassador_code_seq'::regclass);

UPDATE public.ambassador_applications SET code = DEFAULT WHERE code IS NULL;

ALTER TABLE public.ambassador_applications ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ambassador_applications_code_key
  ON public.ambassador_applications(code);

COMMIT;
