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
  per-device session listing/revocation. Staff can enrol an authenticator app
  (TOTP) with single-use recovery codes and a password-then-code login
  challenge; admins, finance and HR can be required to enrol before signing
  in. Staff single sign-on is available
  through per-institution OIDC providers (authorization code with PKCE,
  account linking and optional just-in-time provisioning).
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
  balance sheet. Non-fee income is covered by configurable income sources
  (donations, sales, commissions, exam fees, charges) that post receipts to the
  matching income account, with per-source overrides and void/reversal. Tax
  handling adds configurable tax rules and per-period tax returns whose filing
  and payment lifecycle settles tax payable to the ledger and tracks required
  documents. Configurable approval workflows close the control loop: workflows
  matched by entity type and amount require sign-off by a user, role or
  permission, and expense approval is gated until the applicable workflow is
  approved.
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
  delivered through a pluggable gateway (log driver by default). Student
  records are rounded out with a per-student document store (type/size/MIME
  validation, verify/download and a pluggable virus scanner defaulting to a
  no-op driver with opt-in ClamAV) and conduct/incident records (category,
  severity, status, resolution) that feed the consolidated student history.
  Attendance now closes the loop with parents: marking a student absent
  automatically queues a primary-guardian notification with a queue/send/cancel
  lifecycle, bulk backfill and same-day dedupe through a pluggable gateway.
  Mobile clients can capture attendance offline and sync batches with
  client-UUID idempotency, capture-time conflict resolution and per-batch
  receipts.
  Curriculum delivery adds per-class/subject syllabus units, class book lists and
  lesson plans with a draft/submitted/approved workflow, and mid-year fee
  proration bills late joiners only for the installments they are liable for.
  Examinations are delivered: weighted exam types, exams per academic year/term,
  per-class papers with date sheets, rooms and invigilation duties, bulk marks
  entry, campus grade scales and derived result cards and merit lists, plus
  result analysis by class, subject, teacher and year-on-year, and moderation
  (grace marks/scaling), re-evaluation and supplementary exam workflows that
  keep moderated marks alongside the originals. For college and university
  campuses a term/semester credit-hour model adds course registration with
  credit hours plus credit-weighted term GPA and cumulative transcripts. HR adds a staff
  register with departments, designations and job descriptions, a per-staff
  document store and headcount/movement reports, with configurable salary
  components, per-staff salary structures, incentives/rewards/deductions and
  monthly payroll runs whose approval and payment post to the ledger. Reporting
  and analytics close the loop: a campus dashboard, progress, attendance, exam
  result, staff, per-student year-by-year counselling, financial and payroll
  reports for campus users, plus a cross-institution platform overview for the
  Super User. Operations begin with the canteen: suppliers, a menu with stock
  tracking and low-stock flags, purchases/adjustments/wastage, POS billing by
  cash, wallet or credit, student wallets with top-ups, daily limits and
  adjustments, hygiene checklists, and daily/item-wise/profit-loss/wallet
  reports, all posting to the double-entry ledger. Student affairs adds clubs
  and memberships, events with participants, certificate issuance, health and
  welfare records, alumni profiles, student council terms, a complaint desk
  with assignment/resolution workflow, and confidential counselling sessions
  restricted behind a dedicated permission. Sports adds a catalogue with age
  and attendance eligibility checks, teams and squads, training sessions,
  fixtures with automatic win/loss/draw results, achievements by level,
  equipment stock movements and a campus sports summary report. IT delivers an
  asset register with assignment history, a helpdesk with priority-based SLAs
  and an open/overdue queue, change requests with an approval workflow, backup
  logs, portal and system uptime monitoring, and a campus IT operations summary.
  Support modules add circulars with a publish/archive lifecycle, a front-office
  visitor register with check-in/check-out, a parent-teacher meeting scheduler
  with capacity-limited slots and bookings, a general stores inventory with
  stock movements and low-stock reporting, a library with issuing, returns and
  overdue fines, labs with equipment registers and clash-free bookings,
  transport with vehicles, routes, stops and allocations, and hostels with
  rooms, occupancy-tracked allocations and an outpass approval workflow.

## Web application

The backend above is the complete API layer. The Next.js web client is being
built on top of it, one surface at a time:

- Delivered: authentication (password with a two-factor challenge step), a
  permission-filtered application shell with sidebar navigation, role-aware
  dashboards (platform overview for the Super User, campus dashboard for campus
  roles, personal workspace for teachers), and students, admissions and fee
  voucher lists.
