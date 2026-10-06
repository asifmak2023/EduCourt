# Finance & Accounts Redesign — Accounts Receivable First

Status: design
Depends on: existing fee/accounting schema (`fee_heads`, `fee_plans`,
`fee_vouchers`, `fee_payments`, `chart_of_accounts`, `journal_entries`,
`expenses`, `payroll_*`), student model (`students`,
`student_enrollments`), web app conventions (`apps/web`), i18n package
(`packages/i18n`).
Supersedes (for new design work): `2026-10-05-web-fee-voucher-generation-design.md`
(old fee screens stay as read-only history).

## Objective

Rebuild the Finance module around the attached **Accounts Receivable** and
**Accounts Payable** specifications, with Accounts Receivable as the priority.
The goal is a smooth, student-centric fee collection experience: find any
student by any means, see exactly what they owe, and generate a Fee Receiving
Voucher (with or without immediate payment) in one screen.

## Decisions (agreed)

1. **Additive / migrative redesign.** Preserve students, staff, academics and
   all existing data. Add new spec-accurate AR tables and migrate existing fee
   data forward. Nothing is dropped; no data loss.
2. **Unified counter screen.** "Generate Voucher" is a single screen that shows
   outstanding dues, lets the user choose the receiving type, and optionally
   records payment and prints a Fee Receiving Voucher.
3. **New per-class Fee Structure builder.** Define a monthly amount, exam-term
   amounts, and named one-time/other heads per campus + academic year + class.
   The old percentage-installment plan model is archived for new setup.
4. **Hybrid dues.** Monthly dues are computed live in the counter from the
   enrollment and fee structure; they are persisted as real receivables at the
   moment a voucher/payment is generated. A bulk "post month" action is
   available but optional.
5. **Web application only** for now. Mobile is out of scope beyond keeping the
   shared i18n package buildable.
6. **Inline quick-create.** If the required fee head/structure does not exist,
   the counter prompts the user to create it in a dialog and returns to the
   exact voucher-generation state.

## Scope decomposition

This is too large for a single spec. It is split into four sub-projects, each
with its own spec → plan → implementation cycle:

1. **Remove all languages except English (web).** Small, independent.
2. **Accounts Receivable redesign.** Schema, search, Fee Structure, counter,
   reports, dashboard. This document specifies it in detail.
3. **AR double-entry ledger posting.** Charge/receipt → journal entries. Fast
   follow inside the AR project.
4. **Accounts Payable module.** Salary/utility/purchase/other payment vouchers,
   AP ledger, AP reports. Separate spec.

Build order: 1 → 2 → 3 → 4.

The **first implementation plan** covers sub-project 1 (language removal) and
sub-project 2 (AR redesign). Sub-projects 3 and 4 get their own plans after 2
is live.

---

## Sub-project 1 — Remove all languages except English

- Delete `packages/i18n/src/locales/{de,es,fr,ur}.json`.
- `en.ts` remains the single source of truth; regenerate
  `packages/i18n/src/locales/index.ts` with `en` only
  (`node scripts/build-locales.mjs`).
- Remove `apps/web/src/components/LanguageSwitcher.tsx` and its usage in the
  header.
- Remove RTL handling paths that only triggered for non-English locales; keep
  the layout LTR-only. The i18n runtime (`LocaleContext`, `storage`, `detect`)
  stays, locked to `en`.
- The i18n package must still build so the mobile app is not broken; mobile is
  otherwise untouched.

Acceptance: no locale switcher rendered; only `en` shipped; web builds and
`tsc`/`eslint` clean; no `dir="rtl"` reachable.

---

## Sub-project 2 — Accounts Receivable redesign

### 2.1 Information architecture

`Finance` becomes a hub with two cards: **Accounts Receivable** and **Accounts
Payable** (placeholder; module built in sub-project 4).

Accounts Receivable children:

| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/dashboard/finance/accounts-receivable` | Summary cards, clickable to reports |
| Generate Voucher | `.../generate-voucher` | Unified counter |
| Fee Structure | `.../fee-structure` | Per-class fee setup |
| Reports | `.../reports` | Receivable reporting |

Legacy routes (`/dashboard/fees`, `/dashboard/finance/fee-plans`,
`/dashboard/finance/fee-heads`) are removed from navigation and kept reachable
as read-only history. Fee heads remain editable (they feed the Fee Structure).

### 2.2 Data model (additive)

New tables (all `timestamps` + `softDeletes` unless noted):

**`fee_structures`**
`id`, `institution_id`, `campus_id`, `academic_year_id`, `class_room_id`,
`name`, `is_active`.
Unique `(campus_id, academic_year_id, class_room_id)`.

**`fee_structure_items`**
`id`, `fee_structure_id`, `fee_head_id` (nullable), `name`,
`billing_kind` (`monthly` | `exam` | `one_time` | `other`),
`exam_term` (nullable: `first` | `second` | `third` | `final` | `monthly_test`),
`amount` (decimal 15,2), `is_optional`, `sort_order`, `is_active`.

**`fee_charges`** — the receivable / voucher.
`id`, `institution_id`, `campus_id`, `academic_year_id`, `student_id`,
`enrollment_id` (nullable), `class_room_id`, `section_id` (nullable),
`fee_structure_item_id` (nullable), `fee_head_id` (nullable), `voucher_no`,
`billing_kind` (`monthly` | `exam` | `one_time` | `other` | `legacy_installment`),
`exam_term` (nullable), `period_year` (smallint), `period_month` (nullable
tinyint), `title` (nullable), `amount`, `discount_amount`, `paid_amount`,
`due_date`, `status` (`unpaid` | `partial` | `paid` | `void`),
`source` (`structure` | `manual` | `other` | `legacy`), `notes`,
`journal_entry_id` (nullable), `created_by` (nullable).
Unique `(campus_id, voucher_no)`. Unique duplicate-guard index
`(campus_id, student_id, billing_kind, exam_term, period_year, period_month,
fee_structure_item_id)` — enforced for monthly/exam rows (non-null keys) and
intentionally inert for `other` rows (null keys), so ad-hoc charges may repeat.

**`fee_charge_lines`** — per-head breakdown.
`id`, `fee_charge_id`, `fee_head_id` (nullable), `description`, `amount`,
`discount_amount`.

**`fee_receipts`** — money received.
`id`, `institution_id`, `campus_id`, `student_id`, `receipt_no`,
`payment_date`, `amount`, `method`, `reference` (nullable), `notes`,
`status` (`posted` | `void`), `journal_entry_id` (nullable),
`created_by` (nullable). Unique `(campus_id, receipt_no)`.

**`fee_receipt_allocations`** — receipt settles charges.
`id`, `fee_receipt_id`, `fee_charge_id`, `amount`. Unique
`(fee_receipt_id, fee_charge_id)`.

Voucher numbers continue the existing `FV-%06d` series; receipts continue
`RV-%06d`.

### 2.3 Migration and backfill (non-destructive)

Ordered migration:

1. Create the six new tables.
2. Backfill `fee_vouchers` → `fee_charges`: preserve `voucher_no`, student,
   campus, academic year, `fee_plan_id`/`fee_installment_id` mapped to
   `fee_structure_item_id = null` and `billing_kind = legacy_installment`,
   `title` = installment label, `period_year`/`period_month` derived from
   `due_date`, amounts and status as-is, `source = legacy`.
3. Backfill `fee_voucher_lines` → `fee_charge_lines`.
4. Backfill `fee_payments` → `fee_receipts` (preserve `receipt_no`, date,
   amount, method, reference, status) and create one allocation per receipt to
   its `fee_voucher_id` charge; where the receipt had no voucher, allocate
   FIFO across the student's open charges.
5. Archive old setup: set `fee_plans.is_active = false`; leave
   `fee_plans`/`fee_plan_items`/`fee_installments` rows in place.

Idempotent and re-runnable where practical. Production runs migrations only
(`deploy-edu.sh` never seeds/fresh).

### 2.4 Student search (all levels)

`GET /v1/fee-counter/students`
Query: `search` (matches admission no, roll number, first/last name, guardian
phone/CNIC, or student id), `campus_id`, `academic_year_id`, `class_room_id`,
`section_id`, `status`, pagination.
Returns compact rows: `student_id`, `admission_no`, `roll_number`, `name`,
`campus`, `class`, `section`, `guardian_phone`, `outstanding`.

`GET /v1/fee-counter/students/{student}/dues`
Query: `academic_year_id`.
Returns: student card fields, fee-structure summary (monthly amount, exam-term
amounts), **live-computed** due months from enrollment start to the current
month, persisted outstanding charges, and running totals.

Both gated by `fee.view`. Reuse `GET /v1/students` filters where feasible and
add a dedicated AR-facing resource.

### 2.5 Counter — Generate Voucher

Single screen (`.../generate-voucher`):

1. **Campus** (defaults to the user's campus; "All campuses" only for
   multi-campus admins).
2. **Search / filters** — free-text search plus class and section facets and
   academic year. Results list with inline outstanding.
3. **Student selected** — student card (name, admission no, roll number,
   campus, class, section, guardian, photo) and the current outstanding list
   grouped by fee type.
4. **Receiving type**:
   - **Monthly** — month(s) picker preselecting unpaid + current month; amount
     auto-filled from the fee structure; multi-select outstanding months;
     discount; amount received (defaults to the total); method + reference.
   - **Examination** — term select; amount auto-filled.
   - **Others** — title, amount, due date.
5. **Summary** — Total Amount, Previous Outstanding, Discount, Amount
   Received, Remaining Balance.
6. **Generate Voucher** — persists charges (and lines), optionally creates the
   receipt and allocations, then opens the printable Fee Receiving Voucher.
   **New Voucher** resets the form.

`POST /v1/fee-counter/generate` accepts the student, receiving type, selected
periods/terms/title, amounts, discount, payment (optional) and returns
`{ charges, receipt?, allocations, printable }`.

### 2.6 Inline quick-create

When the selected campus + academic year + class has no fee structure (or a
required fee head is missing), the counter shows an inline prompt and opens a
quick-create dialog pre-filled with that context:

- `FeeStructureQuickCreateDialog` — compact monthly/exam/other item builder.
- `FeeHeadQuickCreateDialog` — code/name/income account (reuses existing
  `FeeHeadForm` pieces).

On save, the dialog closes and the counter re-resolves the structure and
auto-fills amounts, **preserving the selected student and outstanding state**.
The Fee Structure page gains the same fee-head quick-add without losing the
builder state.

Terminology note: the user's phrase "fee plan" maps to the new **Fee
Structure**; "fee head" is unchanged and remains the income-account-mapped
charge definition.

### 2.7 Fee Structure page

`.../fee-structure`: select campus + academic year + class, then define:

- **Monthly items** (name + amount); sum is the monthly fee.
- **Exam terms** (First/Second/Third/Final/Monthly Test) amounts.
- **One-time / other** heads.

Fee heads provide the income-account mapping. Live totals; validation prevents
saving an empty structure.

### 2.8 Reports and dashboard

**Reports** (`.../reports`) — filters: as-of/date range, campus, class,
section, student, fee type, due date, status (outstanding/paid/partial),
academic year. Columns: Campus, Student, Roll No, Class, Section, Fee Type,
Fee Month/Period, Due Date, Amount Due, Amount Paid, Outstanding, Status.
Auto total row **Total Accounts Receivable**. Tabs: All / Outstanding / Paid /
Partial / Overdue, plus fee-type-wise, class-wise and date-wise collection.
Actions: Search, Filter, Print, Export Excel/CSV (client-side), PDF via
print-to-PDF.

**Dashboard** (`.../accounts-receivable`) — cards: Total Receivable, Today's
Collection, This Month's Collection, Outstanding Fees, Partial Payments,
Overdue Amount; each links to the relevant report.

APIs: extend `FeeReportController` with `ar` (paginated, filters, totals) and
`ar-summary`.

### 2.9 Permissions

Reuse `fee.view` (read/search/reports), `fee.create`
(charges/receipts/structures), `fee.approve` (void/approve), `fee.export`
(exports). Platform admins have no `fee.*` by design.

### 2.10 Testing and verification

- `tsc --noEmit` and `eslint` clean in `apps/web`.
- Migration backfill verified against the local `eis` database: charge/receipt
  counts and totals reconcile with `fee_vouchers`/`fee_payments` before/after.
- Playwright on `http://localhost:3100` as `campusadmin.aln-lhr`:
  search by admission no, roll no, name and facet; open a student's dues;
  generate a monthly voucher with partial payment; verify outstanding updates
  in the report; verify inline quick-create when no fee structure exists.
