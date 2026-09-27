# Education Information System - Consolidated Specification

Version: 2.0
Status: Approved for build (foundation delivered)
Owner: Product / Engineering
Last updated: 2026-09-24

This document supersedes `education-information-system-specification.docx`. It
keeps the original intent and adds the structural corrections needed to build a
secure, multi-campus web and mobile platform.

---

## 1. Document control

| Field | Value |
| --- | --- |
| Version | 2.0 |
| Owner | Product / Engineering |
| Approvers | Board / Trustees representative, Principal, Finance Head, IT Administrator |
| Change log | 2.0 - corrections to tenancy, accounting, RBAC and naming; added NFR, data dictionary, API and design system sections |
| Related documents | `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md` |

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Institution | The top-level legal entity / trust that owns one or more campuses. |
| Campus | A physical school, college or university location under an institution. |
| Stage | A grouping of classes: Pre-Primary, Primary, Middle, Secondary, Higher Secondary. (Previously called "Section".) |
| Class | A year group such as Nursery, Prep, or Class 1 to 12. |
| Section | A cohort within a class, labelled A, B, C. (Previously called "Class Section".) |
| AcademicYear | A named year, for example 2026-2027, that scopes records. |
| Term | A subdivision of an academic year (Term 1, Term 2, Term 3). |
| Tenant | An institution plus everything it owns; the unit of data isolation. |
| Scope | The campus/department/stage/class a user's role applies to. |
| Posting | Writing a financial transaction into the ledger. |
| Reversal | Cancelling a posted entry by creating an opposite entry; posted entries are never edited or deleted. |

Note: localization (English/Urdu, RTL layout, currency and Hijri calendar
options) is intentionally deferred. The system ships English-only for now.

---

## 3. Scope

### 3.1 In scope

- Multi-campus institution management with role-based dashboards.
- Academic structure, attendance, examinations and reporting.
- Finance, fee management and payroll (highest priority, strictest controls).
- Student records, admissions, welfare, counselling and scholarships.
- Operational departments: canteen, sports, hostels, transport, library, labs, inventory.
- Complaints, feedback, circulars and analytics.
- Web application and mobile application.

### 3.2 Out of scope (current phase)

- Localization and right-to-left layout.
- Third-party marketplace or public social features.
- Government reporting integrations (tracked as future integrations).

---

## 4. Personas

Personas match the stakeholder dashboards. Each persona is a role plus a scope.

| Persona | Primary goal | Scope |
| --- | --- | --- |
| Super User (product owner) | Operate the SaaS: create institutions and campus admins | Platform (all institutions) |
| Campus Admin | Run one campus and create local accounts | One campus |
| Principal / Head | Academic and discipline oversight | One campus |
| Finance Head / Accountant | Accurate money movement and reporting | One campus |
| Admissions / Receptionist | Process admissions and visitors | One campus |
| HR Officer | Staff lifecycle and payroll | One campus |
| Academic Coordinator | Timetable and teacher allocation | One campus |
| Teacher | Teach, mark attendance, enter marks | Assigned classes |
| Exam Controller | Exams, results, result cards | One campus |
| Student Affairs Officer | Discipline, clubs, welfare | One campus |
| Counsellor | Confidential counselling and analysis | Assigned students |
| Canteen Manager | Menu, POS, wallet, stock | Canteen |
| Sports Director / Coach | Teams, fixtures, equipment | Sports |
| IT Administrator | Accounts, helpdesk, assets, backups | Institution |
| Librarian / Lab / Store In-charge | Issue, return, stock | Department |
| Transport / Hostel In-charge | Routes, occupancy, dues | Department |
| Parent / Guardian | Track and pay for their children | Their children |
| Student | View schedules, results, records | Self |

---

## 5. Organizational model

```
Institution
  Campus (school | college | university)
    AcademicYear -> Term
    Stage (Pre-Primary | Primary | Middle | Secondary | Higher Secondary)
      Class (PG, Nursery, Prep, 1..12)
        Section (A, B, C)
          Enrollment (student within an academic year)
    Department (Accounts, Academics, ..., Canteen, Sports, IT, ...)
    Floor / Block / Room
```

