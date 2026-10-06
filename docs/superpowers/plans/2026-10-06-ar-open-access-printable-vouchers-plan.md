# Implementation Plan — AR Open Access + Printable Vouchers & Receipts

Companion to
`docs/superpowers/specs/2026-10-06-ar-open-access-printable-vouchers-design.md`.

Each phase ends with `tsc --noEmit` + `eslint` clean, a verification step, and a
commit/push/deploy per the standing workflow.

---

## Phase F — Access model

Goal: let anyone with fee/accounts/academics view rights view and act, and give
Principal explicit fee rights.

Backend:
- `apps/api/config/rbac.php`: Principal gets `fee.view`, `fee.create`,
  `fee.export`.
- `apps/api/routes/api.php`: switch the AR read routes to
  `permission:fee.view|finance.view|academic.create|academic.edit` and the AR
  write routes (`fee-counter/generate`, `fee-counter/generate-bulk`,
  `fee-receipts` store) to
  `fee.view|finance.view|academic.create|academic.edit|fee.create|finance.create`.
  `academic.create|academic.edit` is used instead of `academic.view` so plain
  teachers (who hold `academic.view`) are excluded.
- Apply the targeted, idempotent Principal grant on production during deploy.

Frontend:
- `apps/web/src/lib/auth.tsx`: add `canAny(permissions: string[])`; expose on
  context.
- `apps/web/src/lib/nav.ts`: allow `permission?: string | string[]`; match with
  `canAny`. Set AR/fee nav entries to the `AR_VIEW` array.
- `apps/web/src/components/fee-counter/FeeVoucherAction.tsx`,
  `FeeVoucherQuickAction.tsx`, `apps/web/src/components/AppShell.tsx`: gate on
  `canAny(AR_VIEW)`.
- AR pages' `PermissionGate`: accept/allow the `AR_VIEW` set (extend
  `PermissionGate` to accept `string | string[]`).

Verification: an `academic.create`/`academic.edit` or `fee.view`/`finance.view`
user sees AR nav + actions; an `academic.view`-only user (teacher) does not.

---

## Phase G — Printable fee challan

Backend:
- `FeeChargeResource`: add `campus` + `institution` (`whenLoaded`).
- `CampusResource`: add `settings`.
- `FeeChargeController::show`: eager-load `campus.institution` and `institution`.

Frontend:
- `apps/web/src/components/fee-counter/VoucherPrintButton.tsx` — links to
  `vouchers/{id}?print=1`.
- `apps/web/src/app/dashboard/finance/accounts-receivable/vouchers/[id]/page.tsx`
  — print-first challan layout + `@media print`; auto-print when `?print=1`.
- Add the Print action next to each `FeeVoucherAction` on students list,
  student profile and AR reports.

Verification: print preview shows header, lines, totals; `?print=1` opens the
print dialog; no console errors.

---

## Phase H — Standalone payment + printable receipt

Backend:
- `FeeCounterService::receivePayment(Student, array, int): array` — create
  receipt, allocate FIFO or pinned, update charges; reject overpayment.
- `FeeReceiptController::store` (validate, call service) +
  `POST fee-receipts` route (`AR_WRITE`) returning `FeeReceiptResource`.
- `FeeReceiptResource`: add `campus` + `institution`; `show` loads them.

Frontend:
- `apps/web/src/components/fee-counter/CollectPaymentDialog.tsx` — student
  pre-bound/searched, outstanding list + total, method/date/reference, submit.
- `apps/web/src/app/dashboard/finance/accounts-receivable/receipts/[id]/page.tsx`
  — printable receipt + `?print=1`.
- A "Collect payment" launch action on AR report rows and student profile.

Verification: collect on a student with outstanding balance; receipt totals and
allocations correct; overpayment blocked; receipt prints.

---

## Phase I — Voucher workspace + receipts list

Frontend:
- AR reports page: add per-row **Print** and **Collect payment**; keep the
  existing search/filters/CSV/print.
- `apps/web/src/app/dashboard/finance/accounts-receivable/receipts/page.tsx` —
  list with receipt no / student search, date range, row Print, CSV.
- `apps/web/src/lib/nav.ts`: add a `Receipts` entry under Finance (`AR_VIEW`).

Verification: lists render, search and pagination work, actions open the right
screens.

---

## Phase J — Tests, i18n, routes, deploy

- Feature tests under `apps/api/tests/Feature/FeeArAccessTest.php` and
  `FeeReceiptPaymentTest.php`.
- i18n keys in `packages/i18n/src/locales/en.ts`; run
  `node packages/i18n/scripts/build-locales.mjs` and `check.mjs`.
- Regenerate `apps/web/src/lib/route-paths.ts`; run `tsc --noEmit` + `eslint`.
- Playwright pass over every launch point (desktop + narrow).
- Commit, push, deploy; then apply the Principal grant and verify on production.
