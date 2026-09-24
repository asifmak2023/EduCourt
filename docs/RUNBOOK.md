# Runbook

## Prerequisites

- PHP 8.2 with pdo_mysql, mbstring, xml, curl, zip, bcmath, gd, intl
- Composer 2
- Node.js 20+ and pnpm
- MySQL 8 or MariaDB 10.11

## API (apps/api)

Create the database and user:

```bash
mysql -uroot -e "CREATE DATABASE eis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -e "CREATE DATABASE eis_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -e "CREATE USER 'eis'@'127.0.0.1' IDENTIFIED BY 'eis_local_pw';"
mysql -uroot -e "GRANT ALL PRIVILEGES ON eis.* TO 'eis'@'127.0.0.1';"
mysql -uroot -e "GRANT ALL PRIVILEGES ON eis_testing.* TO 'eis'@'127.0.0.1';"
```

Install and prepare:

```bash
cd apps/api
cp .env.example .env
php artisan key:generate
composer install
php artisan migrate:fresh --seed
```

Run the API:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Run tests and code style:

```bash
php artisan test
./vendor/bin/pint
```

Seed credentials (development only):

- Super User / product owner: superadmin@demo-eis.test / password
- Campus admin: campusadmin@demo-eis.test / password
- Teacher: teacher@demo-eis.test / password

The demo seeder also provisions a Main Campus academic year (2026-2027) with
terms, stages, classes, sections, subjects, a sample teaching assignment and a
few calendar events. It also seeds a fiscal year, a default per-campus chart of
accounts, two posted sample journal entries, fee heads and a Class 1 fee plan
with installment schedule, plus two demo students with guardians and
enrollments. Finally it raises per-student fee vouchers for the class (with a
discount for one student) and records one cash receipt, posting both to the
ledger. It also approves a campus operating budget for the fiscal year, and
seeds three vendors, five expense categories and three vendor bills (one paid,
one partially paid, one outstanding) with their settlements. It also creates a
bank account and a petty cash account, plus a completed bank reconciliation for
the bank account.

Finance quick check (campus admin token):

```bash
# Log in and capture the token
TOKEN=$(curl -s -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"email":"campusadmin@demo-eis.test","password":"password"}' \
  http://127.0.0.1:8000/api/v1/auth/login | jq -r .token)

# List accounts and confirm the trial balance nets to zero
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/chart-of-accounts
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/finance/reports/trial-balance
```

Budget quick check (campus admin token):

```bash
# List budgets and compare the seeded one against actuals
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/budgets
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/budget-vs-actual?budget_id=1"
```

Expenses and payables quick check (campus admin token):

```bash
# List vendors, categories and bills
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/vendors
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/expense-categories
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/expenses

# Payables aging and approved spend by category
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/payables?as_of=2026-09-30"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/expenses?from=2026-07-01&to=2026-09-30"

# Create a draft bill, approve it, then settle part of it
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"vendor_id":1,"expense_date":"2026-09-20","bill_no":"INV-9","lines":[{"expense_category_id":1,"amount":5000}]}' \
  http://127.0.0.1:8000/api/v1/expenses
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/expenses/4/approve
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"expense_id":4,"payment_date":"2026-09-25","amount":2000,"method":"cash"}' \
  http://127.0.0.1:8000/api/v1/expense-payments
```

Bank, cash book and reconciliation quick check (campus admin token):

```bash
# List bank/cash accounts and reconciliations
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/bank-accounts
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/bank-reconciliations

# Per-account statement with a running balance, and a summary of all accounts
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/cash-book?bank_account_id=1&from=2026-07-01&to=2026-09-30"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/cash-book?to=2026-09-30"

# Save a draft reconciliation snapshot; completing it requires the entered
# closing balance to match the computed book balance
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"bank_account_id":1,"statement_date":"2026-10-31","statement_closing_balance":0}' \
  http://127.0.0.1:8000/api/v1/bank-reconciliations
```

Fee billing quick check (campus admin token):

```bash
# List the seeded vouchers and receipts
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/fee-vouchers
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/fee-payments

# Re-run generation for the Class 1 plan (existing vouchers are skipped)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"academic_year_id":1,"class_room_id":1,"fee_plan_id":1}' \
  http://127.0.0.1:8000/api/v1/fee-vouchers/generate

# Defaulter aging, per-class collection summary and a dated collection report
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/fee-reports/defaulters?as_of=2026-09-30"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/fee-reports/classes/summary
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/fee-reports/collection?from=2026-07-01&to=2026-07-31"

# Apply a late fee to an overdue voucher (seeded plan: flat 500, grace 7)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/fee-vouchers/1/late-fee

# Record an advance, allocate it to a voucher, then refund part of it
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"payment_date":"2026-09-24","amount":1000,"method":"cash"}' \
  http://127.0.0.1:8000/api/v1/fee-payments
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fee_voucher_id":2}' \
  http://127.0.0.1:8000/api/v1/fee-payments/2/apply
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fee_payment_id":2,"refund_date":"2026-09-24","amount":500,"method":"cash"}' \
  http://127.0.0.1:8000/api/v1/fee-refunds
```

## Web (apps/web)

```bash
cd apps/web
cp .env.example .env.local
pnpm install
pnpm dev
```

## Mobile (apps/mobile)

```bash
cd apps/mobile
cp .env.example .env
pnpm install
pnpm start
```

## Operational notes

- Enable two-factor enforcement only after the enrolment flow is available:
  set `ENFORCE_TWO_FACTOR=true`.
- Back up the database before running migrations in production.
- Never edit or delete posted financial entries; use reversals.
