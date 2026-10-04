# Web Landing Page, Student/Parent Portal, Profiles and Breadcrumb Clarity

Status: design
Depends on: role-scoped data visibility (server-side scoping already deployed).

This spec covers four related pieces of **web** work, delivered in a single
implementation pass:

1. A theme-aware highlighter background for breadcrumbs so they stay legible
   over every accent/light/dark/glass/wallpaper combination.
2. A public SaaS marketing landing page at `/` for `educourt.asifent.com`.
3. A web student/parent portal at `/portal`, replacing the current dead-end
   "use the mobile app" block.
4. A self-service profile for every user (staff and portal) with photo upload
   and password change.

## Goal

- Breadcrumbs are always readable: a translucent, theme-derived surface sits
  behind them, and the current crumb is accented.
- A guest visiting `/` sees an international-standard SaaS marketing page and
  can reach sign-in; a logged-in user is redirected to their dashboard/portal.
- Students and parents can use the full portal in a browser: dashboard,
  timetable, attendance, results, fees and profile, with parent child
  switching.
- Every user can view their own details, upload/replace/remove their own photo,
  and change their password.

## Confirmed decisions

| Question | Decision |
|---|---|
| Delivery | Single implementation pass (four workstreams), committed progressively. |
| Landing page | Full SaaS marketing homepage at `/`; logged-in users auto-redirect. |
| Portal | Dedicated `/portal` shell with tabs; role-aware login redirect; block removed. |
| Profile | View details + own photo upload + password change, for all roles. |
| Backend | Small additive change: self-service `/v1/auth/photo` (POST/DELETE). Everything else already exists. |

## Current state

- **Web** (`apps/web`): Next.js 16 App Router, React 19, Tailwind v4, HeroUI v3.
  - `/` (`src/app/page.tsx`) is a client redirect to `/dashboard` or `/login`;
    there is no marketing page.
  - Themes come from `@eis/appearance` + `src/lib/appearance.tsx`, applied as
    `data-*` attributes and CSS variables on `<html>`; real token values live in
    `@heroui/styles` and `globals.css`. `AppBackground` renders a fixed layer
    behind everything.
  - `Breadcrumbs.tsx` renders muted text directly over that background with no
    surface behind it — the contrast problem.
  - `AppShell.tsx` blocks portal-only users (`isPortalOnly`) with a dead-end
    screen and never renders dashboard children.
  - No profile route, no header account menu. `AuthUser` already carries name,
    email, phone, employee_code, job_title, roles, campus, institution,
    `photo_url`, `two_factor_enabled`.
  - `Avatar`, `PhotoField` components exist and are reusable.
- **Backend** (`apps/api`): portal endpoints already exist under `/v1/me/*`
  (`children`, `timetable`, `attendance`, `results`, `fees`) with no permission
  middleware, authorized by the linked student/guardian. `GET /v1/auth/me`
  returns `UserResource`; `PUT /v1/auth/password` exists. Admin photo upload is
  `POST|DELETE /v1/users/{user}/photo` gated by `permission:user.photo`.
- **i18n**: `packages/i18n` already defines `portal.*` and most `profile.*` keys
  (currently unused in web).

## Workstream 1 — Breadcrumb highlighter

- Add a `.breadcrumb-bar` rule in `globals.css`:
  - `border: 1px solid var(--border-secondary)`
  - `background: color-mix(in oklab, var(--surface) 72%, transparent)`
  - `backdrop-filter: blur(var(--glass-blur, 8px))`
  - rounded, `padding: 0.375rem 0.75rem`, `width: fit-content`
- `Breadcrumbs.tsx`: wrap the `<ol>` in the bar; crumbs use
  `text-foreground/70`, separators `text-muted`, current crumb
  `text-accent font-semibold`, links `hover:text-accent`.
- Because the rule derives from theme variables, it adapts to every accent,
  light/dark mode, glass setting and wallpaper automatically.

## Workstream 2 — Profile for every user

Backend (additive, no permission gate — always self):

- `POST /v1/auth/photo` and `DELETE /v1/auth/photo` in a new
  `ProfilePhotoController` (or methods on `ProfileController`) that reuse the
  existing `UserPhotoController` validation/storage and sync the linked
  student photo, but operate on `request()->user()` only. Returns
  `UserResource`.

Frontend:

- Shared `ProfileView` component (web) rendering:
  - large `Avatar` with upload/replace/remove via `PhotoField` targeting
    `/v1/auth/photo`;
  - detail rows: name, email, phone, employee/admission code, job title,
    campus, institution;
  - role chips;
  - change-password card (`PUT /v1/auth/password`).
- Staff route `/dashboard/profile`; portal route `/portal/profile`.
- `AppShell` header/footer gains an **avatar menu** with Profile and Sign out.
- New i18n keys added to `en` and `ur`.

## Workstream 3 — Student/parent web portal (`/portal`)

- `src/app/portal/layout.tsx` (`PortalShell`): brand + wordmark, child switcher
  (parents with multiple children; persisted in `localStorage`), language
  switcher, avatar menu, tab nav.
- Pages: `portal/page.tsx` (dashboard), `portal/timetable`,
  `portal/attendance`, `portal/results`, `portal/fees`, `portal/profile`.
- `src/lib/portal.ts`: fetch client mirroring the mobile app, calling
  `/v1/me/children`, `/v1/me/timetable`, `/v1/me/attendance`, `/v1/me/results`,
  `/v1/me/fees`, and `GET /v1/auth/me`.
- `AppShell.tsx`: portal-only users are redirected to `/portal` (no dead-end).
- Role-aware routing:
  - login success → staff `/dashboard`, portal-only `/portal`;
  - `/` → guest sees landing, staff `/dashboard`, portal-only `/portal`.
- Guards on both shells: staff shell redirects portal-only → `/portal`; portal
  shell redirects staff → `/dashboard`, guests → `/login`.

## Workstream 4 — Public marketing landing page at `/`

- `/` becomes a public, static marketing page (SEO metadata) instead of a
  redirect. A small client `<AuthRedirect>` redirects logged-in users.
- Sections: sticky nav (wordmark, links, Sign in / Get started); hero (headline,
  subtext, CTAs, CSS/SVG product mock); trust stats; feature grid; module
  showcase; role-based benefits (Admin, Teacher, Student, Parent); testimonial;
  pricing/CTA band; footer.
- Theme-aware (existing accent/appearance variables), responsive, RTL-mirrored
  for Urdu. No external image assets.

## Cross-cutting

- i18n: all new user-facing strings added to `packages/i18n` (`en` source of
  truth + `ur` proof; other locales fall back to en).
- Regenerate `apps/web/src/lib/route-paths.ts` after adding routes so
  breadcrumbs only link real paths.
- No new npm dependencies.

## Verification

Per workstream: `tsc --noEmit`, lint, production build. Playwright probes
against the built app for: breadcrumb contrast under light/dark/wallpaper;
profile photo + password; portal tabs for a student and a parent with child
switching; landing page for guest vs logged-in. API smoke for the new photo
endpoints (upload/delete, and that it rejects unauthenticated calls).

## Deployment

Web + API change together, so this batch is deployed to the VPS after
verification.

## Out of scope

- Redesigning admin user-management detail pages.
- New portal functionality beyond what the mobile portal already exposes.
- Payments/checkout on the landing page.
