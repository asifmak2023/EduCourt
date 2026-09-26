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
  the bank account. It also seeds a monthly set of accounting periods for the
  fiscal year (the first month closed, the rest open) and an asset and liability
  register with depreciating fixed assets and two outstanding loans.

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

Account security quick check (campus admin token):

```bash
# Request a password reset link (delivered via the configured mailer)
curl -s -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"email":"campusadmin@demo-eis.test"}' \
  http://127.0.0.1:8000/api/v1/auth/forgot-password

# List active sessions/devices and revoke every other session
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/auth/tokens
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X DELETE http://127.0.0.1:8000/api/v1/auth/tokens

# Change the account password (other sessions are signed out)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"current_password":"password","password":"new-password-123","password_confirmation":"new-password-123"}' \
  -X PUT http://127.0.0.1:8000/api/v1/auth/password
```

Password reset and email-verification links point at `FRONTEND_URL` (defaults to
`APP_URL`), so the web client owns the reset and verification screens.

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

Asset, liability and period quick check (campus admin token):

```bash
# Registers with computed depreciation / outstanding balances
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/assets
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/liabilities
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/asset-register?as_of=2026-09-30"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/finance/reports/liability-register

# Accounting periods for the seeded fiscal year (first month is closed)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/accounting-periods

# Surplus/deficit and the whole-school consolidated statement
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/surplus-deficit?fiscal_year_id=1"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/finance/reports/consolidated?fiscal_year_id=1"
```

Generate periods for a fiscal year, then close and lock a period. Posting into
a closed or locked period is rejected.

```bash
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fiscal_year_id":1}' \
  http://127.0.0.1:8000/api/v1/accounting-periods/generate
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/accounting-periods/2/close
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/accounting-periods/2/lock
```

Timetable generation quick check (campus admin token):

```bash
# Preview a generated timetable without writing anything
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"academic_year_id":1,"days":[1,2,3,4,5],"dry_run":true}' \
  http://127.0.0.1:8000/api/v1/timetable/generate

# Generate draft slots (replace clears the scope first)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"academic_year_id":1,"days":[1,2,3,4,5],"replace":true}' \
  http://127.0.0.1:8000/api/v1/timetable/generate

# Clear unpublished slots in a scope (published ones are kept)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -X DELETE -d '{"academic_year_id":1}' \
  http://127.0.0.1:8000/api/v1/timetable/generate
```

Substitute cover quick check (campus admin token):

```bash
# Seeded cover: Campus Admin covers slot 1 (Monday Period 1) on 2026-09-21
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'X-Campus-Id: 1' \
  http://127.0.0.1:8000/api/v1/substitute-assignments

# Schedule a substitute (date must match the slot weekday)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'X-Campus-Id: 1' -H 'Content-Type: application/json' \
  -d '{"timetable_slot_id":1,"substitute_user_id":2,"date":"2026-09-28","reason":"Teacher on leave"}' \
  http://127.0.0.1:8000/api/v1/substitute-assignments

# Cancel a cover assignment
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'X-Campus-Id: 1' \
  -X POST http://127.0.0.1:8000/api/v1/substitute-assignments/1/cancel
```

Admissions quick check (campus admin token):

```bash
# Seeded applications: APP-00001 approved, APP-00002 under review, APP-00003 enquiry
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/admissions

# Submit an enquiry for review, approve it, then enroll into a class and section
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/admissions/3/submit
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/admissions/3/approve
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"academic_year_id":1,"class_room_id":1,"section_id":1,"roll_number":"9"}' \
  -X POST http://127.0.0.1:8000/api/v1/admissions/3/enroll

# Upload and download an admission document
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -F type=birth_certificate -F title='Birth Certificate' \
  -F file=@/path/to/birth.pdf \
  http://127.0.0.1:8000/api/v1/admissions/1/documents
curl -s -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/admissions/1/documents/1/download
```

Enrollment creates the student (with an auto admission number), links the
guardian and places the student in the selected class and section.

Attendance quick check (campus admin token):

```bash
# Seeded student attendance for five days, plus staff attendance
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/attendance/students

# Class summary: total, boys, girls, present, leave, absent
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/attendance/students/report?from=2026-09-21&to=2026-09-25"

# Mark a class roster in one call
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"attendance_date":"2026-09-26","class_room_id":1,"section_id":1,"records":[{"student_id":1,"status":"present"},{"student_id":2,"status":"absent"}]}' \
  http://127.0.0.1:8000/api/v1/attendance/students/bulk

# Staff attendance and its report
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/attendance/staff
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/attendance/staff/report?from=2026-09-21&to=2026-09-25"

# Leave requests; approving one writes leave attendance for every day in range
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/leave-requests
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"decision_note":"Approved"}' \
  -X POST http://127.0.0.1:8000/api/v1/leave-requests/1/approve
```

Scholarship quick check (campus admin token):

