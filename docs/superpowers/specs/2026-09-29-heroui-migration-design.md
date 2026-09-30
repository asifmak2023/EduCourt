# Web frontend migration to HeroUI v3 (module by module)

Date: 2026-09-29
Status: Completed (2026-09-30)

## Goal

Convert the EduCourt Next.js web client to HeroUI v3 (`@heroui/react` 3.2.6)
one module at a time, replacing the hand-rolled Tailwind markup with HeroUI
components while leaving routing, data access and the backend untouched.

## Context

- `apps/web` uses Next.js 16.3.6, React 19.2.8 and Tailwind CSS v4 - exactly
  HeroUI v3's requirements.
- The client has ~320 `page.tsx` files and 29 shared components. 268 pages
  import `@/components/ui`, 127 import `@/components/Form`, and 214 still
  contain hand-rolled `className` markup (tables, filter bars).
- HeroUI v3 needs no `<Provider>`; styles are pulled in with a single CSS
  import.

## Decisions

1. **Module-by-module.** A module is one sidebar area (its pages plus the
   tabs/forms it owns). Each module is converted, verified, committed and
   pushed as its own batch.
2. **Shared components convert on first use.** The shared layer (`ui.tsx`,
   `Form.tsx`, `Pagination.tsx`, later `MasterList`/`MasterForm`) is converted
   the first time a module needs it. From that point the change is global.
3. **Shared wrappers keep their public props.** Re-implemented with HeroUI
   internally, but the existing prop contract is preserved so the >300 pages
   that consume them keep compiling. In particular HeroUI's `Select` is
   collection based, so the wrapper translates the existing `<option>`
   children into HeroUI list-box items and forwards `value`/`onChange` as
   strings.
4. **Single light theme.** HeroUI's default design tokens replace the current
   slate look. No dark mode. No routing, data-fetch or backend changes.
5. **Incremental coexistence.** Old Tailwind markup remains in unconverted
   modules and coexists with HeroUI until each module is migrated.

## Foundation (once, first batch)

- `pnpm add @heroui/styles @heroui/react` (pin 3.x); install any peer
  dependencies pnpm reports as missing.
- In `src/app/globals.css`, add `@import "@heroui/styles";` immediately after
  `@import "tailwindcss";` (order matters).
- No provider wrapper; keep the existing `globals.css` base variables unless
  they conflict with HeroUI tokens.

## Definition of done (per module batch)

- Pages use HeroUI for containers, controls and data tables.
- Data hooks (`useList`, `useResource`, `useReport`, `apiFetch`) unchanged.
- `pnpm exec tsc --noEmit` and `pnpm exec eslint src` clean.
- Routes return HTTP 200 and any existing smoke script for the module passes.
- Committed and pushed to `master`.

## First batch: Notifications

- Convert `dashboard/notifications/page.tsx` and
  `dashboard/notifications/[id]/page.tsx`.
- Hand-rolled `<table>` becomes a HeroUI `Table`; status/type/channel chips
  become `Chip`; notices become `Alert`; buttons become HeroUI `Button`.
- Convert the shared `ui.tsx`, `Form.tsx` and `Pagination.tsx` to HeroUI as
  part of this batch (first use).
- `MasterList`/`MasterForm` are not used here and wait for the first module
  that needs them.

## Rollout order

Notifications → Institutions (introduces `MasterList`/`MasterForm`) →
Circulars → Settings (SSO) → Audit → Users/Roles → Academic →
Students/Admissions → Attendance/Exams → Fees/Finance → HR → Operations
(canteen, sports, student-affairs, IT, support) → Reports.

## Completion

The whole web surface (`apps/web/src/app` + `apps/web/src/components`) is
migrated. Final sweep asserts zero legacy Tailwind palette classes and zero
hand-rolled `<table>` elements. `tsc --noEmit` and `eslint src` are clean and
the representative shell, shared-component and module routes return HTTP 200.

Batch commits on `master`:

- `a1fda03` shared UI primitives + Notifications
- `7e3aa69` Institutions + Campuses
- `57c0c51` Circulars
- `51bce13` Audit table
- `697df25` Settings + SSO
- `696cb73` Users + Roles
- `cf4e2cb` Academic / Curriculum / Timetable
- `e908278` Students + Admissions
- `39b7570` Attendance + Exams
- `5e68565` Fees + Finance
- `7186d47` HR + Payroll
- `a631c99` Operations (canteen, inventory, labs, library, sports,
  student-affairs, transport, hostel)
- `77006d2` Reports + Credits + Scholarships + Promotions
- `d881c60` shared components, shell and landing pages

## Risks

- HeroUI v3 is new; pin exact versions and re-check peer deps on upgrades.
- Style import order is load-bearing (`tailwindcss` first).
- React Aria increases bundle size; acceptable for an internal admin console.
- The `Select`/`Checkbox` wrapper translation is the main bespoke code and
  must be covered by the module smoke tests.

## Out of scope

- `apps/mobile` (Expo).
- Dark mode / theme switching.
- Any backend or API change.
