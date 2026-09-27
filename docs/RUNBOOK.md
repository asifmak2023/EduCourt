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

Absence notification quick check (campus admin token):

```bash
# Mark a student absent; a notification is queued for the primary guardian
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"attendance_date":"2026-09-21","status":"absent","academic_year_id":1}' \
  http://127.0.0.1:8000/api/v1/attendance/students

# Backfill for a whole day/class, then list and send
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"attendance_date":"2026-09-21","class_room_id":1}' \
  http://127.0.0.1:8000/api/v1/notifications/queue-absences
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/notifications?type=absence"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -X POST http://127.0.0.1:8000/api/v1/notifications/1/send
```

Mid-year fee proration quick check (campus admin token):

```bash
# Bill only the installments a late joiner is liable for (past ones skipped,
# the active period prorated by remaining days)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"academic_year_id":1,"class_room_id":1,"fee_plan_id":1,"student_id":1,"join_date":"2026-08-01"}' \
  http://127.0.0.1:8000/api/v1/fee-vouchers/generate-prorated
```

Other income quick check (campus admin token):

```bash
# Create an income source (donations post to account 4060 unless overridden)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alumni Donations","code":"DON-01","category":"donation"}' \
  http://127.0.0.1:8000/api/v1/income-sources

# Record a receipt; it posts Dr Cash/Bank, Cr income account
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"income_source_id":1,"received_on":"2026-08-15","amount":25000,"method":"cash","payer_name":"Old Boys Association"}' \
  http://127.0.0.1:8000/api/v1/other-incomes

# Void a receipt (reverses the ledger)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"memo":"Recorded twice"}' \
  -X POST http://127.0.0.1:8000/api/v1/other-incomes/1/void
```

Tax quick check (campus admin token):

```bash
# Define a tax rule, then a period return (tax is derived from the rate)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sales Tax 5%","code":"ST5","type":"sales_tax","applies_to":"all","rate":5}' \
  http://127.0.0.1:8000/api/v1/tax-rules
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"tax_rule_id":1,"period_start":"2026-07-01","period_end":"2026-07-31","due_date":"2026-08-15","taxable_amount":100000}' \
  http://127.0.0.1:8000/api/v1/tax-returns

# File, then pay (Dr Tax Payable, Cr Cash/Bank); list overdue returns
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"reference":"FBR-JUL-2026"}' \
  -X POST http://127.0.0.1:8000/api/v1/tax-returns/1/file
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"method":"cash","paid_on":"2026-08-10"}' \
  -X POST http://127.0.0.1:8000/api/v1/tax-returns/1/pay
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  'http://127.0.0.1:8000/api/v1/tax-returns?overdue=1'
```

Approval workflow quick check (campus admin token):

```bash
# Require finance-head sign-off for expenses of 10,000 or more
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Expense control","code":"EXP-10000","entity_type":"expense","min_amount":10000,"steps":[{"sequence":1,"label":"Finance sign-off","required_role":"finance_head"}]}' \
  http://127.0.0.1:8000/api/v1/approval-workflows

# Submit an approval for a draft expense, then approve it as a finance head
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"entity_type":"expense","entity_id":1}' \
  http://127.0.0.1:8000/api/v1/approvals
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"comment":"Budget allows"}' \
  -X POST http://127.0.0.1:8000/api/v1/approvals/1/approve
```

Examination quick check (campus admin token):

```bash
# Create an exam type, a grade scale, an exam and a paper
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Final Term","code":"FIN","weightage":60}' \
  http://127.0.0.1:8000/api/v1/exam-types
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Default Scale","code":"DEF","is_default":true,"items":[{"grade":"A","min_percentage":80,"max_percentage":100,"points":4},{"grade":"B","min_percentage":60,"max_percentage":79.99,"points":3},{"grade":"F","min_percentage":0,"max_percentage":59.99,"points":0}]}' \
  http://127.0.0.1:8000/api/v1/grade-scales

# Enter marks for a paper, then read the result card and class merit list
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"exam_paper_id":1,"marks":[{"student_id":1,"marks_obtained":90}]}' \
  http://127.0.0.1:8000/api/v1/exam-marks/bulk
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/exams/1/students/1/result-card
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/exams/1/merit-list?class_room_id=1"

# Publish an exam (needs exam.approve)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -X POST \
  http://127.0.0.1:8000/api/v1/exams/1/publish

# Result analysis: class, subject, teacher, year-on-year
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/exams/1/analysis/class?class_room_id=1"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/exams/1/analysis/subject?subject_id=1"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/exams/1/analysis/teachers
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/exams/analysis/year-on-year?exam_type_id=1"
```

HR quick check (campus admin token):

```bash
# Create a department and a designation with a job description
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Science","code":"SCI"}' \
  http://127.0.0.1:8000/api/v1/departments
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Senior Teacher","code":"ST","department_id":1,"job_description":"Teach senior science classes."}' \
  http://127.0.0.1:8000/api/v1/designations

# Register a staff member (employee number auto-assigned), then headcount
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"first_name":"Ayesha","last_name":"Malik","joining_date":"2026-09-01","employment_type":"permanent"}' \
  http://127.0.0.1:8000/api/v1/staff
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/staff-reports/headcount
```

Payroll quick check (finance head token):

