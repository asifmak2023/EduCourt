# Accounts Payable Module — Design

Status: design
Depends on: existing finance schema (`vendors`, `expense_categories`,
`chart_of_accounts`, `journal_entries`, `journal_lines`, `fiscal_years`),
the existing Expenses ledger (`expenses`, `expense_lines`, `expense_payments`),
payroll (`staff_members`, `staff_salaries`, `salary_components`, `payroll_runs`,
`payslips`, `payslip_items`, `payroll_adjustments`), shared services
(`JournalService`, `ApprovalService`), the AR module conventions
(`apps/web`, `apps/api`, `packages/i18n`), and the attached
_Account Payable for School Management Software_ specification.

Supersedes (for new AP design work): the ad-hoc `/dashboard/finance/expenses`
screens, which retire from navigation and stay reachable as read-only history.

## Objective

Build a complete Accounts Payable module under Finance with exactly two main
options, matching the attached specification:

1. **Generate Payment Voucher** — four professional voucher forms:
   Staff Salaries, Utilities, Purchases, Other Payments.
2. **Accounts Payable Reports** — a reporting dashboard for all payable
   transactions and outstanding dues.

Every generated voucher automatically creates an Accounts Payable transaction
(double-entry), feeds the AP reports, and prints/downloads as a professional
payment voucher. All amounts are in PKR. The module is campus-scoped and
multi-campus aware.

## Decisions (agreed)

1. **New `payment_vouchers` schema.** Purpose-built AP tables, independent of
   the existing `expenses` ledger. The old expenses screens retire from the nav
   (routes kept, read-only). Rationale: the spec is voucher-centric and has
   category-specific fields the bill-centric `expenses` model cannot express
   cleanly.
2. **Backfill legacy, no re-post.** The existing 67 expenses and 23 payments
   are backfilled into `payment_vouchers`/`payment_voucher_payments` as
   `category = legacy`, reusing their existing `journal_entry_id`. No journal is
   re-posted, so the GL is untouched and AP reports show complete history.
3. **Salary vouchers require an approved payroll run.** A salary voucher is
   generated from an approved, unsettled `payroll_run` and its `payslip`.
4. **Salary voucher settles the payroll run.** Payroll already posts the accrual
   (`Dr Salaries & Wages / Cr Accrued Salaries`). The salary voucher therefore
   posts nothing on approval; paying it posts
   `Dr Accrued Salaries (2020) / Cr Cash|Bank`, settles that payslip, and flips
   the run to `Paid` once all its payslips are settled. Payroll's own
   `POST /payroll-runs/{run}/pay` is disabled and points to AP, so salaries are
   never double-posted.
5. **One salary voucher per staff/payslip**, with a bulk "generate for all staff
   in the run" action.
6. **Payable plus optional payment rows.** Purchase/Utility/Other vouchers post
   the accrual on approval (`Dr expense account / Cr payable account`) and post
   each payment (`Dr payable account / Cr Cash|Bank`), leaving a remaining
   payable balance. Supports partial payments.
7. **Reuse `finance.*` permissions and `ApprovalService`.** Statuses follow the
   spec; overdue is computed, not stored.
8. **New `payment_categories` table** for "Other Payments" categories, each
   mapped to an expense account, admin-manageable.
9. **Server-side PDF and Excel in this batch.** Add `barryvdh/laravel-dompdf`
   and `maatwebsite/excel`, plus CSV and Print.
10. **Web application only.** Mobile is out of scope beyond keeping the shared
    i18n package buildable.

## Information architecture

`Finance` is a hub. Accounts Payable children:

| Page | Route | Purpose |
|---|---|---|
| AP Dashboard | `/dashboard/finance/accounts-payable` | Summary cards, links to vouchers/reports |
| Generate Payment Voucher | `.../accounts-payable/generate-voucher` | Category chooser → voucher form |
| Payment Categories | `.../accounts-payable/categories` | Manage Other-payment categories + accounts |
| Reports | `.../accounts-payable/reports` | Payables reporting dashboard |
| Voucher detail | `.../accounts-payable/vouchers/[id]` | View / print / download / act on a voucher |

Legacy routes (`/dashboard/finance/expenses`, `/dashboard/finance/expense-payments`,
`/dashboard/finance/expense-categories`) are removed from navigation and kept
reachable as read-only history. Vendors remain in the nav (used by purchase
vouchers).

## Data model (additive)

New tables (all `timestamps`; `softDeletes` where noted), scoped by
`institution_id` + `campus_id` via the existing `BelongsToInstitution` /
`BelongsToCampus` concerns.

