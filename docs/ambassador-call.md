# HNC & UGX ambassador call

## Audience, task and action

University representatives use `/ambassadors` to understand the joint HNC & UGX call and apply to bring their campus community to GIKI. The homepage hero, navigation and ambassador campaign section lead to this route. The campaign section's primary action is **Become an ambassador**; the dedicated route offers **Apply as an ambassador** and **Submit ambassador application**. One application covers both events and is separate from participant registration.

## Source content and fixed constraints

- **Event:** Hack n' Connect and UGX (Uber.Game X), at GIKI on **11–13 December 2026**. Campaign dates and closing time come from [`src/lib/ambassadors.ts`](../src/lib/ambassadors.ts); the call closes at midnight on 14 December, Pakistan time.
- **HNC modules:** Connect Talks — sessions led by visionary leaders; Venturethon — team collaboration to design innovative prototypes. Keep these names and descriptions aligned with the implemented campaign copy.
- **Benefits:** free event registration, free accommodation, official ambassadorship shield and free socials.
- **Required application fields:** ambassador's name, CNIC, phone number, email, university and expected participant count for HNC & UGX combined. Preserve field labels, validation hints and inline errors. The form states that CNIC is available only to executive admins. Email is visible in the executive table and CSV; historical applications may have no email.
- **States:** submitting disables the fields and shows progress; failure retains the entered details; success confirms receipt and explains that the team will contact the applicant by phone. After closing, the route replaces the form with a closed-call message and retains event-team contacts.

## Visual and responsive direction

The homepage campaign follows the user's modern dark editorial and glass references: an oversized **Ambassador call.** heading overlaps one rounded graphite glass stage. The official NETRONiX mark anchors the top rail beside application status; centered official HNC and UGX marks lead the composition. Soft blue/red lighting, a fine silver border and hairline dividers give the surface depth. A white pill CTA sits beside the date and module summary, with benefits below.

Space Grotesk headings and Inter body text retain the existing NETRONiX typography. At smaller widths, the date and CTA stack and benefits form two columns. The dedicated route retains its two-column context/form layout on large screens, stacked content and an **Apply as an ambassador** jump link to `#apply` on smaller screens, red submit action and blue form focus. Labels, visible keyboard focus, error associations and generous control heights remain intact. This redesign is scoped to the campaign presentation and official brand marks; backend and form behavior are unchanged.

## Asset provenance and implementation

The user supplied the official PNGs from `../NETRONiX Logos/`. These assets are byte-identical copies:

- [`public/brand/hnc.png`](../public/brand/hnc.png) from `HNC Logo Final White.png`.
- [`public/brand/ugx.png`](../public/brand/ugx.png) from `ugx logo.png`.
- [`public/brand/netronix-white.png`](../public/brand/netronix-white.png) from `NETRONiX Logo White.png`.

[`BrandLogo`](../src/components/ui/brand-logo.tsx) uses measured alpha bounds to hide transparent canvas padding while preserving the original marks. [`AmbassadorIdentity`](../src/components/ui/ambassador-identity.tsx) displays the official HNC and UGX assets on the application route. The public navbar/footer, ambassador application header and admin login use the official NETRONiX asset.

Route composition lives in [`src/app/ambassadors/page.tsx`](../src/app/ambassadors/page.tsx), the homepage panel and its responsive styling in [`ambassador-call.tsx`](../src/components/sections/ambassador-call.tsx) and [`ambassador-call.module.css`](../src/components/sections/ambassador-call.module.css), and the application states in [`src/components/forms/ambassador-form.tsx`](../src/components/forms/ambassador-form.tsx).

## Verification

The fresh visual review returned **SHIP**. Desktop, 390px and 320px overflow checks and the application CTA check passed, as did the production build, typecheck and ESLint checks.

See [SETUP.md](../SETUP.md#hnc--ugx-ambassador-call-december-2026) for database setup, access behavior and the validation, typecheck, lint, production-build and integration-check commands.
