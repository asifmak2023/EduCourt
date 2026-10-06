# Implementation Plan — Finance & Accounts Receivable Redesign

Companion to: `docs/superpowers/specs/2026-10-06-accounts-receivable-redesign-design.md`
Scope of this plan: sub-project 1 (languages) + sub-project 2 (AR redesign).
Sub-projects 3 (journal posting) and 4 (Accounts Payable) get separate plans.

Each phase ends with: `tsc --noEmit` + `eslint` clean, a verification step, and a
commit/push/deploy per the standing workflow.

---

## Phase 0 — Remove all languages except English

Files:
- Delete `packages/i18n/src/locales/{de,es,fr,ur}.json`.
- Regenerate `packages/i18n/src/locales/index.ts`:
  `cd packages/i18n && node scripts/build-locales.mjs`.
- Remove `apps/web/src/components/LanguageSwitcher.tsx` and its imports/usages
  in:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/components/AppShell.tsx`
  - `apps/web/src/components/PortalShell.tsx`
- `LocaleContext` stays; with only `en` it locks to LTR. No RTL code needed.

Verification: `grep` shows no `LanguageSwitcher`; only `en` in `LOCALES`; web
`tsc`/`eslint` clean; build passes.

---

## Phase 1 — AR schema and migration

Migrations (new, ordered after `2026_10_04_*`), under
`apps/api/database/migrations`:

1. `create_fee_structures_table`
2. `create_fee_structure_items_table`
3. `create_fee_charges_table`
4. `create_fee_charge_lines_table`
5. `create_fee_receipts_table`
6. `create_fee_receipt_allocations_table`
7. `backfill_fee_charges_and_receipts` (data migration)

Column definitions per the spec section 2.2. Use `foreignId(...)->constrained()`
matching existing conventions, `softDeletes`, and the unique indexes specified.

Backfill (idempotent):
- `fee_vouchers` → `fee_charges` (preserve `voucher_no`, map
  `billing_kind = legacy_installment`, derive period from `due_date`,
  `source = legacy`).
- `fee_voucher_lines` → `fee_charge_lines`.
- `fee_payments` → `fee_receipts`; one `fee_receipt_allocations` row per
  receipt to its voucher charge, or FIFO across the student's open charges when
  `fee_voucher_id` is null.
- Set `fee_plans.is_active = false`.

Models (new): `FeeStructure`, `FeeStructureItem`, `FeeCharge`,
`FeeChargeLine`, `FeeReceipt`, `FeeReceiptAllocation` with relationships,
`$fillable`, and casts.

Enums (new): `BillingKind` (`monthly|exam|one_time|other|legacy_installment`),
`ExamTerm` (`first|second|third|final|monthly_test`). `ChargeStatus` reuses
existing `VoucherStatus` semantics; keep `VoucherStatus` for legacy rows.

Verification (local `eis` DB): before/after counts and sums reconcile:
`count(fee_charges) == count(fee_vouchers)`,
`sum(fee_receipts.amount) == sum(fee_payments.amount)`,
allocation totals equal charge `paid_amount`.

---

## Phase 2 — AR API

Controllers (new), gated by existing `fee.*` permissions in `routes/api.php`:

- `FeeStructureController` — `index/store/show/update/destroy`, plus
  `resolve` (by campus + academic year + class).
- `FeeChargeController` — `index/show/store` (manual/other), `void`.
- `FeeCounterController`:
  - `students` — all-levels search.
  - `studentDues` — card + live-computed + persisted dues.
  - `generate` — persist charges (+lines), optional receipt + allocations,
    return printable payload.
- `FeeReceiptController` — `index/show`.
- Extend `FeeReportController` — `ar` (filters + totals) and `arSummary`.

Resources: `FeeStructureResource`, `FeeStructureItemResource`,
`FeeChargeResource`, `FeeReceiptResource`, and a compact
`FeeCounterStudentResource`.

Routes under the existing fee group with `permission:fee.view|create|export`.

Verification: feature tests or `curl` per endpoint as `campusadmin.aln-lhr`;
`generate` creates the expected charges/receipt/allocation and updates
outstanding.

---

## Phase 3 — Fee Structure web UI

- `apps/web/src/lib/types.ts` — new types.
- `apps/web/src/lib/useLookups.ts` / `useList`/`useResource` — hooks for
  fee structures, charges, receipts, counter search.
- Page `apps/web/src/app/dashboard/finance/accounts-receivable/fee-structure/page.tsx`
  with monthly/exam/other item builders (reuse `Repeater`), live totals.
- `FeeHeadQuickCreateDialog` reused here.
- Nav + i18n keys (`navigation.*`, `finance.*`).

Verification: create/edit a structure as `campusadmin.aln-lhr`; Playwright
screenshot.

---

## Phase 4 — Counter (Generate Voucher) + inline quick-create

- Page `.../accounts-receivable/generate-voucher/page.tsx`.
- Components: `StudentSearchPanel`, `StudentDuesCard`, `ReceiveTypeForm`
  (monthly/exam/others), `VoucherSummary`, `FeeReceiptPrintable`.
- `FeeStructureQuickCreateDialog` + `FeeHeadQuickCreateDialog` with counter
  state preserved (lift state to the page so a dialog round-trip keeps the
  selected student and dues).
- On no-structure: inline prompt → dialog → re-resolve + auto-fill.

Verification (Playwright, `http://localhost:3100`): search by admission no,
roll no, name, and facet; open dues; generate monthly voucher with partial
payment; outstanding updates in the report; trigger quick-create when no
structure exists and confirm return to the same student.

---

## Phase 5 — Reports + Dashboard

- `.../accounts-receivable/reports/page.tsx` — filters, spec columns, auto
  total, tabs (All/Outstanding/Paid/Partial/Overdue, fee-type/class/date-wise),
  Print, Export Excel/CSV, PDF (print).
- `.../accounts-receivable/page.tsx` — summary cards linking to reports.
- Finance hub `apps/web/src/app/dashboard/finance/page.tsx` with AR/AP cards.
- Retire old fee nav entries (keep routes as read-only).

Verification: totals reconcile with the ledger; Playwright on desktop + narrow
viewport; deploy and verify production routes.

---

## Deferred

- Phase 6 — journal posting (sub-project 3).
- Phase 7 — Accounts Payable (sub-project 4).