Rules:

- Departments are campus-level.
- Every operational record is scoped to a campus. Every academic record is
  additionally scoped to an AcademicYear (and usually a Term).
- Naming correction: Stage is the high-level band; Section is the A/B/C cohort.

### 5.1 SaaS and tenancy model

The platform is a multi-tenant SaaS operated by the product owner.

- The **product owner (Super User)** owns the platform. The product owner creates
  institutions and, for each campus, the **campus admin account**.
- An institution may have hundreds of campuses. **Each campus is a separate
  tenant entity**: all operational services (students, finance, attendance,
  exams, canteen, and so on) are campus-scoped and isolated.
- Institution is a grouping/guardrail, not the operational boundary. A user can
  never cross their institution, and campus users can never cross their campus.
- A **campus admin** runs one campus and creates local accounts with limited
  scopes and roles (teacher, accountant, librarian, and so on). Campus admins do
  not create other campus admins.
- Tenant isolation is enforced in the application layer (MySQL has no row-level
  security): `institution_id` is always enforced for tenant users and
  `campus_id` is enforced whenever a campus is active.

Per-campus academic configuration makes the platform mouldable:

| Setting | Values | Purpose |
| --- | --- | --- |
| academic_model | school, college, university | Overall mode |
| term_system | terms, semesters | Terminology and structure |
| grading_system | percentage, grades, gpa | Result calculation |
| credit_hours_enabled | true/false | Credit-hour based study |

---

## 6. Functional requirements

Priorities: M = Must, S = Should, C = Could.

### 6.1 Foundation - tenancy, identity, RBAC, security

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-1.1 | Maintain institutions and campuses with contact details | M | Delivered (API) |
| FR-1.2 | Users authenticate and receive scoped API access | M | Delivered (API) |
| FR-1.3 | Roles are composed of permissions; permissions bind to a scope | M | Delivered (API) |
| FR-1.4 | Super User creates the campus admin account for each campus; campus admins create local accounts | M | Delivered (API) |
| FR-1.5 | All sensitive changes are audit logged | M | Delivered (API) |
| FR-1.6 | Security headers on every response | M | Delivered (API) |
| FR-1.7 | Two-factor authentication for admin, finance, HR | M | Delivered (API: native TOTP authenticator enrolment with encrypted secret and hashed single-use recovery codes, a password-then-code login challenge, recovery-code regeneration and password-confirmed disable; `ENFORCE_TWO_FACTOR` can require admin/finance/HR roles to enrol before login) |
| FR-1.8 | Password reset, email verification, session/device management | M | Delivered (API: forgot/reset password, signed email verification, token/session list-revoke, password change) |
| FR-1.9 | SSO (OIDC/SAML) for staff | C | OIDC delivered (API: per-institution OIDC providers with encrypted client secret, authorization-code flow with state/nonce/PKCE, account linking by subject or email, optional JIT provisioning with a default role, and RP-initiated logout; SAML remains pending) |

### 6.2 Academic structure

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-2.1 | Academic year and term management | M | Delivered (API) |
| FR-2.2 | Class register with capacity, in-charge and room mapping | M | Delivered (API) |
| FR-2.3 | Section grouping into stages | M | Delivered (API) |
| FR-2.4 | Subject master list and subject-to-class mapping | M | Delivered (API) |
| FR-2.5 | Syllabus, book list and lesson plans per class and subject | S | Delivered (API: per class/subject syllabus units, class book lists and lesson plans with a draft/submitted/approved workflow and campus-scoped references) |
| FR-2.6 | Teacher x Subject x Class x Section x Year assignment matrix | M | Delivered (API) |
| FR-2.7 | Workload limits and conflict checks (teacher and room) | M | Delivered (basic: slot conflict + weekly workload; room conflicts pending timetable) |
| FR-2.8 | Substitute and cover management | S | Delivered (API: per-slot/date substitute cover with weekday, self-cover and period double-booking guards, cancel) |
| FR-2.9 | Timetable generation (constraint solver) with manual override | S | Delivered (API: greedy generator with dry-run, replace, unplaced reporting; manual slots remain) |
| FR-2.10 | Published timetable views for students, parents, teachers | M | Delivered (API: class, teacher, self views with publish control) |
| FR-2.11 | Academic calendar: terms, holidays, exams, events | M | Delivered (API) |

