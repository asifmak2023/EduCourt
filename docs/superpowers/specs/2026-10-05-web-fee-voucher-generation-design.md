# Web Fee Voucher Generation (Full Mobile Parity)

Status: design
Depends on: existing fee API (`FeeHeadController`, `FeePlanController`,
`FeeVoucherController`), web CRUD conventions (Vendors, Expenses),
mobile admin registry (`apps/mobile/src/admin/registry.ts`).

Deliver **fee setup + voucher generation** in the web app so a staff member can
create fee heads, build fee plans, and issue fee vouchers entirely from the
browser — matching what the mobile admin app already supports. No database
migration or API change is required; every endpoint and table already exists.

## Background

A fee voucher is generated from a **fee plan**, which is built from **fee
heads**:

- `fee_heads` — charge definitions (code, name, income account, sort order,
  active).
- `fee_plans` — one per (academic year + class), with `fee_plan_items` (fee
  head + amount + optional) and `fee_installments` (label, due date,
  percentage; must total 100).
- `fee_vouchers` / `fee_voucher_lines` — generated one per active enrolled
  student per installment.
- `fee_payments` — receipts (`RV-######`) recorded against vouchers.

Current state:

| Capability | Mobile admin | Web |
|---|---|---|
| Fee heads CRUD | yes | **missing** |
| Fee plans CRUD | yes | **missing** |
| Generate voucher / prorated | yes | **missing** |
| Voucher list/detail | yes | yes (`/dashboard/fees`) |
| Record payment / receipt | yes | yes (`/dashboard/fees/payments`) |

## Scope

In scope (web):

- Fee heads list + create + edit + delete.
- Fee plans list + create + edit + delete, including items and installment
  repeaters.
- **Generate** and **Generate prorated** actions on the fee vouchers page.
- Nav entries, i18n keys, generated route paths, types and lookups.
- Idempotent UAT/local seed data for testing.

Out of scope:

- Mobile changes (generation already implemented; verified only).
- Fee refunds, reminders, reports web screens.
- Printable / PDF voucher or receipt output (no PDF exists today).
- Backend schema or API changes.

## Routes

All under the existing **Finance** nav section:

- `/dashboard/finance/fee-heads`
- `/dashboard/finance/fee-heads/new`
- `/dashboard/finance/fee-heads/[id]/edit`
- `/dashboard/finance/fee-plans`
- `/dashboard/finance/fee-plans/new`
- `/dashboard/finance/fee-plans/[id]/edit`

Generation is a modal on `/dashboard/fees` (no new route).

## Components and files

### Fee heads

- `apps/web/src/app/dashboard/finance/fee-heads/page.tsx` — list table
  (name, code, sort, active) with search + status filter, gated by
  `fee.view`; "New fee head" link gated by `fee.create`.
- `.../fee-heads/new/page.tsx`, `.../fee-heads/[id]/edit/page.tsx` — thin
  wrappers gated by `fee.create` / `fee.edit`.
- `apps/web/src/components/FeeHeadForm.tsx` — shared create/edit form:
  `code` (required), `name` (required), `description`, `income_account_id`
  (lookup `useChartOfAccounts`, optional), `sort_order`, `is_active`.
  Create → `POST /v1/fee-heads`; edit → load via `GET /v1/fee-heads/{id}` and
  `PUT /v1/fee-heads/{id}`. Delete via `DELETE /v1/fee-heads/{id}` (permission
  `fee.delete`) with a confirm dialog, mirroring the destructive-action pattern
  used on other web list pages.

### Fee plans

- `apps/web/src/app/dashboard/finance/fee-plans/page.tsx` — list table
  (name, academic year, class, grand total, active) with status filter and
  "New fee plan" link, gated by `fee.view` / `fee.create`.
