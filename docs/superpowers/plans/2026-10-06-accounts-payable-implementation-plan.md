# Implementation Plan — Accounts Payable Module

Companion to
`docs/superpowers/specs/2026-10-06-accounts-payable-module-design.md`.

Each phase ends with the relevant verification (Pint + test suite for the API,
`tsc --noEmit` + `eslint` for the web) and a commit/push/deploy per the standing
workflow.

---

## Phase 1 — Schema, enums, models, config, backfill

Backend:
- Enums in `apps/api/app/Enums`:
  - `PaymentVoucherCategory` (`staff_salary|utility|purchase|other|legacy`, `label()`, `prefix()`).
  - `UtilityType` (`electricity|gas|telephone|internet|water|generator_fuel|other`, `label()`).
  - `PayeeType` (`staff|vendor|other`).
  - `PaymentVoucherStatus` (`draft|pending_approval|approved|partial|paid|cancelled`, `label()`).
- Migrations (additive, idempotent), numbered after `2026_10_06_000700`:
  - `..._000800_create_payment_categories_table.php`
  - `..._000900_create_payment_vouchers_table.php`
  - `..._001000_create_payment_voucher_items_table.php`
  - `..._001100_create_payment_voucher_payments_table.php`
  - `..._001200_backfill_expenses_into_payment_vouchers.php`
- Models `PaymentCategory`, `PaymentVoucher`, `PaymentVoucherItem`,
  `PaymentVoucherPayment` using `BelongsToInstitution`, `BelongsToCampus`,
  `SoftDeletes`, `HasFactory`, `LogsActivity` on the voucher/payment/category.
  Child `payment_voucher_items` is not tenant-scoped (mirrors `ExpenseLine`).
- `config/approvals.php`: add `payment_voucher => PaymentVoucher::class`.
- Seed default `payment_categories` per existing campus, idempotent, in the
  backfill migration (no reliance on `db:seed` on production).

Verification: `php artisan migrate` against local `eis`; assert legacy expense
counts/totals reconcile and no new `journal_entries` are created by the backfill.

---

## Phase 2 — `PayableService` and payroll settlement

Backend:
- New `apps/api/app/Services/Accounting/PayableService.php`:
  - `nextVoucherNo(int $campusId, PaymentVoucherCategory $category): string`
  - `createVoucher(array $data, int $userId): PaymentVoucher`
  - `updateVoucher(PaymentVoucher, array $data): PaymentVoucher` (draft only)
  - `submitForApproval(PaymentVoucher, ?int $userId): PaymentVoucher`
  - `approve(PaymentVoucher, ?int $userId): PaymentVoucher`
  - `cancel(PaymentVoucher, ?int $userId, ?string $reason): PaymentVoucher`
  - `markPaid(PaymentVoucher, array $data, int $userId): PaymentVoucherPayment`
  - `recordPayment(PaymentVoucherPayment, ?int $userId): PaymentVoucherPayment`
  - `voidPayment(PaymentVoucherPayment, ?int $userId, ?string $memo): PaymentVoucherPayment`
  - `voidVoucher(PaymentVoucher, ?int $userId, ?string $memo): PaymentVoucher`
  - `recalculate(PaymentVoucher): PaymentVoucher`
  - `salaryLookups(PayrollRun, ?string $search): Collection`
  - `generateSalaryVouchers(PayrollRun, ?int $staffId, int $userId): Collection`
  - `settlePayrollRunIfComplete(PayrollRun): void`
- Posting follows `ExpenseService`: `Dr expense / Cr payable` on approve for
  purchase/utility/other; `Dr payable / Cr cash|bank` on payment; salary posts
  nothing on approve (`Dr salary_payable / Cr cash|bank` on payment).
- `PayrollRunService::markPaid` disabled: `POST /payroll-runs/{run}/pay` returns
  `409` directing to AP salary vouchers.
- Add `payment_voucher` entity key to `config/approvals.php`.

Verification: API flow tests for each category (create → approve → partial →
full → void), salary bulk from an approved run then settle → run `Paid`.

---

## Phase 3 — Controllers, routes, resources, reports

Backend:
- Controllers under `App\Http\Controllers\Api`:
  `PaymentVoucherController`, `PaymentVoucherPaymentController`,
  `PaymentCategoryController`, `PayableReportController`.
- Resources: `PaymentVoucherResource`, `PaymentVoucherItemResource`,
  `PaymentVoucherPaymentResource`, `PaymentCategoryResource`.
- Routes (flat, under `auth:sanctum,tenant`, gated `finance.*`) exactly as the
  design's endpoint list (`/v1/payment-vouchers*`, `/v1/payment-voucher-payments*`,
  `/v1/payment-categories*`, `/v1/payable-reports/*`).

Verification: curl each endpoint for one voucher category + the report filters.

---

## Phase 4 — Exports (PDF / Excel / CSV)

Backend:
- Add `barryvdh/laravel-dompdf` and `maatwebsite/excel` (+ lock committed).
- Voucher PDF (`/payment-vouchers/{voucher}/pdf`) and report exports
  (`/payable-reports/payables/export?format=pdf|xlsx|csv`).
- Blade view for the professional payment voucher layout.

Verification: PDF/XLSX/CSV smoke via curl (non-empty, correct content-type).

---

## Phase 5 — Frontend

Web:
- `lib/nav.ts`: Accounts Payable group (Dashboard, Generate Payment Voucher,
  Payment Categories, Reports); retire expenses/expense-payments/
  expense-categories nav entries (routes stay reachable read-only).
- Finance hub: Accounts Payable card.
- Pages under `app/dashboard/finance/accounts-payable/`:
  - `page.tsx` (dashboard cards), `generate-voucher/page.tsx` (category chooser +
    four forms), `categories/page.tsx`, `reports/page.tsx`,
    `vouchers/[id]/page.tsx` (detail + printable).
- Components: `PaymentVoucherForm` per category, `VoucherPrint`, item grid,
  `VendorQuickCreateDialog` (mirrors `FeeHeadQuickCreateDialog`).
- i18n keys in `packages/i18n/src/locales/en.ts`; regenerate bundle and
  `route-paths`.

Verification: `tsc` + `eslint` clean; Playwright smoke open AP hub, generate one
voucher of each category, run a report, print a voucher.

---

## Phase 6 — Tests, verification, deploy

- Feature tests: `PaymentVoucherTest`, `PayableReportTest`,
  `PaymentCategoryTest`, salary settlement, permissions.
- i18n build + validate; route-paths regenerate.
- Full Playwright desktop smoke.
- Commit/push/deploy; verify health and new routes on production.