### 6.3 Finance and accounts (prime importance)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-3.1 | Chart of accounts and double-entry journal | M | Delivered (API: per-campus chart of accounts with posting rules; balanced double-entry journal with draft/post) |
| FR-3.2 | Cash book and bank accounts with reconciliation | M | Delivered (API: bank/cash/wallet accounts, cash book with running balance, reconciliation snapshot gated on a matching balance) |
| FR-3.3 | Incomes: fees, charges, exam fees, sales, donations, commissions | M | Delivered (fee income via FR-4 plus configurable other-income sources (donation, sale, commission, exam fee, charge, other) that post receipts straight to the matching income account, with per-source account overrides and void/reversal) |
| FR-3.4 | Expenses: salaries, utilities, wages, incentives, scholarships, purchases | M | Delivered (API: vendors, expense categories, vendor bills with lines, approval posting to payables, settlements, void/reversal) |
| FR-3.5 | Petty cash as a separate account | M | Delivered (a `petty_cash` bank account linked to its own cash chart account; appears in the cash book) |
| FR-3.6 | Assets and liabilities register | M | Delivered (API: asset register with straight-line depreciation, book value and disposal; liability register with types, outstanding balances and settlement; register reports) |
| FR-3.7 | Budgeting: annual, semi-annual, monthly, budget vs actual | M | Delivered (API: budget CRUD with line items, draft/approved workflow, budget-vs-actual report) |
| FR-3.8 | Taxation rules and required documents | S | Delivered (configurable tax rules by type (VAT/GST/sales/income/withholding), scope and rate with an optional posting account; tax returns per period with auto-computed tax, filing and payment lifecycle that settles tax payable to the ledger, a required-document checklist and an overdue filter) |
| FR-3.9 | Financial reports: surplus/deficit, receivables, payables, statements | M | Delivered (API: trial balance, account ledger, receivable aging, payables aging, expense summary, collection and surplus/deficit statements) |
| FR-3.10 | Per-student, per-class and whole-school statements | M | Delivered (API: per-student statement, per-class billing/collection summary and a whole-school consolidated income/balance statement) |
| FR-3.11 | Period close and lock; reversal instead of edit/delete | M | Delivered (API: posted entries immutable and reversed, not edited; monthly accounting periods can be generated, closed, reopened and locked, and posting is blocked in closed/locked periods) |
| FR-3.12 | Approval workflows for financial edits | M | Delivered (configurable multi-step approval workflows matched by entity type and amount thresholds, with steps satisfied by a specific user, role or permission; requests support submit/approve/reject/cancel and expense approval is gated until an applicable workflow is approved) |
| FR-3.13 | Full audit logging on all financial activity | M | Delivered (activity log on fiscal years, accounts and journal entries) |

### 6.4 Fee management

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-4.1 | Fee schedule and fee heads per class | M | Delivered (API: fee heads linked to income accounts; class fee plans and line items) |
| FR-4.2 | Fee plans with installment schedules and proration | M | Delivered (installment schedules, per-installment billing and discount allocation, and mid-year proration for late joiners that skips elapsed installments and prorates the active one by remaining days) |
| FR-4.3 | Per-student status: due, received, discount, concession, scholarship | M | Delivered (API: per-student vouchers with unpaid/partial/paid status and paid amounts; campus concession policies with rule-based criteria (gender, category, sibling count), stackable/non-stackable discounts with caps, approval-gated grants, and automatic scholarship and concession discounts merged into fee voucher generation) |
| FR-4.4 | Vouchers and receipts with numbering and void/reversal | M | Delivered (API: campus-numbered vouchers and receipts, discount-aware lines, double-entry posting, void with reversal) |
| FR-4.5 | Late fees, fines, advance balances and refunds | S | Delivered (API: per-plan late fee policy and application, configurable fine rules and per-student fines with apply/waive/revoke posting on outstanding vouchers, advance payments and allocation, refunds with an approval workflow that posts to the ledger only on approval and reverses on revoke) |
| FR-4.6 | Defaulter lists and reminders | M | Delivered (API: aging defaulter list by student/class; configurable fee reminders queued per defaulting student with an email/SMS/in-app channel, primary-guardian recipient resolution, templated message, send/cancel lifecycle and same-day duplicate suppression; pluggable delivery gateway with a default log driver) |
| FR-4.7 | Online payment gateway integration | S | Delivered (API: gateway-agnostic payment intents with checkout URL, signed HMAC webhooks, idempotent confirmation that posts a fee payment and settles the voucher; manual/test gateway driver behind a PaymentGateway interface) |

