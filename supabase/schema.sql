-- ═══════════════════════════════════════════════════════════════════════════
-- NETRONiX Web Portal — Supabase Schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.
--
-- What it creates:
--   1. events            — every event on the site, with live / coming-soon control
--   2. registrations     — all form submissions (one row per registrant)
--   3. admin_users       — login accounts for /admin/portal
--   4. Per-event VIEWS   — each event's submissions appear as its own "table"
--                          in the Supabase Table Editor, so there is zero
--                          confusion about which submission belongs where.
--   5. RLS policies      — the public can ONLY insert into live events, and can
--                          never read anyone else's submissions.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ───────────────────────────────────────────────────────────────────────────

do $$ begin
  create type event_status as enum ('coming_soon', 'live', 'past');
exception when duplicate_object then null; end $$;

do $$ begin
  create type registration_status as enum ('pending', 'completed', 'rejected', 'shortlisted');
exception when duplicate_object then null; end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. EVENTS
-- ───────────────────────────────────────────────────────────────────────────
-- `status` is the manual switch the admin ticks in the portal.
-- `auto_live_at` / `auto_close_at` are optional scheduled dates: if set, the
-- event flips to live / past on its own without anyone touching the panel.

create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  slug              text        not null unique,
  title             text        not null,
  subtitle          text,
  description       text        not null default '',
  image_src         text,
  image_placeholder text,
  accent_color      text        not null default '#0D0D12',

  status            event_status not null default 'coming_soon',
  auto_live_at      timestamptz,
  auto_close_at     timestamptz,

  -- Registration form controls
  registration_open boolean     not null default true,
  max_registrations integer,
  form_intro        text,

  -- Presentation
  is_featured       boolean     not null default false,
  sort_order        integer     not null default 100,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.events.status is
  'Manual switch: coming_soon | live | past. Overridden by auto_live_at/auto_close_at only when those dates have passed.';
comment on column public.events.auto_live_at is
  'Optional. When this timestamp passes, the event counts as live automatically.';
comment on column public.events.max_registrations is
  'Optional cap. NULL means unlimited.';

create index if not exists events_status_idx     on public.events (status);
create index if not exists events_sort_order_idx on public.events (sort_order, created_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. EFFECTIVE STATUS
-- ───────────────────────────────────────────────────────────────────────────
-- Resolves the manual switch against the scheduled dates. This is the single
-- source of truth used by the website, the API and the RLS policies.
-- Precedence: auto_close_at (past) > auto_live_at (live) > manual status.

create or replace function public.event_effective_status(
  p_status        event_status,
  p_auto_live_at  timestamptz,
  p_auto_close_at timestamptz
)
returns event_status
language sql
stable  -- reads now(); must not be immutable or Postgres would cache the result
as $$
  select case
    when p_auto_close_at is not null and now() >= p_auto_close_at then 'past'::event_status
    when p_status = 'past'                                        then 'past'::event_status
    when p_auto_live_at  is not null and now() >= p_auto_live_at  then 'live'::event_status
    else p_status
  end;
$$;

-- The companion function event_is_open() lives in section 4a, because it
-- reads public.registrations and that table does not exist yet at this point.

-- ───────────────────────────────────────────────────────────────────────────
-- 4. REGISTRATIONS
-- ───────────────────────────────────────────────────────────────────────────
-- One table, one row per submission, hard-linked to its event. Each event's
-- rows are exposed as a dedicated view further down (section 7), so in the
-- Supabase dashboard every event genuinely reads as its own table.

create table if not exists public.registrations (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events (id) on delete cascade,

  -- ─── Form fields ────────────────────────────────────────────────────────
  full_name           text    not null,
  registration_number text    not null,
  batch               smallint not null,
  email               text    not null,
  phone               text    not null,
  hostel              text,
  about_netronix      text,
  skills              text[]  not null default '{}',
  other_skill         text,
  form_data           jsonb,

  -- ─── Admin / ops fields ─────────────────────────────────────────────────
  status              registration_status not null default 'pending',
  admin_notes         text,
  email_sent_at       timestamptz,

  created_at          timestamptz not null default now(),

  -- ─── Data integrity ─────────────────────────────────────────────────────
  constraint registrations_batch_valid       check (batch between 33 and 36),
  constraint registrations_email_valid       check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint registrations_name_len          check (char_length(full_name) between 2 and 100),
  constraint registrations_about_len         check (char_length(about_netronix) between 10 and 2000),
  constraint registrations_phone_len         check (char_length(phone) between 7 and 20),

  -- The same student cannot register twice for the same event.
  constraint registrations_unique_per_event  unique (event_id, registration_number)
);

comment on column public.registrations.batch is
  'GIKI batch number, 33 through 36.';
comment on column public.registrations.skills is
  'Multi-select checkbox values, e.g. {networking,web-dev,graphic-design}.';
comment on column public.registrations.email_sent_at is
  'Set when the confirmation email goes out. Reserved for the email step.';
comment on column public.registrations.form_data is
  'Event-specific answers that do not fit the shared columns (e.g. Volunteer Call''s Faculty, essay questions and skill ratings). NULL for events that only use the shared fields.';

create index if not exists registrations_event_id_idx   on public.registrations (event_id, created_at desc);
create index if not exists registrations_email_idx      on public.registrations (email);
create index if not exists registrations_reg_number_idx on public.registrations (registration_number);
create index if not exists registrations_status_idx     on public.registrations (status);

-- ───────────────────────────────────────────────────────────────────────────
-- 4a. IS REGISTRATION OPEN?
-- ───────────────────────────────────────────────────────────────────────────
-- The gate used by the INSERT policy in section 10. Defined here, after
-- public.registrations exists, because Postgres validates SQL function bodies
-- at creation time.
--
-- security definer so the anon role can call it during its own INSERT check
-- without needing read access to the tables it looks at.

create or replace function public.event_is_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.registration_open
         and public.event_effective_status(e.status, e.auto_live_at, e.auto_close_at) = 'live'
         and (
           e.max_registrations is null
           or (select count(*) from public.registrations r where r.event_id = e.id) < e.max_registrations
         )
      from public.events e
      where e.id = p_event_id
    ),
    false
  );
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. ADMIN USERS
-- ───────────────────────────────────────────────────────────────────────────
-- Passwords are bcrypt hashes produced by the app, never plain text.
-- This table is NEVER readable by the public (no RLS policy grants select).