- Delivered: student records (create with guardians and an optional first
  enrollment, edit profile and guardians, view detail and enrollment history,
  withdraw/transfer) and admission workflow (create/edit applications, submit
  for review, approve, reject with a reason, and enroll into a student record
  from the application detail page).
- Delivered: fee billing (voucher list with status filter and search, voucher
  detail with fee-head breakdown and recorded payments, record a receipt against
  a voucher, apply a late fee, void a voucher, and a payment list plus receipt
  view with payment void).
- Delivered: finance ledger (chart of accounts with create/edit and per-account
  ledger and running balance, journal entries with draft creation, posting and
  reversal, and a trial balance report).
- Delivered: expenses and payables (expense list with search and filters, draft
  create/edit, approve, void, per-expense lines and recorded payments with an
  outstanding balance, expense payment view with void, plus vendor and expense
  category masters).
- Delivered: budgeting (budget list with name search, status and fiscal-year
  filters, draft create/edit with multi-line allocation per account, an approve
  action that locks the plan, and a per-budget detail page showing the planned
  lines alongside a budget-vs-actual comparison with variance and utilization).
- Delivered: academic structure (a hub linking to academic years with terms,
  stages, classes, sections, subjects, periods and rooms, each with search and
  filters, create, edit and archive).
- Delivered: timetable (weekly grid by class, by teacher or for the signed-in
  user with academic-year and term filters, publish/unpublish of class
  timetables, an auto-generation panel with dry run, and timetable slot
  management with per-slot create and edit).
- Delivered: class subject allocation and teaching assignments (map subjects
  to classes per academic year, then assign a teacher to each mapped subject
  with a workload showing in the weekly periods).
- Delivered: attendance (daily student registers with date, class, section and
  status filters plus a bulk marking sheet, a class-summary attendance report,
  staff attendance records with a bulk marking sheet and a per-employee report,
  and staff leave requests with create, detail, approve, reject and cancel).
- Delivered: exams and results (exam-type and grade-scale masters, exam
  scheduling with a publish action, exam papers per class and subject, a marks
  entry sheet with absent flags, a class merit list, and per-student result
  cards with subject breakdown, grade and pass/fail outcome).
- Delivered: exam workflows and analytics (moderations with grace marks and
  scaling plus approve/apply/reject, re-evaluation requests with a review that
  revises marks, supplementary registrations driven by a failed-students
  eligibility lookup, invigilation duty assignment and editing, and a result
  analysis workspace covering class performance, a subject across classes,
  teacher achievement and year-on-year comparison).
- Delivered: credits and GPA (term course registrations with credit hours,
  student/term/subject/status filters, drop and delete, plus a term GPA view
  with a credit-weighted subject breakdown and a cumulative transcript with a
  per-term breakdown).
- Delivered: curriculum (syllabus units sequenced per class and subject with
  period estimates, class book lists with a required flag, and lesson plans with
  full planning fields plus a draft/submitted/approved workflow where approval
  is a dedicated action).
- Delivered: scholarships (concession schemes with merit/need/sports types,
  percentage or fixed discounts, sponsor and active state, plus student awards
  with an optional value override, a duplicate guard per academic year, and a
  revoke action that preserves the record).
- Delivered: promotions (select a source academic year and class, load its
  active students, choose a destination year, class and optional section, flag
  any student to repeat, and promote the cohort in one action).
- Delivered: library (a book catalogue with copies, availability, shelf and
  price, issue and return of copies to students or staff with loan periods and
  automatic overdue fines, and a summary report with circulation, overdue and
  fines collected alongside the overdue loan list).
- Delivered: labs (a lab register with type, location, capacity and in-charge
  staff, an equipment list per lab with quantity and condition, a per-lab
  summary of units and items needing attention, and clash-free booking of lab
  sessions with complete and cancel actions).
- Delivered: HR staff (a staff register with department, designation, employment
  type and status filters, create/edit profiles with personal, contact and bank
  details, document upload with verification, download and removal, offboarding
  with a leaving date and reason, department and designation masters, and
  headcount plus joiner/leaver reports).
- Delivered: payroll (a hub with salary components, staff salary structures
  built from basic pay plus fixed or percentage component lines, periodic
  adjustments, and monthly payroll runs that generate payslips, approve to post
  a balanced salary journal, and record payment method; each payslip shows the
  gross, deduction and net totals with a working/present day summary and a
  labelled breakdown that distinguishes earnings, deductions and adjustments).
- Delivered: inventory (a general store of items with category, unit, unit cost,
  quantity on hand and reorder level, category masters, a movement ledger for
  purchases, issues, returns, adjustments and wastage that posts signed stock
  changes and refuses to drive a quantity below zero, a low-stock list and a
  summary report of item count, stock value and items to reorder).