### 6.5 Admissions and student records

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-5.1 | Online admission form and enquiry tracking | M | Delivered (API: enquiry/applied/under-review/approved/rejected/enrolled statuses) |
| FR-5.2 | Document upload with validation and virus scanning | M | Delivered (upload with type/size/MIME validation and download, plus a pluggable scanner with a default no-op driver and an opt-in ClamAV driver via `UPLOAD_SCANNER`) |
| FR-5.3 | Approval workflow with class and section allocation | M | Delivered (API: submit/approve/reject, then enroll into class and section) |
| FR-5.4 | Admission and withdrawal records with dates | M | Delivered (API: dated application/decision/enrollment and dated withdrawal/transfer) |
| FR-5.5 | Student profile, guardians (many-to-many) and documents | M | Delivered (API: profile, guardians, admission documents and a per-student document store with type validation, scanner hook, verify and download) |
| FR-5.6 | Year-by-year class and section history (enrollment) | M | Delivered (API) |
| FR-5.7 | Academic, fee, attendance and conduct history | M | Delivered (API: consolidated per-student history with academic timeline, attendance rollup, fee/scholarship summary and conduct/incident records with category, severity and resolution) |
| FR-5.8 | Scholarship holder records and policy | M | Delivered (API: scholarship catalogue by type/discount, per-student awards with override and revoke, automatic discount applied to fee vouchers) |
| FR-5.9 | Promotion / rollover between academic years | M | Delivered (API) |

### 6.6 Attendance

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-6.1 | Daily class-wise student attendance | M | Delivered (API: single and bulk marking with unique student/day record) |
| FR-6.2 | Report by class: total, boys, girls, present, leave, absent | M | Delivered (API: class summary and per-student summary) |
| FR-6.3 | Staff attendance and leave | M | Delivered (API: staff marking, leave requests with approval writing leave attendance) |
| FR-6.4 | Automatic parent notification for absence | S | Delivered (API: marking a student absent automatically queues a per-guardian notification using the primary contact, with a queue/send/cancel lifecycle, bulk backfill, same-day dedupe and a pluggable gateway defaulting to a log driver) |
| FR-6.5 | Offline attendance capture with sync (mobile) | S | Delivered (API: `POST /attendance/sync` accepts a device batch of attendance records carrying a client UUID and capture timestamp; per-record idempotency skips duplicates, newer server records win conflicts, and stale offline edits are overwritten; each batch is stored as a receipt with applied/duplicate/conflict counts and offline absences still queue guardian notifications) |