- `.../fee-plans/new/page.tsx`, `.../fee-plans/[id]/edit/page.tsx` — wrappers.
- `apps/web/src/components/FeePlanForm.tsx` — shared create/edit form:
  - `academic_year_id` (lookup `useAcademicYears`), `class_room_id`
    (lookup `useClassRooms`), `name`, `description`, `is_active`.
  - Late fee: `late_fee_type` (none/fixed/percentage), `late_fee_amount`,
    `late_fee_grace_days`.
  - **Items** repeater: `fee_head_id` (lookup `useFeeHeads`), `amount`,
    `is_optional`, `sort_order`.
  - **Installments** repeater: `label`, `due_date`, `percentage`.
  - Client-side checks: at least one item and one installment; installment
    percentages total 100; show running total. Server re-validates.
  - Create → `POST /v1/fee-plans`; edit → `GET` + `PUT /v1/fee-plans/{id}`.

### Reusable repeater

- Add `Repeater` to `apps/web/src/components/Form.tsx` (or a new
  `components/Repeater.tsx`): renders N rows from an array, `Add row` /
  `Remove row`, stable keys, and renders each row's fields via a render prop.
  Used by items and installments (and reusable later for other plan-like
  forms).

### Generate vouchers (web)

- `apps/web/src/components/GenerateVoucherDialog.tsx` — used on
  `/dashboard/fees`. Two modes:
  - **Standard**: `academic_year_id`, `class_room_id`, `fee_plan_id`
    (filtered to the selected year + class), `apply_scholarships`,
    `apply_concessions` → `POST /v1/fee-vouchers/generate`.
  - **Prorated**: adds `student_id` (lookup `useStudents`) and `join_date`
    → `POST /v1/fee-vouchers/generate-prorated`.
  - Submits body as JSON (booleans sent explicitly), surfaces the API
    `message` (`Generated N voucher(s), skipped M.`), shows errors via the
    existing `ErrorNotice`, then triggers the vouchers list reload.
- `/dashboard/fees/page.tsx` — add a "Generate" button (and mode selector)
  gated by `fee.create`, plus the dialog.

## Data layer

- Types in `apps/web/src/lib/types.ts`: `FeeHead`, `FeePlan`,
  `FeePlanDetail`, `FeePlanItem`, `FeeInstallment`. Reuse existing
  `AcademicYear`, `ClassRoom`, `Student`, `ChartOfAccount`.
- Lookups in `apps/web/src/lib/useLookups.ts`: add `useFeeHeads`
  (`/v1/fee-heads`) and `useFeePlans` (`/v1/fee-plans`), following the
  existing `ListLookupState` factory pattern.
- Nav in `apps/web/src/lib/nav.ts` (Finance section): add
  `navigation.feeHeads` → `/dashboard/finance/fee-heads` (icon `list`,
  permission `fee.view`) and `navigation.feePlans` →
  `/dashboard/finance/fee-plans` (icon `list`, permission `fee.view`),
  ordered before the existing Chart of Accounts entry.
- Route paths: `apps/web/scripts/generate-route-paths.mjs` walks `src/app`
  automatically, so once the new pages exist just run
  `node apps/web/scripts/generate-route-paths.mjs` to refresh
  `src/lib/route-paths.ts`.
- i18n: add keys to `packages/i18n/src/locales/en.ts` (source of truth) and
  `ur.json` (proof): `navigation.feeHeads`, `navigation.feePlans`,
  `navigation.subtitle.feeHeads`, `navigation.subtitle.feePlans`, plus
  `feeHead.*`, `feePlan.*`, `feeGenerate.*` labels, field labels, hints and
  messages. Other locales fall back to English.
- Permissions: view `fee.view`, create `fee.create`, edit `fee.edit`, delete
  `fee.delete` (already defined in `config/rbac.php`).

## Seed data (UAT / local only)

- New idempotent seeder `apps/api/database/seeders/Uat/UatFeesSeeder.php`
  creating, for one UAT campus + class + academic year:
  - Fee heads: Tuition, Admission, Transport, Examination.
  - One fee plan with items and installments summing to 100.
- Register it in the UAT seed command only, after academics, so fee heads/plans
  reference real `class_rooms` and `academic_years`. Guard against duplicates
  (firstOrCreate / updateOrCreate).
- **Not** executed by `/root/deploy-edu.sh`; production fee structure is
  created by the user through the new web screens.

## Data flow