- Delivered: transport (a fleet register of vehicles with capacity and driver
  details, routes with ordered stops, pickup/drop times and fares, allocation of
  students to a route and stop with direction and validity dates, a deallocate
  action to end a placement, and a summary report of fleet size, seats, routes,
  ridership and monthly fare commitment).
- Delivered: hostel (a hostel register with type and warden details, rooms with
  floor, type, capacity, occupancy and monthly fee, allocation of students to
  rooms and beds that refuses over-capacity placements, a vacate action that
  frees the bed, a pending/approved/rejected/returned outpass workflow with
  approve, reject and mark-returned actions, and a per-hostel occupancy
  summary).
- Delivered: canteen (supplier and menu-item masters with price, cost,
  reorder level and tracked stock, stock entries for purchases, wastage and
  returns with a signed movement ledger, an approve-gated stock adjustment,
  a point-of-sale bill builder with cash, wallet and credit payment, a void
  action that restores stock and reverses the journal, student wallets with
  top-up and approve-gated balance adjustments plus a transaction history,
  hygiene checks with area, status and score, and reports for daily sales,
  item-wise margin, profit and loss, wallet activity and low stock).
- Delivered: sports (a sports catalogue with category, season, coach, age and
  attendance eligibility criteria, teams with age group, gender and coach plus
  a roster that adds, updates and removes players, training sessions per team,
  fixtures with a record-result action that derives the win/loss/draw outcome,
  achievements by level, and an equipment register with a purchase/issue/
  return/adjustment/damage movement ledger that refuses to issue beyond the
  available quantity, alongside a season summary report).
- Delivered: student affairs (clubs with a member roster that adds, updates and
  removes students, events with a participant list whose status can be marked
  attended or absent, a student council register with terms, certificate
  records with an issue action that assigns a serial number, welfare records for
  health/medical/welfare/incident, confidential counselling sessions, a
  complaint desk with an assign action and resolve/reject outcomes, and an
  alumni directory with name/email search).
- Delivered: circulars (a notice list with status and audience filters, draft
  create/edit with title, body, audience, optional class/section targeting and
  an expiry date, and a detail view with publish and archive lifecycle actions
  where archiving is refused until a circular has been published).
- Delivered: users (an account list with search and role/active filters,
  create/edit with name, email, optional password reset, phone, employee code
  and job title, role selection and an active flag, and a detail view showing
  the account, campus, two-factor state and assigned roles; deactivation is
  refused for your own account).
- Delivered: roles and scopes (a role catalogue, a permission reference grouped
  by module, and campus scope assignments that can be granted to an account with
  an optional campus, scope type, target id and validity window, then revoked;
  granting the campus admin role remains reserved for the Super User).
- Delivered: reports (a reporting hub with progress, attendance, results,
  staff, student yearly, financial and payroll reports, each with its own
  filters such as academic year, class, exam, fiscal year and date range, and
  stat cards plus breakdown tables over the campus data).
- Delivered: institutions and campuses (an institutions/campuses hub with
  institution CRUD, campus CRUD scoped to an institution, a campus-type and
  institution filter, per-institution campus lists and an archive guard that
  blocks removing an institution that still has campuses).
- Delivered: settings (a settings hub and SSO provider CRUD for generic
  OpenID Connect providers, including OIDC endpoints, client credentials with
  write-only secrets, optional just-in-time provisioning with a default role,
  and per-institution provider names).
- Delivered: audit log (a read-only activity log viewer with search, log-name,
  event and date-range filters, causer and subject columns, backed by
  `GET /api/v1/audit-logs` and `GET /api/v1/audit-logs/filters`; campus users
  only see activity from their own campus while the product owner sees
  everything).
- Planned: the remaining module screens, reached from the sidebar entries
  marked "Soon".

The client reads reference lists (academic years, classes, sections) from
`GET /api/v1/reference/academic-options`, which is available to admission and
student readers so front-office staff can complete forms without holding the
academic structure permission.

Demo accounts (password `password`): `superadmin@demo-eis.test` (Super User),
`campusadmin@demo-eis.test` (campus admin) and `teacher@demo-eis.test`. The
demo seed also lays down a completed terminal exam (grade scale, exam type,
papers and marks) so the exam and reporting screens have data out of the box;
`php artisan db:seed --class=ExamSeeder` adds just that exam data to an
existing database.

See `docs/SPECIFICATION.md` section 14 for the phase plan.