### 6.7 Examinations and results

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-7.1 | Exam types and date sheets | M | Delivered (API: exam types with weightage, exams per academic year/term, and per-class papers with date, timing, room, max/pass marks and publish step) |
| FR-7.2 | Invigilation duties | M | Delivered (API: per-paper duty assignments with chief/assistant roles, duplicate guard) |
| FR-7.3 | Marks entry by subject teacher | M | Delivered (API: bulk marks entry per paper with absentee flag, max-marks validation and upsert) |
| FR-7.4 | Grading rules, result cards, merit lists | M | Delivered (API: campus grade scales with banded items, derived result cards with per-subject pass/fail, totals, percentage and grade, and class merit lists with ranks) |
| FR-7.5 | Result analysis: class, subject, teacher, year-on-year | M | Delivered (API: class analysis with per-subject averages/pass rates/high-low and overall grade distribution, subject-by-class analysis, per-teacher achievement and year-on-year comparison by exam type) |
| FR-7.6 | Moderation, re-evaluation, supplementary exams | S | Delivered (API: grace-marks and scaling moderations with approve/apply workflow that stores moderated marks separately and clamps to paper maximum, per-student re-evaluation requests with review/revise, and supplementary exam registration for failed students with approve/reject/complete; result cards, analysis and reports aggregate effective marks) |
| FR-7.7 | Semester and credit-hour model for college/university | S | Delivered (API: per-term/semester course registration with credit hours defaulted from the subject, duplicate/tenancy guards and drop workflow, plus credit-weighted term GPA and cumulative transcript built from exam marks linked to the term and the campus grade scale; honours the campus academic_model/term_system/grading_system/credit_hours_enabled configuration) |

