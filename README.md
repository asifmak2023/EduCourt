# Education Information System

A multi-campus information system for schools, colleges and universities with
role-based dashboards for every stakeholder. Web and mobile clients share one
Laravel API.

## Repository

```
apps/api      Laravel 11 API (PHP 8.2, MySQL)
apps/web      Next.js web application
apps/mobile   Expo mobile application
docs          Specification, architecture and runbook
```

## Documentation

- `docs/SPECIFICATION.md` - consolidated, corrected specification
- `docs/ARCHITECTURE.md` - stack, request lifecycle, tenancy, security
- `docs/RUNBOOK.md` - setup, run and operations commands

## Quick start

See `docs/RUNBOOK.md`. In short:

```bash
# API
cd apps/api
cp .env.example .env
php artisan key:generate
composer install
php artisan migrate:fresh --seed
php artisan serve --host=127.0.0.1 --port=8000
```

## Status

- Phase 1 delivered: tenancy, users, roles, permissions, scoped access,
  authentication, audit logging and security headers. Account security adds
  password reset, email verification, self-service password change and
  per-device session listing/revocation.
- Phase 2 delivered: academic years and terms, stages, classes, sections,
  subjects and subject-to-class mapping, teaching assignments with slot and
  workload guards, the academic calendar, periods and rooms, and timetable slots
  with class/teacher/room conflict checks plus publish-gated views. A greedy
  timetable generator fills weekly periods from teaching assignments (dry-run,
  replace and unplaced reporting), with manual slots as override. Substitute and
  cover assignments let a campus record who covers a slot on a given date, with
  weekday, self-cover and period double-booking guards.
- Phase 3 started (finance): per-campus fiscal years, chart of accounts and a
  balanced double-entry journal with draft/post, immutability and reversal, plus
  trial balance and account ledger reports. Fee management delivered: fee
  heads, class fee plans and installment schedules, per-student vouchers with
  discount-aware lines, campus-numbered receipts, double-entry posting, and
  void/reversal for both vouchers and payments. Late fees (per-plan policy),
  advance payments with allocation, and refunds post to the ledger, with refunds
  following an approval workflow (request, approve, reject, revoke) that only
  touches the ledger on approval. Reporting
  covers trial balance, account ledgers, receivable aging (defaulter lists),
  per-student statements, per-class summaries and dated collection reports.
  Budgeting is delivered with campus budgets, line items, a draft/approved
  workflow and a budget-vs-actual report. Expenses and payables are delivered
  with vendors, expense categories, vendor bills (approval posts to payables),
  settlements with void/reversal, plus payables-aging and expense-summary
  reports. Cash and bank management adds bank/cash/petty-cash accounts, a cash
  book with running balances and reconciliation snapshots gated on a matching
  balance. Assets and liabilities are tracked in registers with straight-line
  depreciation, book values, disposal and settlement, backed by register reports.
  Monthly accounting periods can be generated, closed, reopened and locked, with
  posting blocked inside closed or locked periods. Financial reporting adds a
  surplus/deficit statement and a whole-school consolidated income statement and
  balance sheet.
- Student records delivered: student profiles, guardians (many-to-many),
  year-by-year class/section enrollment, withdrawal/transfer and promotion.
  Fee billing now raises per-student vouchers and records receipts on top of
  this. Admissions are delivered: campus-numbered applications, enquiry
  tracking, document upload/download, a submit/approve/reject workflow and
  one-step enrollment into a student with guardian link and class/section
  placement. Attendance is delivered: daily class-wise student attendance
  (single or bulk marking, one record per student/day), per-class and
  per-student summaries, staff attendance with a per-staff report, and leave
  requests whose approval writes leave attendance across the requested days.
  Scholarships are delivered: a campus scholarship catalogue (merit, need-based,
  sports, sibling, staff-ward) with percentage or fixed discounts, per-student
  awards with an optional value override, approve/revoke tracking, and automatic
  scholarship discounts merged into fee voucher generation (explicit discounts
  still win). Configurable concession policies add rule-based discounts
  (gender, category, sibling count), stackable or best-single selection with
  caps, and approval-gated grants, all merged into voucher generation alongside
  scholarships. A consolidated per-student history endpoint rolls up the academic
  timeline, attendance summary and fee/scholarship position. Online payments are
  delivered: gateway-agnostic payment intents with a hosted checkout URL,
  HMAC-signed webhooks, and idempotent confirmation that posts a fee payment and
  settles the voucher (manual/test gateway driver behind a gateway interface).
  Configurable fine rules and per-student fines are delivered too, posting onto
  an outstanding voucher and the ledger with apply, waive and revoke actions.
  Fee reminders close the defaulter loop: overdue students are queued onto a
  configurable email/SMS/in-app reminder with a primary-guardian recipient, a
  templated message, send/cancel lifecycle and same-day duplicate suppression,
  delivered through a pluggable gateway (log driver by default). Per-student
  documents and absence notifications remain pending.

See `docs/SPECIFICATION.md` section 14 for the phase plan.