- English-only UI check; deploy via `/root/deploy-edu.sh` after push; verify
  health and the new routes.

### 2.11 Risks / notes

- Monthly charge uniqueness relies on the duplicate-guard index; "Others"
  charges may legitimately repeat, so they store `period_month = null` and are
  excluded from the monthly guard by `billing_kind`.
- Legacy vouchers remain visible in reports as `legacy_installment` fee type.
- Currency is PKR; formatting via `formatCurrency`.
- No server-side PDF dependency; PDF means print-to-PDF.

---

## Sub-project 3 — AR double-entry ledger (fast follow)

Every `fee_charge` and `fee_receipt` posts to the existing
`journal_entries`/`journal_lines` (Dr Accounts Receivable / Cr Fee Income;
Dr Cash/Bank / Cr Accounts Receivable). Requires default account mapping per
campus (AR control, cash, bank, fee income) configured on the Fee Structure or
campus settings. `journal_entry_id` columns already exist in the AR schema.
Reversal mirrors the existing reversal pattern.

---

## Sub-project 4 — Accounts Payable module (later)

Per the AP spec: Finance → Accounts Payable → Generate Payment Voucher
(Staff Salaries, Utilities, Purchases, Other) and Reports. Reuses
`staff_members`, `staff_salaries`, `payroll_runs`, `vendors`,
`expense_categories`, and the journal. Will be specified separately once AR is
live.
