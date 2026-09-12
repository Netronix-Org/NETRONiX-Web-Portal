# NETRONiX — Backend & Admin Portal Setup

Everything below is a one-time setup. Budget about 15 minutes.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Pick a region close to Pakistan — **Singapore** or **Mumbai** is fastest.
3. Save the database password somewhere safe. You will not need it for the
   website, but you will need it if you ever connect directly.

---

## 2. Create the tables

1. In Supabase, open **SQL Editor → New query**.
2. Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Paste and hit **Run**.

That creates:

| Table | What it holds |
| --- | --- |
| `events` | Every event on the site, plus its Live / Coming Soon switch |
| `registrations` | Every form submission, hard-linked to its event |
| `admin_users` | Your login accounts for the admin portal |

It also seeds the five events already on the website (UGX, Hack n Connect,
Inductions, Volunteer Call, SNP) and creates a **separate view per event** —
`reg_ugx`, `reg_inductions`, `reg_hack_n_connect`, and so on. Open the Table
Editor and each event's submissions sit in their own list, so there is never
any confusion about which submission belongs to which event.

The script is safe to re-run: it never overwrites events you have edited.

---

## 3. Connect the website

In Supabase, go to **Project Settings → API** and copy three values.

Create a file called `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # the "anon / public" key
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # the "service_role" key
ADMIN_SESSION_SECRET=                        # see below
```

Generate the session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **The `service_role` key is a master key.** It ignores all security rules.
> Never put it in a file that starts with `NEXT_PUBLIC_`, never paste it into
> frontend code, and never commit it. `.env.local` is already gitignored.

---

## 4. Create your admin login

```bash
npm run admin:create
```

It asks for a username and password, hashes the password with bcrypt, and
writes the account to Supabase. The plain password is never stored or logged.

Run it again any time to add another admin or reset a password.

---

## 5. Run it

```bash
npm install
npm run dev
```

- Website — <http://localhost:3000>
- Admin portal — <http://localhost:3000/admin/portal>

`/admin` and `/admin/portal` both redirect to the login screen until you sign in.

---

## How the Live / Coming Soon switch works

Open `/admin/portal` → **Events** tab. Each event has:

- **Status** — three buttons: `Coming Soon`, `Live Now`, `Concluded`.
- **Accept new registrations** — a checkbox to freeze the form without changing
  the status (useful when you are full but do not want the card to say closed).
- **Schedule** — optional **Goes live at** and **Closes at** date/time pickers.

The rules, in order of precedence:

1. If **Closes at** has passed → the event is **Concluded**, whatever else is set.
2. Otherwise, if the status is **Concluded** → Concluded.
3. Otherwise, if **Goes live at** has passed → **Live Now**, automatically.
4. Otherwise → whatever the status button says.

So you have two ways to launch an event: tick `Live Now` yourself, or set a
go-live date and let it flip on its own at that moment. No cron job, no
deploy — it is evaluated on every page load.

**When an event is live**, its card on the homepage stops saying "Coming Soon"
and turns into a working **Register →** button pointing at
`/events/<slug>/register`.

---

## The registration form

Every live event gets a form at `/events/<slug>/register` with these fields:

| Field | Type | Notes |
| --- | --- | --- |
| Full Name | text | 2–100 characters |
| Registration Number | text | Unique per event — nobody can register twice |
| Batch | dropdown | 36, 35, 34, 33 |
| Email | email | Validated |
| Phone Number | tel | |
| Hostel Number | text | Hostel and room, e.g. `H-7 / 214` |
| Your Skills | checkboxes | Grouped Technical / Creative / Operations |
| Other skill | text | Only appears when "Other" is ticked, and is then required |
| What do you know about NETRONiX? | textarea | 10–2000 characters |

Validation runs in three places: in the browser as you type, again on the server
(because anyone can POST directly to the API), and once more as database
constraints. A submission that reaches the table is always well-formed.

### Changing the skill checkboxes

Edit `SKILL_OPTIONS` in [`src/lib/events.ts`](src/lib/events.ts). The form, the
validation and the admin table all read from that one list. Change a `label`
freely; only change a `value` if you are willing to update existing rows.

---

## Viewing submissions

`/admin/portal` → **Submissions** tab. Pick an event and you see only that
event's rows. You can:

- Search by name, registration number or email
- Click a row to expand the full skills list and their NETRONiX answer
- Set each submission to `pending` / `completed` / `rejected` / `shortlisted`
- **Export CSV** — one file per event, ready for attendance sheets or mailing

You can also read them straight in Supabase via the per-event views
(`reg_ugx`, `reg_inductions`, ...).

---

## Adding a new event

**From the portal**, or by inserting a row into `events`. Then run this once in
the Supabase SQL editor so the new event gets its own view:

```sql
select public.rebuild_event_views();
```

New events always start as **Coming Soon**, so nothing goes live by accident.

---

## Security notes

- The public `anon` key can only **read events** and **insert a registration
  into an event that is currently live**. It cannot read, edit or delete any
  submission, and cannot see `admin_users` at all. This is enforced by Row
  Level Security in the database, not just in the app code.
- Admin pages are gated in `src/proxy.ts` before they render, and every admin
  API route re-checks the session on the server.
- Admin passwords are bcrypt hashes. Login compares against a dummy hash when
  the username does not exist, so response timing cannot be used to discover
  valid usernames.
- Sessions are signed JWTs in an HttpOnly cookie, expiring after 12 hours
  (configurable via `ADMIN_SESSION_HOURS`).

---

## Deploying

Deploy on Vercel and add the same four environment variables under
**Project → Settings → Environment Variables**. Use the production values, and
set them for the Production environment.

Once deployed, the admin portal lives at `https://your-domain/admin/portal`.

---

## Still to come

Email confirmations. The groundwork is already in place: `registrations` has an
`email_sent_at` column reserved for it, so wiring in a provider later does not
need a schema change.