**`payment_categories`**
`id`, `institution_id`, `campus_id`, `name`, `code` (unique per campus),
`expense_account_id` (nullable, `chart_of_accounts`), `is_active`,
`sort_order`. Seeded per campus with the spec's examples: Repair & Maintenance,
Transport Expense, Professional Fee, Security Services, Rent, Stationery,
Miscellaneous Expense. `softDeletes`.

**`payment_vouchers`** — the payable / voucher.
`id`, `institution_id`, `campus_id`, `fiscal_year_id` (nullable),
`category` (`staff_salary` | `utility` | `purchase` | `other` | `legacy`),
`voucher_no`, `payment_date`, `due_date` (nullable),
`payee_type` (`staff` | `vendor` | `other`),
`staff_member_id` (nullable), `payroll_run_id` (nullable),
`payslip_id` (nullable), `vendor_id` (nullable), `payee_name` (nullable),
`description` (nullable), `reference_no` (nullable), `bill_no` (nullable),
`invoice_date` (nullable), `period_year` (smallint, nullable),
`period_month` (tinyint, nullable),
`utility_type` (nullable), `consumer_no` (nullable),
`bill_amount`, `late_fee`, `discount_amount`, `subtotal`, `tax_amount`,
`other_charges`, `total_amount`, `paid_amount`, `method` (nullable),
`cheque_no` (nullable), `remarks` (nullable),
`expense_account_id` (nullable), `payable_account_id` (nullable),
`status` (`draft` | `pending_approval` | `approved` | `partial` | `paid` |
`cancelled`), `journal_entry_id` (nullable),
`prepared_by` (nullable user id), `approved_by` (nullable), `approved_at`
(nullable), `cancelled_by` (nullable), `cancelled_at` (nullable),
`cancel_reason` (nullable), `created_by` (nullable). `softDeletes`.
Unique `(campus_id, voucher_no)`. Indexes: `(campus_id, status)`,
`(campus_id, payment_date)`, `(campus_id, due_date)`, `(campus_id, category)`.
Unique `(payslip_id)` where non-null (one salary voucher per payslip).

**`payment_voucher_items`**
`id`, `payment_voucher_id`, `line_no`,
`kind` (`purchase_item` | `salary_basic` | `salary_earning` |
`salary_deduction`), `description`, `payment_category_id` (nullable),
`quantity` (nullable), `unit_price` (nullable), `discount_amount`,
`tax_amount`, `other_charges`, `amount`, `source_ref` (nullable:
`salary_component_id` or `payslip_item_id`).

**`payment_voucher_payments`** — money paid against a voucher.
`id`, `institution_id`, `campus_id`, `payment_voucher_id`, `reference`
(unique per campus), `payment_date`, `amount`, `method`, `cheque_no`
(nullable), `journal_entry_id` (nullable), `notes` (nullable),
`created_by` (nullable), `voided_at` (nullable). `softDeletes`.

Voucher numbers are category-prefixed and unique per campus:
`SAL-%06d`, `UTL-%06d`, `PUR-%06d`, `OTH-%06d`; legacy backfilled rows keep
their existing `EXP-%06d` reference. Payment references continue `PV-%06d`.
Number generation is count-based with collision checks against the new table.

## Enums

- `PaymentVoucherCategory`: `staff_salary`, `utility`, `purchase`, `other`,
  `legacy`.
- `UtilityType`: `electricity`, `gas`, `telephone`, `internet`, `water`,
  `generator_fuel`, `other`.
- `PayeeType`: `staff`, `vendor`, `other`.
- `PaymentVoucherStatus`: `draft`, `pending_approval`, `approved`, `partial`,
  `paid`, `cancelled` (each with a `label()`).
- Reuse `PaymentMethod` (`cash` | `bank_transfer` | `cheque` | `online` |
  `card` | `other`).
- **Overdue** is computed: `due_date < today` and status in
  `approved`/`partial`. It is not a stored state.

## Amount calculations

- **Salary:** `total_amount = net = basic + allowances + other additions −
  deductions − loan/advance`. Basic and the earning/deduction lines are
  snapshotted from the payslip into `payment_voucher_items`.
- **Utility:** `total_amount = bill_amount + late_fee − discount_amount`.
- **Purchase:** per item `amount = quantity × unit_price − discount_amount +
  tax_amount + other_charges` (item amount is net of the item discount);
  `subtotal = Σ item amounts`; `total_amount = subtotal − discount_amount +
  tax_amount + other_charges` where the voucher-level `discount_amount`,
  `tax_amount` and `other_charges` are additional adjustments. `paid_amount`
  cannot exceed `total_amount`.
- **Other:** `total_amount` is the entered amount.

## Voucher lifecycle

1. **Create** (any category) → `draft`. An optional amount paid supplied during
   creation is stored as a `payment_voucher_payments` row but posts nothing yet.