create table if not exists public.admin_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  display_name  text,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 5a. INTERVIEW SCORES
-- ───────────────────────────────────────────────────────────────────────────
-- One shared scorecard per candidate (currently used for Volunteer Call).
-- Any admin can view and update it — there is no per-panelist ownership, so
-- the numbers reflect the panel's latest consensus. scored_by just tracks who
-- last touched it. Every metric is 1-10; the total is computed in the app as
-- the average of whichever metrics are set, not stored here.

create table if not exists public.interview_scores (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations (id) on delete cascade,

  remarks         text,

  confidence      smallint,
  communication   smallint,
  personality     smallint,
  attitude        smallint,
  sponsorship     smallint,
  gaming          smallint,
  networking      smallint,
  liason          smallint,
  tech            smallint,
  pub_creativity  smallint,

  scored_by_id    text references public.admin_users (id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint interview_scores_confidence_range    check (confidence     is null or confidence     between 1 and 10),
  constraint interview_scores_communication_range check (communication  is null or communication  between 1 and 10),
  constraint interview_scores_personality_range   check (personality    is null or personality    between 1 and 10),
  constraint interview_scores_attitude_range      check (attitude       is null or attitude       between 1 and 10),
  constraint interview_scores_sponsorship_range   check (sponsorship    is null or sponsorship    between 1 and 10),
  constraint interview_scores_gaming_range        check (gaming         is null or gaming         between 1 and 10),
  constraint interview_scores_networking_range    check (networking     is null or networking     between 1 and 10),
  constraint interview_scores_liason_range        check (liason         is null or liason         between 1 and 10),
  constraint interview_scores_tech_range          check (tech           is null or tech           between 1 and 10),
  constraint interview_scores_pub_creativity_range check (pub_creativity is null or pub_creativity between 1 and 10)
);

comment on table public.interview_scores is
  'One shared panel scorecard per candidate. Metrics are 1-10; total is computed in the app.';

-- ───────────────────────────────────────────────────────────────────────────
-- 6. updated_at TRIGGER
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists interview_scores_touch_updated_at on public.interview_scores;
create trigger interview_scores_touch_updated_at
  before update on public.interview_scores
  for each row execute function public.touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 7. SEED — the five events currently on the website
-- ───────────────────────────────────────────────────────────────────────────
-- on conflict (slug) do nothing → re-running never overwrites your live edits.

insert into public.events
  (slug, title, subtitle, description, image_src, image_placeholder, accent_color, status, is_featured, sort_order, form_intro)
values
  ('ugx',
   'UGX — Uber.Game X',
   'Annual Gaming Event',
   'Pakistan''s largest university gaming tournament. Featuring CS:GO, FIFA, Valorant, and more across two unforgettable days at GIKI.',
   '/events/UGX_v2.jpeg', 'UGX', '#0D0D12', 'coming_soon', true, 10,
   'Register for UGX. Tell us your squad, your game and what you bring to the arena.'),

  ('hack-n-connect',
   'Hack n Connect',
   'Hackathon',
   'A 24-hour hackathon challenging students to build innovative solutions to real-world networking and infrastructure problems.',
   '/events/HNC_v2.jpeg', 'H&C', '#0D120D', 'coming_soon', false, 20,
   'Register for Hack n Connect. We want to know how you build and what you build with.'),

  ('inductions',
   'Inductions',
   'Society Recruitment',
   'Join NETRONiX. Open inductions for engineers, developers, event coordinators, and creative minds.',
   '/events/Inductions.jpeg', 'IND', '#120D0D', 'live', false, 30,
   'Apply to join NETRONiX. Take your time with the last two questions, they are the ones we actually read.'),

  ('volunteer-call',
   'Volunteer Call',
   'Open Call',
   'Help us run the largest events at GIKI. Volunteer for UGX, Hack n Connect, and SNP as crew, logistics, or tech support.',
   '/events/Volcall.jpeg', 'VOL', '#0D0D0D', 'coming_soon', false, 40,
   'Sign up to volunteer. Tell us where you want to help and what you are good at.'),

  ('snp',
   'SNP',
   'Society Night & Party',
   'NETRONiX''s annual celebration. Live performances, food, and the entire GIKI community together under one roof.',
   '/events/SNP.jpeg', 'SNP', '#0A0A0A', 'past', false, 50,
   'Register for SNP.')
on conflict (slug) do nothing;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. PER-EVENT VIEWS — "a different table per event"
-- ───────────────────────────────────────────────────────────────────────────
-- Each view shows only that event's submissions, with clean column names.
-- Open the Supabase Table Editor and you will see reg_ugx, reg_inductions,
-- reg_hack_n_connect ... each one holding only its own registrations.
--
-- These are generated from the events table, so when you add a NEW event in
-- the admin portal, just re-run section 9 below and its view appears too.

create or replace function public.rebuild_event_views()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ev     record;
  vname  text;
  made   text := '';
begin
  for ev in select slug from public.events loop
    -- reg_<slug> with non-identifier characters normalised to underscores
    vname := 'reg_' || regexp_replace(lower(ev.slug), '[^a-z0-9]+', '_', 'g');

    execute format(
      'create or replace view public.%I as
         select r.created_at          as submitted_at,
                r.full_name           as name,
                r.registration_number as reg_number,
                r.batch,
                r.email,
                r.phone,
                r.hostel,
                r.skills,
                r.other_skill,
                r.about_netronix,
                r.status,
                r.admin_notes,
                r.id,
                r.form_data
           from public.registrations r
           join public.events e on e.id = r.event_id
          where e.slug = %L
          order by r.created_at desc',
      vname, ev.slug
    );

    -- Views are admin-surface only: service_role reads them, nobody else.
    execute format('revoke all on public.%I from anon, authenticated', vname);
    execute format('grant select on public.%I to service_role', vname);

    made := made || vname || E'\n';
  end loop;

  return 'Created / refreshed views:' || E'\n' || made;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. BUILD THE VIEWS NOW
-- ───────────────────────────────────────────────────────────────────────────
-- Re-run this single line any time you add a new event.

select public.rebuild_event_views();

-- ───────────────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────────
-- The anon key ships in the browser, so it must be able to do almost nothing:
--   • read events (the website needs to list them)
--   • insert a registration, and ONLY into an event that is currently live
-- It cannot read, edit or delete any registration, and cannot touch admin_users.
-- The admin portal talks to the database with the service_role key, server-side
-- only, which bypasses RLS entirely.

alter table public.events           enable row level security;
alter table public.registrations    enable row level security;
alter table public.admin_users      enable row level security;
alter table public.interview_scores enable row level security;

-- ── events: public read only ───────────────────────────────────────────────
drop policy if exists "events are publicly readable" on public.events;
create policy "events are publicly readable"
  on public.events for select
  to anon, authenticated
  using (true);

-- ── registrations: public insert into live events only ─────────────────────
drop policy if exists "anyone may register for a live event" on public.registrations;
create policy "anyone may register for a live event"
  on public.registrations for insert
  to anon, authenticated
  with check (public.event_is_open(event_id));

-- No select / update / delete policy exists for anon, so submissions are
-- private by default. Deliberate: do not add one.

-- ── admin_users: no policy at all → completely sealed from the anon key ────

-- ── interview_scores: no policy at all → sealed from the anon key ──────────
-- Only readable/writable via the service_role key, server-side, same as
-- admin_users. Panelists use existing admin logins to read and edit it.

-- ───────────────────────────────────────────────────────────────────────────
-- 11. CREATE YOUR ADMIN LOGIN
-- ───────────────────────────────────────────────────────────────────────────
-- Do NOT type a plain password here. Generate the bcrypt hash first:
--
--     npm run admin:create
--
-- That script prints a ready-to-paste INSERT statement. Or, if you would
-- rather do it entirely in SQL, use pgcrypto (bcrypt, cost 10):
--
--   insert into public.admin_users (username, password_hash, display_name)
--   values ('admin', crypt('your-real-password-here', gen_salt('bf', 10)), 'NETRONiX Admin')
--   on conflict (username) do update set password_hash = excluded.password_hash;
--
-- Both produce the same bcrypt format the login route verifies.

-- ═══════════════════════════════════════════════════════════════════════════
-- Done. Next: copy your Project URL, anon key and service_role key from
-- Supabase → Project Settings → API into .env.local (see .env.example).
-- ═══════════════════════════════════════════════════════════════════════════
