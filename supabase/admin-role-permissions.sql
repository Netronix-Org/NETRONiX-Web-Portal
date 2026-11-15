ALTER TYPE public."Role" ADD VALUE IF NOT EXISTS 'LIAISON';

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role public."Role" NOT NULL CHECK (role::text IN ('MANAGER', 'LIAISON')),
  permission text NOT NULL,
  enabled boolean NOT NULL,
  PRIMARY KEY (role, permission)
);

ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_role_permissions FROM PUBLIC, anon, authenticated;