2. **Submit** → if an approval workflow matches, status becomes
   `pending_approval` and an `ApprovalRequest` is created; otherwise it falls
   through to approval immediately.
3. **Approve** (`finance.approve`) → posts the accrual for purchase/utility/
   other (salary posts nothing), sets `approved_by`/`approved_at`, then posts
   any pending payment rows and recalculates to `partial`/`paid`.
4. **Pay** (`mark-paid` or a direct payment) → allowed while `approved` or
   `partial`; posts `Dr payable / Cr cash|bank`, validates against the
   outstanding balance, recalculates status.
5. **Cancel/void** → reverses the voucher's journal and any payment journals,
   refuses while non-voided payments exist, and stores
   `cancelled_by`/`cancelled_at`/`cancel_reason`. Legacy vouchers reverse only
   their original journal.

## Posting (double-entry)

All postings go through the existing `JournalService` and resolve accounts per
campus from `chart_of_accounts` (config codes in `config/finance.php`).

- **Purchase / Utility / Other — approval:**
  `Dr expense_account` (the voucher's debit account; defaults from the payment
  category, overridable) ` / Cr payable_account` (vendor's payable account, else
  `vendor_payable` 2010) for `total_amount`.
- **Purchase / Utility / Other — payment:**
  `Dr payable_account / Cr cash|bank` for the payment amount. Cash uses `cash`
  (1010), every other method uses `bank` (1020). Status recalculates to
  `partial` or `paid`.
- **Salary — approval:** no journal (payroll already posted the accrual). The
  voucher records the payable against `salary_payable` (2020) for reporting.
- **Salary — payment:** `Dr salary_payable (2020) / Cr cash|bank` for the net.
- **Void/reverse:** reverse the voucher's journal and its payment journals using
  the existing `Journals::reverse` pattern; refuse to void a voucher that has
  non-voided payments until they are voided (mirrors `ExpenseService`).

## Backend services

New `PayableService` (in `App\Services\Accounting`) centralises:
`nextVoucherNo(prefix)`, `createVoucher`, `updateVoucher` (draft only),
`submitForApproval` (enters `pending_approval`, creates an `ApprovalRequest`
when a workflow matches), `approve` (calls
`ApprovalService::assertMayProceed`, posts the accrual for non-salary
categories), `cancel`, `recordPayment`, `voidPayment`, `voidVoucher`,
`recalculate`, `salaryLookups(payrollRun)`, `generateSalaryVouchers(run, ?staffId)`,
and `settlePayrollRunIfComplete(run)`.

`PayrollRunService` is adjusted so `markPaid` is no longer the settlement path:
calling `POST /v1/payroll-runs/{run}/pay` returns `409` directing to AP salary
vouchers. A run becomes `Paid` when the sum of its paid salary vouchers equals
`total_net`.

## API endpoints

All under the existing authenticated API group, gated by `finance.*`:

- `GET/POST /v1/payment-vouchers`
- `GET/PUT/DELETE /v1/payment-vouchers/{voucher}`
- `POST /v1/payment-vouchers/{voucher}/submit`
- `POST /v1/payment-vouchers/{voucher}/approve`
- `POST /v1/payment-vouchers/{voucher}/cancel`
- `POST /v1/payment-vouchers/{voucher}/mark-paid` (creates a payment row)
- `GET /v1/payment-vouchers/salary/lookups?payroll_run_id=&search=`
- `POST /v1/payment-vouchers/salary/bulk` (`payroll_run_id`)
- `GET /v1/payment-vouchers/{voucher}/pdf`
- `GET/POST /v1/payment-voucher-payments`; `POST /{payment}/void`
- `GET/POST /v1/payment-categories`; `PUT/DELETE /{category}`
- `GET /v1/payable-reports/summary` — dashboard cards
- `GET /v1/payable-reports/payables` — filterable list + totals
- `GET /v1/payable-reports/campus-wise`
- `GET /v1/payable-reports/month-wise`
- `GET /v1/payable-reports/outstanding`
- `GET /v1/payable-reports/payables/export?format=pdf|xlsx|csv`

Report filters: campus, category, status (draft/pending/approved/partial/paid/
overdue/cancelled), month, year, date-from, date-to, staff member, vendor,
utility type, voucher number, search. Totals: total payable, total paid, total
outstanding.

## Frontend (web)

- **Finance hub** gains an Accounts Payable card; **nav** gains an Accounts
  Payable group (Dashboard, Generate Payment Voucher, Payment Categories,
  Reports) and retires the expenses / expense-payments / expense-categories
  entries.
