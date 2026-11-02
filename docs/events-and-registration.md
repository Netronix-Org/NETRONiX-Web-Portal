# Events and HNC & UGX registration

## Audience and action

Visitors use the homepage events section to discover NETRONiX activities, check registration availability and enter the appropriate participant form. HNC and UGX are the two prominent flagship cards; the three other events sit below under **More from NETRONiX**. Open cards offer **Register** or **Pre-register**, linking to `/events/hack-n-connect/register` and `/events/ugx/register`. Participant registration is separate from the [joint ambassador application](ambassador-call.md).

Both flagships show **11–13 December 2026 · GIKI**, sourced from [`AMBASSADOR_CAMPAIGN`](../src/lib/ambassadors.ts). HNC retains **Connect Talks** and **Venturethon**; UGX introduces three days of gaming competition and connection.

## Visual and responsive direction

The scoped update inherits the ambassador campaign's dark editorial and graphite glass reference aesthetic: oversized Space Grotesk headings, rounded graphite surfaces, fine silver borders, hairline dividers, subtle blue lighting for HNC and red for UGX, and white pill actions with dark arrow circles. Official event marks lead each flagship card beneath a NETRONiX/status rail. Secondary cards retain their event copy and existing images within the same surface language.

Desktop presents two flagship cards and three secondary cards per row; below 768px both groups stack. Registration pages pair event context with a glass form panel in two columns, stacking below 1024px. Form fields use two columns on larger screens and one below 640px; full name and submit action span the form width.

Inputs have persistent labels, associated inline errors and branded keyboard focus. The resolved review issue was input boundary visibility: the `#74747e` border exceeds 3:1 contrast against the adjacent panel, strengthens to `#94949f` on hover and gains a blue HNC or red UGX focus outline. Mobile inputs use 16px text; reduced-motion preferences remove surface/control transitions.

## Fields and preserved states

HNC and UGX require **full name, phone, email, CNIC and city**, with optional **ambassador** (the referring ambassador's name) and **university**. The form explains the requirements, one registration per CNIC per event, and how the submitted details are used.

UGX additionally requires a single **Game** choice: **FC26** or **Tekken 8**. Client and server validation reject missing or unsupported games. The choice is saved in the existing `Registration.formData.game` JSON field, appears in expanded admin details and has its own Game column in UGX CSV exports. Older registrations without a game remain readable; no database migration is required.

- Existing status, scheduling and registration-open helpers control access. Coming-soon events with registration enabled offer pre-registration; live events with registration disabled show **Registrations paused**; concluded events and unopened events show their respective notices without an active form or registration CTA.
- Submission disables the fields and action, shows **Submitting…** and a spinner, and preserves entered details on connection or server errors. Server field errors remain associated with their inputs.
- Success focuses a status panel, confirms registration or pre-registration and displays the saved reference ID.
- UGX success also says: **Your confirmation and payment details will be emailed to you.** This is the requested success copy; the registration endpoint itself does not send payment emails.

[`isHncOrUgx`](../src/lib/events.ts) limits the dedicated page/form composition to those two slugs. Other event and volunteer forms retain their existing flow. The registration route remains dynamic so clock and admin changes apply on each request.

## Assets and implementation

No new raster artwork was introduced. The existing official assets are reused through [`BrandLogo`](../src/components/ui/brand-logo.tsx), which hides transparent canvas padding using measured alpha bounds without altering the marks:

- [`public/brand/hnc.png`](../public/brand/hnc.png): supplied `HNC Logo Final White.png`.
- [`public/brand/ugx.png`](../public/brand/ugx.png): supplied `ugx logo.png`.
- [`public/brand/netronix-white.png`](../public/brand/netronix-white.png): supplied `NETRONiX Logo White.png`.

These byte-identical source copies came from `../NETRONiX Logos/`; see [ambassador asset provenance](ambassador-call.md#asset-provenance-and-implementation).

Homepage composition lives in [`events.tsx`](../src/components/sections/events.tsx) and [`events.module.css`](../src/components/sections/events.module.css); card presentation in [`event-card.tsx`](../src/components/ui/event-card.tsx) and [`event-card.module.css`](../src/components/ui/event-card.module.css). The dedicated routes use [`event-registration-page.tsx`](../src/components/forms/event-registration-page.tsx), [`event-registration-form.tsx`](../src/components/forms/event-registration-form.tsx) and [`event-registration.module.css`](../src/components/forms/event-registration.module.css), selected by [`events/[slug]/register/page.tsx`](../src/app/events/[slug]/register/page.tsx).

## Verification

The review's sole issue is resolved; verdict: **SHIP**. The focused suite passed **18 tests**, typecheck passed, and ESLint passed with seven pre-existing warnings. The final production rebuild passed.

See [SETUP.md](../SETUP.md#hnc--ugx-ambassador-call-december-2026) for validation, typecheck, lint, build and integration commands. The markup tests run with `node --import tsx --import ./scripts/register-css-test-loader.mjs --test src/components/forms/event-registration-form.test.tsx`: CSS Modules are stubbed only for Node markup tests; the browser build compiles the real CSS.
