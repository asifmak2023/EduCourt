# Collapsible Web Sidebar and Mobile Functional Parity

Status: design
Depends on: role-scoped data visibility (server-side scoping already deployed).

This spec covers two related pieces of work:

1. Make the **web** dashboard sidebar collapsible on desktop (icon rail).
2. Bring the **Expo mobile app** to functional parity with the web staff
   dashboard: every web screen reachable and working on mobile.

"Functional parity" means navigation + CRUD + data coverage, not pixel-level
visual parity. Styling is adapted to native mobile patterns.

## Goal

- Web: staff can collapse the desktop sidebar to an icon rail and expand it
  again; the choice persists. The mobile-width drawer is unchanged.
- Mobile: staff can reach and operate every module the web dashboard exposes,
  subject to the same permissions. Reports render as native stat cards and
  tables. Nothing about server-side enforcement changes.

## Confirmed decisions

| Question | Decision |
|---|---|
| Which "mobile version" | The Expo app (`apps/mobile`). |
| What "replica" means | Functional parity (reachable + working), not visual parity. |
| Which sidebar collapses | Web desktop only, to an icon rail. |
| Implementation approach | Extend the existing `ModuleConfig` registry; add small shared primitives; bespoke RN screens only where the config engine cannot express the page. |
| Backend | No changes expected; all endpoints exist. Server-side role/campus scoping continues to apply. |

## Current state

- **Web** (`apps/web`): Next.js staff dashboard, `321` page routes.
  `AppShell.tsx` renders a fixed `w-64` sidebar on `lg+`, a drawer below `lg`.
  Sidebar sections expand/collapse; the expanded section is persisted to
  `eis.sidebar.section`.
- **Mobile** (`apps/mobile`): Expo/React Native app. It already has a
  config-driven admin engine:
  - `src/admin/registry.ts` — `MODULES: ModuleConfig[]`, 42 modules across
    Admissions & Students, Academics, Finance, People.
  - `src/admin/ModuleListScreen.tsx`, `ModuleFormScreen.tsx`,
    `ModuleDetailScreen.tsx` — generic renderers driven by config.
  - `src/admin/types.ts` — field types: text, textarea, email, number, date,
    time, select, checkbox, lookup, multiselect, photo, repeater, group.
  - `actions` / `headerActions` — POST/PUT/DELETE with fields, confirm,
    permission, success message.
  - `detailSections` — arbitrary ReactNode sections on detail screens.
  - `src/admin/screens.ts` — `CUSTOM_SCREENS` map (currently `promotions`,
    `feeReports`, `financeReports`).
  - `src/lib/nav.ts` — `buildNav()` groups modules into sections, filtered by
    permission. `src/components/Sidebar.tsx` renders persistent `wide` panel
    (>=900px) or an animated drawer below that.
  - Shared UI in `src/components/ui.tsx`: `Card`, `SectionLabel`,
    `PrimaryButton`, `GhostButton`, `TextField`, `EmptyState`, `ErrorText`,
    `StatusPill`, `Metric`, `Row`.
  - No chart library, and the audited web pages contain no charts/PDF — only
    stat cards and tables.

### Gap (mobile missing vs web nav)

- **Operations**: inventory, library, labs, transport, hostel, canteen,
  sports, student-affairs, complaints, circulars, notifications.
- **Administration**: users, roles, institutions/campuses, audit, settings.
- **Academics staff screens**: attendance (lists/mark/reports), exams (suite),
  timetable, credits/transcript.
- **Analytics/reports**: reports hub + 7 reports, exams analysis,
  trial balance, and the per-module report pages.

## Architecture

### Shared foundations

1. **Extend `ModuleConfig` and the generic renderers** rather than building
   bespoke screens for plain CRUD. Most web modules map directly onto
   `columns`, `filters`, `fields`, and `actions`.
2. **Add three small primitives** to `src/components/ui.tsx` (or a sibling
   `table.tsx`):
   - `SelectFilter` — a dropdown filter for report inputs (existing filters
     are chip rows, which do not scale to many options).
   - `DataTable` — a header + rows table for report output.
   - `StatGrid` — a responsive grid of `Metric` cards.
   None of these require new dependencies.
3. **Bespoke screens** register in `CUSTOM_SCREENS` (`src/admin/screens.ts`)
   and appear in nav via `customScreen`. Used for hubs, reports, bulk grids,
   the timetable grid, result cards, analysis, roles, audit, and
   notifications.
4. **Navigation**: add `operations` and `administration` to the mobile
   `SECTIONS` constant and mirror the web section/item set in `buildNav`,
   keeping permission filtering. Portal accounts continue to see only their
   portal items (role scoping already prevents staff modules).
5. **i18n**: reuse existing `navigation.*` / `admin.*` keys, which the web app
   already ships in the catalog. Add only missing keys. New keys go to `en`
   (source of truth) and `ur` (proof), plus `es` / `fr` / `de` for
   completeness. Because the i18n package is consumed by web, batches that add
   keys require a web rebuild and deploy.
6. **No backend changes expected.** Mobile keeps sending the active
   `campusId`; the server enforces campus/institution and role scoping.

### Phase 0 — Web collapsible sidebar (deploy required)

In `apps/web/src/components/AppShell.tsx`:

- Add `collapsed` state persisted to `localStorage` key
  `eis.sidebar.collapsed` (`"1"` / `"0"`).