- **Generate Payment Voucher**: a category chooser (four cards), then the
  matching form.
  - Salary: select an approved payroll run, then a staff member (search
    within the run) or "generate for all staff"; auto-fills basic, allowances,
    deductions, loan/advance and net from the payslip; shows the calculation
    `Net = Basic + Allowances + Other − Deductions − Loan/Advance`.
  - Utility: campus, utility type, provider, consumer/meter no, bill no,
    billing month/year, due date, bill amount, late fee, discount, auto total;
    payment method + cheque/transaction no.
  - Purchase: vendor (with inline quick-create dialog), invoice no/date,
    repeatable item grid (item, category, qty, unit price, discount, tax, other
    charges), live subtotal → grand total, amount paid, remaining payable.
  - Other: description, category (from `payment_categories`), payee, reference,
    month/year, amount, method, cheque no.
  - Shared footer: prepared by, approved by, remarks, status; actions Save
    Draft, Generate/Approve, Print, Download PDF, Edit, Cancel, Mark as Paid.
- **Reports**: summary cards, filterable payables table with auto totals, and
  campus-wise / month-wise / outstanding views; CSV, Excel, PDF and Print.
- **Voucher detail/print**: the spec's professional voucher layout (school +
  campus name, title, voucher no, date, type, payee, description, month/year,
  amount, method, reference, remarks, Prepared/Checked/Approved/Received
  signature areas) plus the actions above.
- Inline vendor quick-create dialog mirrors `FeeHeadQuickCreateDialog`.

## Permissions

Reuse `finance.view` (read/search/reports/print), `finance.create`
(vouchers/payments/categories), `finance.edit` (draft edits), `finance.delete`
(cancel/draft delete), `finance.approve` (approve/reject/void). Platform admins
have no `finance.*` by design. Approval rules use `ApprovalService`
(entity key `payment_voucher`) so self-approval is blocked when a workflow
matches. Created/Modified/Approved/Cancelled audit fields are stored on the
voucher and Spatie activitylog records changes.

## Migration and backfill (non-destructive)

Ordered migration:

1. Create `payment_categories`, `payment_vouchers`, `payment_voucher_items`,
   `payment_voucher_payments`.
2. Seed default `payment_categories` per campus (idempotent).
3. Backfill `expenses` → `payment_vouchers` (`category = legacy`,
   `voucher_no = reference`, dates, vendor/payee, bill no, memo → description,
   total/paid, status mapped `draft|approved|partial|paid|void→cancelled`,
   `journal_entry_id` carried over, `created_by`/`approved_by` carried over).
4. Backfill `expense_lines` → `payment_voucher_items`
   (`kind = purchase_item`).
5. Backfill `expense_payments` → `payment_voucher_payments` (reference, date,
   amount, method, `journal_entry_id`, `voided_at`).

Idempotent and re-runnable. Production runs migrations only (the deploy script
never seeds or refreshes).

## Dependencies

Add to `apps/api/composer.json` (lock updated and committed):

- `barryvdh/laravel-dompdf` — voucher PDF and report PDF.
- `maatwebsite/excel` (with `phpoffice/phpspreadsheet`) — Excel exports.

The deploy script runs `composer install --no-dev`, so the VPS installs from
the committed lock file.

## Testing and verification

- `tsc --noEmit` and `eslint` clean in `apps/web`; Laravel `pint` and the test
  suite green in `apps/api`.
- Migration/backfill verified against the local `eis` database: voucher and
  payment counts and totals reconcile with `expenses`/`expense_payments`, and
  no new `journal_entries` are created by the backfill.
- API flow tests (curl) for each category: create draft, approve, partial
  payment, full payment, void; salary bulk generate from an approved payroll
  run then settle it and confirm the run flips to `Paid`; PDF/XLSX/CSV export
  smoke.
- Playwright smoke on `http://localhost:3100` as `campusadmin.aln-lhr`:
  open the AP hub, generate one voucher of each category, run a report with
  filters, export CSV/PDF, print a voucher.
- Deploy via `/root/deploy-edu.sh`; verify health and the new routes on
  production.

## Risks / notes

- Legacy `EXP-` vouchers appear in AP reports as `legacy` category and are never
  re-posted; void of a legacy voucher only reverses its original journal.
- Payroll and AP salary settlement must stay mutually exclusive; the payroll
  `pay` endpoint is disabled to prevent double posting.
- Voucher/account resolution fails loudly with a 422 when a required
  `chart_of_accounts` code is missing for a campus.
- Currency is PKR; formatting via `formatCurrency`.
- Existing `/v1/finance/reports/payables` is left in place for compatibility;
  the new AP reports use `/v1/payable-reports/*`.

## Non-goals

- No changes to the AR module.
- No re-posting of legacy GL entries.
- No file attachments on vouchers.
- No multi-currency support.