```
Fee head (fee.create) ──▶ Fee plan (fee.create)
                              │  POST /v1/fee-vouchers/generate
                              ▼
                        Fee vouchers (per student / installment)
                              │  Record payment (fee.create)
                              ▼
                        Fee payment + receipt (RV-######)
```

## Error handling

- 422 validation errors from fee heads/plans/generate are mapped to inline
  field errors where the API returns `errors`, otherwise shown in
  `ErrorNotice`.
- Generate responses expose `{ message, created, skipped, data }`; the dialog
  shows the message and any non-field error.
- Permission-gated buttons are hidden when the user lacks the permission; the
  API remains the source of truth (403 handled gracefully).

## Testing and verification

- `tsc --noEmit` and `eslint` clean in `apps/web`.
- Playwright end-to-end on `http://localhost:3100` as `campusadmin.aln-lhr`:
  1. Create a fee head, confirm it appears in the list.
  2. Create a fee plan with items + installments (100%), confirm grand total.
  3. Generate vouchers for the plan's class; confirm created count and rows.
  4. Record a payment on a voucher; open the receipt and confirm `RV-` number.
- Visual check in both English and Urdu (RTL) for the new pages.
- Deploy via `/root/deploy-edu.sh` after push; verify health checks.

## Risks / notes

- Fee plan edits delete and recreate items/installments; changing a plan that
  already has generated vouchers does not retroactively change existing
  vouchers (matches mobile behaviour).
- Installment percentages must total exactly 100 (server enforces within
  0.01); the form shows a live total to prevent avoidable 422s.
- Currency is PKR and formatting already handled by `formatCurrency`.

## Phase 2 — Accounts Receivable report + generation UX

Follow-up requested after Phase 1 shipped: (a) fix the Generate Voucher modal
visibility bug, (b) close real gaps between the database and the attached
Accounts Receivable spec, (c) keep bulk generation but make it hassle-free so a
user never re-enters academic year / class / section per student.

### Accounts Receivable report (`/dashboard/fees/receivables`)

Uses the existing, permission-gated endpoint
`GET /v1/fee-reports/defaulters` (`permission:fee.view`) — no API change:

- `academic_year_id`, `class_room_id`, `as_of`, `overdue_only`, `min_balance`.
- Returns `{ as_of, summary: { students, vouchers, outstanding, buckets },
  data: ReceivableRow[] }`.

Page (`apps/web/src/app/dashboard/fees/receivables/page.tsx`):

- Summary stat cards: **Total accounts receivable**, students with dues, open
  vouchers.
- Aging buckets: current, 1-30, 31-60, 61-90, 90+ days.
- Filters: as-of date, academic year (defaults to the current year, with
  "All academic years"), class, overdue-only toggle, and a client-side
  student / roll-no search.
- Table columns: Student, Roll no, Class, Section, Vouchers, Oldest due, Days
  overdue, Outstanding, Status (`overdue` / `current` badges).
- **Print** (`window.print()`) and **Export CSV** (client-side Blob download;
  Excel-compatible).
- Nav entry `navigation.receivables` under the Finance section.

Outstanding gap vs. the attached doc: the spec's per-voucher columns (Campus,
Fee Type, Fee Month, Amount Due, Amount Paid) are represented in aggregate per
student here; true voucher-level detail remains available on
`/dashboard/fees`. Adding a per-voucher report is deferred until requested.

### Generate Voucher dialog fixes

- Root cause of the invisible/misplaced modal: the overlay was rendered inside
  a `data-glass` ancestor whose `transform` created a containing block. Fixed
  by rendering through `createPortal` to `document.body`.
- Added `.dialog-overlay` / `.dialog-panel` in `globals.css` using the opaque
  `--surface` token (with a glass-aware variant and a `backdrop-filter`
  fallback) so page content never bleeds through.
- Plan-first flow: pick a **fee plan** and the academic year + class are
  derived automatically; class/section are no longer re-entered per student.
- Mode toggle preserves bulk generation (whole class) and also supports a
  single prorated student with a join date.
- `PageHeader` action container is now `flex-wrap` so the Generate button no
  longer overflows off-screen on narrow viewports.