```bash
# Seeded scholarships: MERIT25 (25% merit) and NEED5000 (fixed 5000)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/scholarships

# Seeded awards: ADM-00001 holds MERIT25, ADM-00002 holds NEED5000
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/scholarship-awards

# Award a scholarship with a per-student value override
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"scholarship_id":1,"student_id":2,"academic_year_id":1,"value_override":5000}' \
  http://127.0.0.1:8000/api/v1/scholarship-awards

# Revoke an award
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/scholarship-awards/1/revoke
```

Fee voucher generation merges active scholarship discounts automatically; pass
`apply_scholarships=false` to disable, and explicit `discounts` always take
precedence over scholarship-derived amounts.

Concession policy quick check (campus admin token):

```bash
# Seeded policies: SIB10 (10% sibling), STAFF50 (50% staff ward, capped 5000)
# and NEED500 (fixed 500, requires approval)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/concession-policies

# Create a rule-based policy (criteria are matched against student attributes)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sibling 10%","code":"SIB10","type":"sibling","discount_type":"percentage","value":10,"criteria":{"min_siblings":1}}' \
  http://127.0.0.1:8000/api/v1/concession-policies

# Seeded grants: ADM-00001 holds an approved NEED500, ADM-00002 a pending one
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/concessions

# Request and approve a concession for a policy that requires approval
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":2,"academic_year_id":1,"concession_policy_id":3}' \
  http://127.0.0.1:8000/api/v1/concessions
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/concessions/2/approve
```

Voucher generation applies scholarships and concessions together; pass
`apply_concessions=false` to disable concessions. Non-stackable policies
contribute only their largest value, stackable ones add on top, and the combined
annual discount is capped at the annual gross. Explicit `discounts` win.

Student history quick check (campus admin token):

```bash
# Consolidated academic timeline, attendance rollup and fee/scholarship position
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/students/1/history
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

# Refunds follow an approval workflow; the ledger is only touched on approval
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/fee-refunds/1/approve
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"reason":"Duplicate request"}' \
  -X POST http://127.0.0.1:8000/api/v1/fee-refunds/1/revoke
```

Fine quick check (campus admin token):

```bash
# List seeded fine rules and fines (one pending, one applied)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/fine-rules
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/fines

# Raise a fine, then apply it to the student's outstanding voucher
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"fine_rule_id":2,"academic_year_id":1,"issued_on":"2026-09-26"}' \
  http://127.0.0.1:8000/api/v1/fines
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/fines/3/apply

# Waive a pending fine, or revoke an applied one (reverses the ledger)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"waived_reason":"First offence"}' \
  -X POST http://127.0.0.1:8000/api/v1/fines/3/waive
```

Fee reminder quick check (campus admin token):

```bash
# Queue reminders for overdue defaulters (email by default; sms uses guardian phone)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"channel":"email","as_of":"2026-09-26"}' \
  http://127.0.0.1:8000/api/v1/fee-reminders

# List queued reminders and send one (or all pending)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/fee-reminders
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/fee-reminders/1/send
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}' \
  -X POST http://127.0.0.1:8000/api/v1/fee-reminders/send
```

Reminder delivery uses the `REMINDER_GATEWAY` driver (`log` by default, so
reminders are written to `storage/logs/laravel.log`). Generation is idempotent
per student per day; pass `"force":true` to re-queue.

Online payment quick check (campus admin token):

```bash
# List seeded payment intents (PAY-000001 pending on the manual gateway)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/online-payments

# Start a checkout for an outstanding voucher and read the checkout_url
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"fee_voucher_id":2,"amount":500}' \
  http://127.0.0.1:8000/api/v1/online-payments

# Poll the status by reference
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/online-payments/status?reference=PAY-000001"
```

Webhooks are unauthenticated but verified with an HMAC-SHA256 signature of the
raw body using `PAYMENT_WEBHOOK_SECRET`. Confirmation is idempotent and posts a
fee payment that settles the voucher.

```bash
# Post a paid webhook for a reference (sign the exact raw body)
BODY='{"reference":"PAY-000001","status":"paid","amount":500}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PAYMENT_WEBHOOK_SECRET" | awk '{print $2}')
curl -s -H 'Accept: application/json' -H "X-Payment-Signature: $SIG" \
  -H 'Content-Type: application/json' -d "$BODY" \
  http://127.0.0.1:8000/api/v1/webhooks/payments/manual
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

For a browser preview (no simulator required), install the Expo web runtime and
start the web target:

```bash
cd apps/mobile
npx expo install react-dom react-native-web @expo/metro-runtime
npx expo start --web --port 8081
```

## Operational notes

- Enable two-factor enforcement only after the enrolment flow is available:
  set `ENFORCE_TWO_FACTOR=true`.
- Back up the database before running migrations in production.
- Never edit or delete posted financial entries; use reversals.