```bash
# Define salary components and a staff salary structure
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"House Allowance","code":"HRA","type":"earning","calculation":"fixed","default_amount":5000}' \
  http://127.0.0.1:8000/api/v1/salary-components
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"staff_member_id":1,"basic_salary":50000,"effective_from":"2026-01-01","items":[{"salary_component_id":1,"amount":5000}]}' \
  http://127.0.0.1:8000/api/v1/staff-salaries

# Create, generate, approve (posts to the ledger) and pay a monthly run
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"period":"2026-09"}' \
  http://127.0.0.1:8000/api/v1/payroll-runs
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -X POST \
  http://127.0.0.1:8000/api/v1/payroll-runs/1/generate
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -X POST \
  http://127.0.0.1:8000/api/v1/payroll-runs/1/approve
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"payment_method":"bank_transfer"}' \
  http://127.0.0.1:8000/api/v1/payroll-runs/1/pay
```

Reporting quick check (campus admin token):

```bash
# Campus dashboard snapshot and progress report
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/reports/campus-dashboard
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/reports/progress?academic_year_id=1"

# Attendance rate, exam results, staff and financial summaries
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/reports/attendance?from=2026-09-01&to=2026-09-30"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/reports/results/1
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/reports/staff
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/reports/financial

# Per-student year-by-year counselling analysis
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/reports/students/1/yearly

# Cross-institution overview (super user token)
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/reports/platform-overview
```

Canteen quick check (canteen manager token):

```bash
# Create a supplier and a menu item
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Fresh Foods","phone":"0300-1234567"}' \
  http://127.0.0.1:8000/api/v1/canteen/suppliers
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Chicken Patty","code":"PAT-01","price":60,"cost_price":35,"reorder_level":10}' \
  http://127.0.0.1:8000/api/v1/canteen/items

# Receive stock, then ring up a cash sale
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"canteen_item_id":1,"type":"purchase","quantity":100,"unit_cost":35}' \
  http://127.0.0.1:8000/api/v1/canteen/stock-entries
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"payment_method":"cash","items":[{"canteen_item_id":1,"quantity":2}]}' \
  http://127.0.0.1:8000/api/v1/canteen/sales

# Top up a student wallet and pay from it
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/canteen/students/1/wallet
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"amount":500,"method":"cash"}' \
  http://127.0.0.1:8000/api/v1/canteen/wallets/1/top-up
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"payment_method":"wallet","items":[{"canteen_item_id":1,"quantity":1}]}' \
  http://127.0.0.1:8000/api/v1/canteen/sales

# Reports
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/canteen/reports/daily?from=2026-09-01&to=2026-09-30"
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/canteen/reports/profit-loss
```

Student affairs quick check (student affairs officer token):

```bash
# Create a club and add a member
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Science Society","code":"SCI","category":"academic"}' \
  http://127.0.0.1:8000/api/v1/student-affairs/clubs
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"role":"member"}' \
  http://127.0.0.1:8000/api/v1/student-affairs/clubs/1/members

# Raise and resolve a complaint
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Broken desk","description":"Desk in room 5 is broken","priority":"high"}' \
  http://127.0.0.1:8000/api/v1/student-affairs/complaints
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"resolution":"Desk replaced"}' \
  http://127.0.0.1:8000/api/v1/student-affairs/complaints/1/resolve
```

Counselling quick check (counsellor token; the confidentiality permission is separate):

```bash
# Record a session and list completed sessions
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"session_date":"2026-09-12","type":"individual","status":"completed","summary":"Study plan"}' \
  http://127.0.0.1:8000/api/v1/student-affairs/counselling
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8000/api/v1/student-affairs/counselling?status=completed"
```

Sports quick check (sports director token):

```bash
# Create a sport, a team and add a squad member
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Cricket","code":"CRICKET","category":"outdoor","budget":20000}' \
  http://127.0.0.1:8000/api/v1/sports
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"sport_id":1,"name":"Senior XI","age_group":"U-17"}' \
  http://127.0.0.1:8000/api/v1/sports/teams
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"student_id":1,"position":"Batsman"}' \
  http://127.0.0.1:8000/api/v1/sports/teams/1/members

# Schedule a fixture and record the result
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"sport_id":1,"opponent":"City School","fixture_date":"2026-10-05"}' \
  http://127.0.0.1:8000/api/v1/sports/fixtures
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"our_score":180,"opponent_score":150}' \
  http://127.0.0.1:8000/api/v1/sports/fixtures/1/result

# Check eligibility and read the summary report
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/sports/1/students/1/eligibility
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/sports/reports/summary
```

IT department quick check (IT administrator token):

```bash
# Register an asset and assign it
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Dell Latitude","asset_tag":"IT-0001","category":"laptop","cost":900}' \
  http://127.0.0.1:8000/api/v1/it/assets
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"assigned_to":1}' \
  http://127.0.0.1:8000/api/v1/it/assets/1/assign

# Raise, assign and resolve a helpdesk ticket
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Printer offline","description":"Floor 2 printer offline","priority":"high"}' \
  http://127.0.0.1:8000/api/v1/it/tickets
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"assigned_to":1}' \
  http://127.0.0.1:8000/api/v1/it/tickets/1/assign
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"resolution":"Restarted spooler"}' \
  http://127.0.0.1:8000/api/v1/it/tickets/1/resolve

# File a change request and approve it, then read the operations summary
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Firewall upgrade","description":"Firmware upgrade","risk":"high","status":"submitted"}' \
  http://127.0.0.1:8000/api/v1/it/change-requests
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"approved"}' \
  http://127.0.0.1:8000/api/v1/it/change-requests/1/decide
curl -s -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/it/reports/summary
```

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