### 6.8 HR and payroll

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-8.1 | Staff profiles and documents | M | Delivered (API: staff register with department/designation, personal and bank details, joining/leaving dates, plus a per-staff document store with type validation, scanner hook, verify and download) |
| FR-8.2 | Job description per role, categorically assigned | M | Delivered (API: departments and designations with grade, job description and responsibility list) |
| FR-8.3 | Joining, leaving and staff reports | M | Delivered (API: auto employee numbers, terminate action recording leaving date/status, headcount report by department/designation/status/employment type and joiners/leavers movement report) |
| FR-8.4 | Attendance, leave and salary processing | M | Delivered (API: reuses staff attendance and leave requests; monthly payroll runs generate payslips from each staff member's salary structure) |
| FR-8.5 | Incentives, rewards and deductions | M | Delivered (API: payroll adjustments for incentive/reward/bonus/overtime/deduction applied into the matching period's payslip) |
| FR-8.6 | Payroll posts to finance with approval | M | Delivered (API: approval-gated payroll approval posts Dr salaries expense / Cr net payable + deductions payable, with a separate payment posting to cash/bank) |

### 6.9 Operations - canteen, sports, student affairs, IT and support

Canteen: menu and pricing, POS billing with wallet or cash, wallet top-ups and
limits, inventory with low-stock alerts, suppliers, hygiene checklists, daily and
item-wise reports, profit and loss, integration into the cash book.

Sports: catalogue, teams and squads, training and fixtures, results and
achievements, equipment stock, eligibility, budget.

Student affairs: discipline and conduct, counselling (restricted), scholarships
and aid, clubs and events, co-curricular participation, welfare and health,
certificates, alumni, student council, grievances.

IT: asset management, helpdesk with SLA, user and access administration,
monitoring, backups and disaster recovery, portal management, change management.

Support modules: administration and front office, documents, circulars, PTM
scheduler, inventory and stock, library, science and computer labs, transport and
hostel, complaints and feedback.

| ID | Requirement group | Priority | Status |
| --- | --- | --- | --- |
| FR-9.x | Canteen module (menu, POS, wallet, stock, reports) | M | Delivered (API: suppliers, menu/pricing with stock tracking and low-stock flags, purchases/adjustments/wastage, POS billing by cash/wallet/credit, student wallets with top-ups, daily limits and adjustments, hygiene checklists, and daily/item-wise/profit-loss/wallet/low-stock reports, all posted to the double-entry ledger) |
| FR-9.y | Sports module | S | Delivered (API: a sports catalogue with age and attendance eligibility checks, teams and squads, training sessions, fixtures with automatic win/loss/draw results, achievements by level, equipment stock with purchase/issue/return/damage/adjustment movements, and a campus sports summary report) |
| FR-9.z | Student affairs module | M | Delivered (API: clubs with memberships, events with participants, certificate issuance with serial numbers, health/welfare records with follow-up, alumni profiles, student council terms, a complaint desk with reference numbers and an assign/resolve/reject workflow, and confidential counselling sessions gated behind the counselling permission) |
| FR-9.it | IT department module | M | Delivered (API: IT asset register with assignment/return history and warranty tracking, a helpdesk with priority-based SLAs, assignment, comments and open/overdue queues, change requests with an approve/reject/implement workflow, backup logs, portal/system uptime monitoring, and a campus IT operations summary) |
| FR-9.sup | Support modules | S | Delivered (API: circulars with publish/archive lifecycle, a front-office visitor register with check-in/check-out, a parent-teacher meeting scheduler with capacity-limited slots and bookings, a general stores inventory with categories, items, stock movements and low-stock reporting, a library with catalogue, issuing, returns and overdue fines, science/computer labs with equipment registers and clash-free session bookings, transport with vehicles, routes, stops and student allocations, and hostels with rooms, occupancy-limited allocations, outpass approval workflow and occupancy summaries) |

### 6.10 Reports and analytics

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-10.1 | Progress report: students, admissions, withdrawals, scholarships, projects | M | Delivered (API: population by status/gender, admissions funnel, enrollment movement, scholarships by type/value and events for a date range or academic year) |
| FR-10.2 | Attendance, result and staff reports | M | Delivered (API: attendance totals/rate by class, exam pass/fail and grade distribution with per-paper averages, and a staff report covering headcount, attendance and leave) |
| FR-10.3 | Year-by-year and consolidated student analysis for counselling | M | Delivered (API: per-year class/section/status with attendance percentage, academic percentage and conduct counts, plus a rolled-up summary) |
| FR-10.4 | Financial, canteen, inventory and HR reports | M | Delivered (API: ledger-based income/expense/surplus summary, payroll cost by period, HR staff report and canteen daily/item-wise/profit-loss/low-stock/wallet reports; store inventory low-stock and stock-value summary delivered with FR-9.sup) |
| FR-10.5 | Consolidated cross-campus and cross-institution dashboards for the Super User | M | Delivered (API: campus dashboard plus a platform overview of institutions, campuses, students, staff and active enrollments for the product owner) |

---

## 7. Cross-department workflows

| Workflow | Path | Notes |
| --- | --- | --- |
| Fee collection | Fee Management -> Accounts | Posts to cash book |
| Department income/expense | Department -> Accounts | Approval required |
| Payroll | HR -> Accounts -> Payment | Two-step approval |
| New user account | HR -> IT (create) -> Admin (assign scope) | Scope assignment audit logged |
| Sports eligibility | Sports -> Student Affairs | Shared student record |
| Result publication | Teacher -> Exam Controller -> Publish | Withheld until published |

Workflows are implemented as explicit state machines (approval engine), not ad
hoc code.

---

## 8. Data model - entity dictionary

Foundation (delivered):

- Institution, Campus, User, ScopeAssignment, Role, Permission, AuditLog
  (activity log), PersonalAccessToken.

Academic:

- Delivered: AcademicYear, Term, Stage, ClassRoom, Section, Subject, ClassSubject,
  TeachingAssignment, AcademicEvent, Period, Room, TimetableSlot.
- Pending: Floor (block/floor stored on Room), Faculty, LessonPlan, and the
  constraint-solver timetable generator.

Students:

- Student, Guardian, GuardianStudent, Enrollment, Admission, Promotion,
  Withdrawal, Document.

Finance:

- FiscalYear, ChartOfAccount, JournalEntry, JournalLine, BankAccount,
  BankReconciliation, CashBookEntry, Budget, Asset, Liability, TaxRule,
  PaymentGatewayTransaction, Refund, Reversal.

Fees:

- FeePlan, FeeHead, FeeInstallment, FeeStructure, FeeVoucher, Receipt, Payment,
  Concession, Scholarship.

Attendance and exams:

- AttendanceRecord, StaffAttendance, LeaveType, LeaveRequest, Exam, ExamSchedule,
  InvigilationDuty, Mark, GradeScale, Result, ResultCard.

HR and payroll:

- Staff, JobDescription, PayrollRun, Payslip, Incentive, Deduction.

Operations:

- InventoryItem, StockItem, Purchase, Sale, Book, BookIssue, LabItem, CanteenItem,
  CanteenSale, StudentWallet, WalletTransaction, Route, Vehicle, HostelRoom,
  SportTeam, Fixture, SportsResult, DisciplineRecord, CounsellingNote, Club,
  Event, Complaint, Circular, ITAsset, Ticket, BackupLog, Notification,
  NotificationTemplate, ConsentRecord.

Common conventions:

- Every table has `id`, `created_at`, `updated_at`; soft deletes where archival
  is required.
- Money uses fixed-precision decimal columns, never floats.
- All campus-scoped tables carry `campus_id` and are filtered by the tenant
  context.
- Posted financial records are immutable; corrections are reversals.

---

## 9. Roles, permissions and scope

Access is `Permission x Scope`.

- Roles are templates that bundle permissions (see `config/rbac.php`).
- Permissions are named `module.action` (for example `finance.approve`).
- Scope binds a user's role to an institution, campus, department, stage or
  class via `ScopeAssignment`.
- Campus is the tenant boundary; institution is an isolation guardrail. Campus
  admins create local accounts only, and only the product owner creates campus
  admin accounts.
- Sensitive data has extra restrictions: counselling notes, finance and health
  records are additionally gated and access logged.
- Two-factor is required for Super User, Campus Admin, Finance and HR roles
  (enforced once the enrolment flow is enabled).

Scope matrix (summary):

| Role | Institution | Campus | Department | Class |
| --- | --- | --- | --- | --- |
| Super User (product owner) | All | All | All | All |
| Campus Admin | Own | Own | All on campus | All on campus |
| Finance / HR | Own | Own | Finance / HR | - |
| Teacher | Own | Own | Academics | Assigned |
| Parent / Student | Own | Own | - | Own record |

---

## 10. Non-functional requirements

| Category | Requirement |
| --- | --- |
| Security | OWASP ASVS baseline; HTTPS everywhere; CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy; rate limiting; session management; secrets manager; WAF at the edge. |
| Privacy | Consent capture for child data; field-level protection for counselling and health records; audit access; documented retention policy. |
| Availability | Target 99.5% monthly; graceful maintenance mode. |
| Performance | p95 API latency under 300 ms for common reads; dashboards under 1.5 s; indexes on all foreign keys and report filters. |
| Scalability | Support peak load on results day and fee deadlines; horizontal API scaling. |
| Data protection | Automated backups with tested restore; documented RPO 1 hour and RTO 4 hours. |
| Accessibility | WCAG 2.1 AA for staff and parent portals. |
| Observability | Structured logs, metrics, traces and alerting. |
| Auditability | Append-only audit log for financial, student and permission changes. |

---

## 11. Integrations

| Integration | Purpose | Priority |
| --- | --- | --- |
| Payment gateway | Online fees and wallet top-ups | S |
| SMS provider | Attendance and fee reminders | S |
| WhatsApp Business API | Notifications | S |
| Email (SMTP/SES) | Circulars and receipts | M |
| Push (FCM/APNs) | Mobile notifications | M |
| Biometric / RFID | Attendance capture | C |
| SSO (OIDC/SAML) | Staff login | C |

Integration adapters are pluggable; provider-specific code stays behind an
interface.

---

## 12. API catalogue

Base path: `/api/v1`. Authentication: Bearer token (Laravel Sanctum). Campus
selection: `X-Campus-Id` header.

Delivered in the foundation:

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/auth/login` | public (throttled) |
| GET | `/auth/me` | authenticated |
| POST | `/auth/logout` | authenticated |
| GET | `/meta/roles` | authenticated |
| GET | `/meta/scopes` | authenticated |
| GET | `/meta/permissions` | authenticated (sensitive) |
| GET/POST | `/institutions` | institution.view / institution.create |
| GET/PUT/DELETE | `/institutions/{id}` | institution.view / edit / delete |
| GET/POST | `/campuses` | campus.view / campus.create |
| GET/PUT/DELETE | `/campuses/{id}` | campus.view / edit / delete |
| GET/POST | `/users` | user.view / user.create |
| GET/PUT/DELETE | `/users/{id}` | user.view / edit / delete |
| GET/POST | `/scope-assignments` | role.view / role.edit |
| DELETE | `/scope-assignments/{id}` | role.edit |

All endpoints follow a consistent envelope and error shape defined in
`docs/ARCHITECTURE.md`.

---

## 13. UI/UX design system

Design tokens: semantic color, 4pt spacing scale, type scale, radius, elevation.
Dashboards follow the layout shell: left rail navigation (bottom tab bar on
mobile), top bar with campus switcher, search, notifications and profile.

Core patterns:

- Dashboard grid: KPI cards, charts, action queues, activity feed.
- Data modules: list with filters, saved views, bulk actions, export.
- Record page: header with status and actions, tabbed sections (Overview,
  History, Documents, Audit).
- Drill-down: Campus -> Stage -> Class -> Section -> Student.

Reusable components: DataTable, StatCard, StatusBadge, ApprovalTimeline,
MoneyInput, DateRangePicker, DocumentUpload, PermissionGate, EmptyState,
ConfirmDialog.

Accessibility: keyboard navigation, visible focus, WCAG 2.1 AA contrast. Every
sensitive value is masked by default with reveal-and-log.

---

## 14. Build phases

1. Foundation: tenancy, users, roles, permissions, authentication, security. (Delivered)
2. Academic structure: classes, sections, subjects, teacher allocation, timetable.
   (Delivered: years, terms, stages, classes, sections, subjects, mappings,
   assignments, calendar, periods, rooms, timetable slots with conflict checks,
   published views and a greedy generator with dry-run and manual override)
3. Finance and accounts (prime importance).
4. Fees and admissions.
5. Attendance and exams.
6. HR and payroll.
7. Portals: parent, student, teacher dashboards and notifications.
8. Student affairs, canteen and sports.
9. Support modules: inventory, library, labs, transport, hostel, complaints.
10. IT department module.
11. Analytics and consolidated reporting.

---

## 15. Risks and assumptions

| Risk | Mitigation |
| --- | --- |
| Tenancy retrofit is expensive | Institution/campus modelled from day one. |
| Single-entry accounting growth | Double-entry ledger and reversals required before finance build. |
| Role explosion | Roles are permission bundles plus scope, not hardcoded. |
| Timetable generation complexity | Constraint solver with manual override; no one-click promise. |
| Sensitive student data exposure | Field protection, masking and access audit. |
| MySQL lacks row-level security | Tenant scoping enforced in the application layer and tested. |

Assumptions: English-only for the current phase; multi-tenant-ready shared
schema; school-first with college/university extension.

---

## 16. Open questions

1. SaaS subscription model: per-campus billing tiers, plan limits and trial
   handling.
2. Which payment gateway(s) for fees and wallet top-ups?
3. Board-specific grading and reporting formats.
4. College/university credit system: defaults are delivered (per-subject
   `credit_hours` with a 1.0 fallback, GPA points from the campus grade scale,
   and terms used as semesters); institution-specific overrides remain open.
5. Notification channels in priority order: SMS, email, WhatsApp, push.
6. SSO: OIDC is delivered; whether to add SAML and the per-IdP attribute/role
   mapping for specific providers remains open.

Resolved: the platform is multi-tenant SaaS with many institutions, each with
many campuses; campus is the tenant boundary; school-first with per-campus
academic configuration for college/university setups.

---

## 17. Acceptance criteria and traceability

Each requirement is accepted when:

- The stated behaviour works for the intended role and scope.
- Tenant isolation holds (a user cannot see another campus without scope).
- A permission change or sensitive action produces an audit entry.
- Automated tests cover the happy path and the authorisation failure path.

Traceability: requirement IDs (FR-x.y) map to modules, tests and API endpoints.
The foundation requirements FR-1.1 to FR-1.6 are covered by the feature tests in
`apps/api/tests/Feature`.