- Desktop aside animates between `w-64` and a `4.5rem` icon rail. The content
  wrapper switches `lg:ps-64` <-> `lg:ps-[4.5rem]` in step.
- A toggle button in the sidebar header (chevron, mirrored for RTL) with
  `aria-expanded` and an accessible label.
- Collapsed: section headers hidden; each nav item shows its icon centered
  with a `title` tooltip; the brand wordmark is replaced by a centered compact
  `E` monogram in the existing `brand-glow font-logo` style (no new asset is
  introduced).
- Below `lg` the drawer is unchanged and always renders the full expanded
  panel; the toggle is hidden.

No API changes.

### Phase 1 — Mobile Operations

Config modules (list/filter/detail/form + actions):

- **Inventory**: items (+ movements detail, stock adjustment), categories.
- **Library**: books, issues (+ `return` action, overdue filter).
- **Labs**: labs (+ nested equipment), lab bookings (+ `cancel` / `complete`).
- **Transport**: vehicles, routes (+ nested stops), allocations
  (+ `deallocate`).
- **Hostel**: hostels (+ nested rooms), allocations (+ `vacate`), outpasses
  (+ `approve` / `reject` / `return`).
- **Canteen**: items (+ `adjust-stock`, movements), suppliers, hygiene checks,
  stock entries (list + create), sales (+ `void`), wallets (+ `top-up` /
  `adjust`, transactions).
- **Sports**: catalog, teams (+ members), equipment (+ movements), fixtures
  (+ result), training sessions, achievements.
- **Student affairs**: clubs (+ members), events (+ participants/status),
  certificates (+ issue), welfare records, alumni, council members,
  complaints (+ assign/resolve/reject), counselling.
- **Circulars**: circulars (+ `publish` / `archive`).
- **Notifications**: custom screen (list + send/cancel/batch send +
  queue-absences).

Bespoke: the per-module overview/report screens for inventory, library,
transport, hostel, canteen, sports, and the student-affairs hub, rendered as
`StatGrid` + `DataTable`.

### Phase 2 — Mobile Administration

- **Users**: CRUD, roles multiselect, password on create/edit, photo
  upload/delete.
- **Roles**: custom RBAC screen (role catalogue + permission reference +
  scope-assignment grant/revoke).
- **Institutions**: institutions list, campuses (CRUD), overview.
- **Audit**: custom read-only filterable log (log name, event, date range,
  search).
- **Settings**: appearance (client-side preferences) + SSO providers (CRUD).

### Phase 3 — Mobile Academics staff

Config modules: exam types, exam papers, exams (records) + create/edit,
grade scales (repeater), exam moderations, exam reevaluations, exam
supplementaries, invigilation duties, timetable slots, course registrations.

Bespoke:

- Attendance hub; student and staff attendance lists; student and staff
  attendance reports; leave reuses the existing `leave-requests` module.
- Exam detail (papers table, merit list, publish) and the moderation /
  reevaluation / supplementary workflow detail screens.
- Timetable weekly grid + generate/publish.
- Credits: term GPA and transcript.
- Exam result card.
- **Bulk editable grids** (hardest): student attendance mark, staff
  attendance mark, exam marks.

### Phase 4 — Mobile analytics/reports

- Reports hub + progress, attendance, results, staff, students, financial,
  payroll.
- Exams analysis (class / subject / teachers / year-on-year tabs).
- Trial balance.
- Any module reports deferred from Phase 1.

## Data flow

- All screens read through `apiFetch` with `campusId` attached by `useCampusId`.
- List screens use `useList` (pagination, search, filters) unchanged.
- Report screens call their report endpoint once per parameter change and
  render the response with `StatGrid` / `DataTable`.
- Bulk entry screens load the roster (students/users) and the existing marks,
  then POST the full record array to the existing bulk endpoint.
- Server-side scoping means a teacher or portal user simply receives a
  subset (or an empty set / 403), with no client special-casing.

## Error handling

- Reuse `ErrorText` and the `useList` error surface.
- Action screens surface `ApiError.message` and honour `confirm` prompts.
- Report screens show an empty state when the response has no rows.

## Testing and verification

Per phase:

- **Mobile**: `npx tsc --noEmit` and `npx expo lint` must pass. Run the Expo
  web target and Playwright-probe each new screen against UAT credentials,
  confirming data loads, filters work, and actions complete. Compare against
  the corresponding web page for coverage.
- **Web (Phase 0)**: `tsc --noEmit` and `eslint`; Playwright screenshot of the
  collapsed and expanded rail and a check that `eis.sidebar.collapsed`
  persists across reloads.
- **Deploy**: only batches that touch web or the shared i18n package
  (Phase 0 and any i18n additions) are built, pushed, and deployed to the
  VPS, then smoke-tested live. Mobile-only batches skip deployment.

## Risks

- **Volume**: roughly 40 config modules and 30 bespoke screens span multiple
  sessions. Phases are independently shippable.
- **Hardest screens**: the bulk editable mark grids and the timetable grid.
  They get dedicated bespoke screens and are scheduled last within Phase 3.
- **Permission drift**: web nav gating and mobile `buildNav` gating must agree
  (e.g. complaints are gated by `complaint.view` in nav but
  `student_affairs.view` in-page). Mobile mirrors the nav gating.
- **i18n deploy coupling**: adding keys rebuilds the web bundle, so those
  batches are not mobile-only.
