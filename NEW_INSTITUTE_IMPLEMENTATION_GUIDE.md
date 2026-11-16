# New Institute Implementation Guide

This guide describes how to take a new institute live in EduCourt, based on the
code in this repository. It is written as an implementation runbook, not a
marketing overview. Each phase states what the platform does automatically,
what an operator must do, and which parts require a code or infrastructure
change.

**Audience:** platform administrators, implementation engineers, campus
administrators, and finance leads responsible for onboarding a new institution
or a new campus.

**Scope of this guide:**

- Institution and campus provisioning
- Academic sessions, classes, sections, and subjects
- Users, roles, and campus assignments
- Fees, receivables, and accounting setup
- Students and admissions
- Notifications, email, WhatsApp, SSO, and payment settings
- Branding, domains, and institute-specific settings
- Data isolation, security, and subscription state
- Testing, verification, deployment, and go-live

**Important:** The production deploy path (`deploy-edu.sh`) is non-destructive:
it never runs `migrate:fresh`, never truncates tables, and never runs demo
seeders. Several manual steps in this guide update configuration columns through
tinker; they do not delete business data. Do not run `DemoSeeder` or
`EduCourtTestInstituteSeeder` in production.

---

## 0. Before you start

### 0.1 System shape

EduCourt is a single multi-tenant application, not one deployment per institute.

| Layer | Technology | Production process |
|---|---|---|
| API | Laravel | PHP-FPM on port 8080 |
| Staff web | Next.js | PM2 process `educourt-web`, port 3001 |
| Family portal | Next.js | PM2 process `educourt-parent`, port 3002 |
| Database | MySQL | Single database, tenant-scoped by `institution_id` and `campus_id` |
| Queue | Laravel queue | PM2 process or worker, database driver |
| Scheduler | Laravel scheduler | System cron running `php artisan schedule:run` |

The tenant boundary is the **campus**. An institution can own many campuses.
Most operational records carry both `institution_id` and `campus_id`, and the
API resolves the active campus from the `X-Campus-Id` request header.

### 0.2 What is automatic and what is manual

| Area | Automatic | Manual | Requires code or infrastructure change |
|---|---|---|---|
| RBAC roles and permissions | Yes, on every deploy through `RbacSeeder` | No | No |
| Institution creation | No | Platform admin dashboard or API | No |
| Campus creation | No | Platform admin dashboard or API | No |
| Default chart of accounts | No | Run `DefaultChartOfAccounts::seed()` per campus | A provisioning trigger would require code |
| Accounting periods | Partly, one API call generates monthly periods | Select fiscal year | No |
| Expense approval workflows | No for new campuses | Create through API, or run the seeder with care | A campus-created event would require code |
| Academic structure | No | Academic year, terms, stages, classes, sections, subjects | No |
| Fee heads and fee structures | No | Finance dashboard or API | No |
| Fee plan and voucher billing | No | Finance dashboard or API | No |
| Student records | No | Manual or CSV import | No |
| Student and guardian portal logins | No | Create user, then link `students.user_id` or `guardians.user_id` | A provisioning endpoint would require code |
| Brand/logo on printouts | Limited | Set `campus.settings.logo` directly in the database | A branding admin UI would require code |
| Per-institute branding, colours, custom domain | No | No supported configuration | Yes |
| Subscription limits | No | Fields exist but are not enforced | Yes |
| Email delivery | Password reset uses Laravel mail | Configure SMTP globally | Per-institute SMTP would require code |
| WhatsApp | No | Configure Meta app, sender, integration policy, consent | No |
| SSO | No | Create an OIDC provider row | No |
| Backups | On deploy only | Add OS-level scheduled backups | Yes, for scheduled backups |
| Health check | Yes, `/up` on the API | Monitor it | No |

### 0.3 Two decisions to make before creating records

**Decision 1: Which fee ledger will this campus use?**

There are two parallel fee systems in the code. They are not equivalent.

| Flow | Main screens | Writes | Posts to general ledger | Visible in family portal | Recommendation |
|---|---|---|---|---|---|
| Fee plans and fee vouchers | `/dashboard/finance/fee-plans`, `/dashboard/fees` | `fee_plans`, `fee_vouchers`, `fee_payments` | Yes, through `FeeBillingService` | Yes, the portal reads `fee_vouchers` | Use when accounting and portal consistency are required |
| Fee structures and fee counter | `/dashboard/finance/accounts-receivable` | `fee_structures`, `fee_charges`, `fee_receipts` | No | No | Use only if the front desk needs this UI and finance reconciles separately |

Do not run both flows for the same campus and period. Doing so creates two
unrelated receivable balances. The current code does not reconcile them.

For most new institutes, use **fee plans and fee vouchers** until the
receivables flow writes journals and the portal reads `fee_charges`.

**Decision 2: One campus or many?**

Create the institution first, then all campuses. Portal users, fee heads,
charts of accounts, academic years, and fee structures are campus-specific.
Institution heads see all campuses in their institution but cannot edit records.
Platform administrators are the only users who can create institutions,
campuses, campus administrators, and institution heads.

---

## 1. Prerequisites and access

### 1.1 Accounts and access you need

- Platform administrator account. This is the only role that can create an
  institution, a campus, a campus administrator, or an institution head.
- SSH access to the production server.
- Access to the deployment key used for `git push`.
- The production domain and TLS certificate.
- SMTP credentials if password reset email must work.
- Meta WhatsApp Business credentials if WhatsApp is in scope.
- OIDC client credentials if SSO is in scope.

### 1.2 Confirm the current production state

Run these checks on the server before creating anything:

```bash
cd /var/www/educourt
git log --oneline -5
pm2 list
curl -fsS http://127.0.0.1:8080/up
curl -fsS -o /dev/null -w '%{http_code}\n' https://educourt.asifent.com/login
```

Expected:

- `git log` shows the release you intend to run.
- `educourt-web` and `educourt-parent` are online.
- The API `/up` endpoint returns a successful response.
- The public login page returns `200`.

Confirm the database has at least one platform administrator:

```bash
cd /var/www/educourt/apps/api
php artisan tinker --execute="echo \App\Models\User::role('platform_admin')->count();"
```

If the count is zero, create the first platform administrator manually and
change the password immediately after first login:

```bash
cd /var/www/educourt/apps/api
php artisan tinker --execute="\$u = \App\Models\User::create(['name' => 'Platform Admin', 'email' => 'platform-admin@example.com', 'password' => \Illuminate\Support\Facades\Hash::make('ChangeMe-Now-123'), 'is_active' => true]); \$u->assignRole('platform_admin');"
```

Do not leave a shared password in place. The command writes the account with a
known initial password, so change it at first login.

### 1.3 API conventions used in this guide

```bash
API="https://educourt.asifent.com/mobile-api/v1"
EMAIL="platform-admin@example.com"
PASSWORD="replace-with-the-real-password"
```

Use the `/mobile-api/v1` base for Bearer-token scripts. The `/api/v1` base is the
staff web BFF: it strips the `Authorization` header and authenticates with the
`eis_session` cookie, so token-based `curl` calls to `/api/v1` are treated as
anonymous.

Every authenticated request needs:

```text
Accept: application/json
Authorization: Bearer <token>
X-Campus-Id: <campus id>        # required for campus-scoped routes
```

Obtain a token:

```bash
TOKEN=$(curl -sS -X POST "$API/auth/login" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"device_name\":\"onboarding\"}" \
  | jq -r '.token')
```

Check the token and the current user:

```bash
curl -sS "$API/auth/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq
```

If the user has two-factor authentication enabled, the login response contains
`two_factor_required` and a `challenge_token` instead of `token`. Complete the
challenge at `POST /auth/two-factor/challenge` before continuing.

### 1.4 Required permissions by phase

| Phase | Role needed |
|---|---|
| Create institution, campus, campus admin, institution head | `platform_admin` |
| Create other staff | `campus_admin`, or a role with `user.create` |
| Academic structure | `campus_admin`, `academic_coordinator`, or `principal` |
| Finance foundation | `finance_head`, `accountant`, or `campus_admin` |
| Fee setup | `finance_head`, `accountant`, or `campus_admin` |
| Student records and admissions | `admissions_officer`, `campus_admin`, or `principal` |
| Integrations and branding | `campus_admin` or `platform_admin` |

---

## 2. Tenant model and data isolation

Understanding this section prevents the most common and most serious onboarding
mistake: creating records in the wrong campus.

### 2.1 The identifiers

| Field | Meaning |
|---|---|
| `institutions.id` | The legal or business entity |
| `campuses.id` | The operating unit; this is the data boundary |
| `users.institution_id` | The user's institution |
| `users.campus_id` | The user's default campus; `null` for institution heads and platform admins |
| `scope_assignments` | Additional campus grants, with optional validity dates |

### 2.2 How the API resolves tenancy

`ResolveTenant` reads the authenticated user and the `X-Campus-Id` header:

- Platform administrator: no isolation; may optionally filter to one campus.
- Institution head: isolated to their institution; may select any campus in it.
- Every other user: isolated to their institution and to a permitted campus.
- If no header is sent, an ordinary staff user falls back to their own campus,
  or to the first permitted campus. An institution head has no default campus
  and must send the header for campus-scoped routes.

Campus-scoped routes then pass through `RequireCampusContext`, which returns
`403` with the message `Select a campus (X-Campus-Id header) to access this
resource.` if no campus can be resolved.

### 2.3 What is protected

- Route model binding runs after tenant resolution, so guessing another
  campus's record id does not bypass the scope.
- Teachers see only students in their assigned classes through `TeacherScope`.
- Portal users see only their own student record, or the students linked to
  their guardian record.
- Deactivating a user deletes their API tokens.
- Expired `scope_assignments` are reconciled before authorization on each
  request.

### 2.4 What is not protected by default

- A platform administrator can read and write everything. Treat this account as
  a break-glass account and keep it to a small number of people.
- Institution heads have institution-wide read access plus
  `finance.approve`. They are not strictly view-only because of that approval
  permission.
- Subscription fields are stored but not enforced. See section 12.
- UI navigation hiding is not a security control. The API enforces permissions
  independently.

Isolation tests exist:

```bash
cd /var/www/educourt/apps/api
php artisan test --filter=TenantIsolationTest
php artisan test --filter=InstitutionHeadCampusScopeTest
php artisan test --filter=TeacherScopeTest
php artisan test --filter=DocumentTenantIsolationTest
```

---

## 3. Phase 1: Create the institution

### 3.1 Dashboard path

`/dashboard/institutions/list/new`

Only a platform administrator can complete this step.

### 3.2 API command

```bash
INSTITUTION=$(curl -sS -X POST "$API/institutions" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Example Institute",
    "legal_name": "Example Institute Private Limited",
    "email": "info@example.edu",
    "phone": "+92-300-0000000",
    "website": "https://example.edu",
    "address": "1 Example Road, City",
    "is_active": true
  }')

INSTITUTION_ID=$(echo "$INSTITUTION" | jq -r '.data.id')
echo "$INSTITUTION_ID"
```

If `code` is omitted, the API generates the next institution code.

### 3.3 Required fields

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Display name used across the product |
| `code` | No | Unique; generated when omitted |
| `legal_name` | No | Stored but not used in print headers |
| `email`, `phone`, `website`, `address` | No | Used for contact display where implemented |
| `is_active` | No | Defaults to active |

### 3.4 Verification

```bash
curl -sS "$API/institutions/$INSTITUTION_ID" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
```

Do not create a campus until the institution id is confirmed.

### 3.5 Subscription fields

The same record has `plan`, `status`, `trial_ends_at`, and `max_campuses`.
They are not returned or accepted by the institution create/update endpoints,
and they are not enforced anywhere. Set them directly in the database if you
need them for reporting, but do not rely on them for access control.

---

## 4. Phase 2: Create the campus

### 4.1 Dashboard path

`/dashboard/institutions/campuses/new`

### 4.2 API command

```bash
CAMPUS=$(curl -sS -X POST "$API/campuses" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"institution_id\": $INSTITUTION_ID,
    \"name\": \"Main Campus\",
    \"type\": \"school\",
    \"email\": \"main@example.edu\",
    \"phone\": \"+92-300-0000001\",
    \"whatsapp\": \"+92-300-0000001\",
    \"website\": \"https://example.edu\",
    \"address\": \"1 Example Road, City\",
    \"is_active\": true
  }")

CAMPUS_ID=$(echo "$CAMPUS" | jq -r '.data.id')
echo "$CAMPUS_ID"
```

Allowed `type` values: `school`, `college`, `university`.

Campus `code` is unique per institution and is generated when omitted.

### 4.3 Verification

```bash
curl -sS "$API/campuses/$CAMPUS_ID" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
```

From this point on, campus-scoped API calls need:

```text
X-Campus-Id: <CAMPUS_ID>
```

### 4.4 Create additional campuses

Repeat the same call with a different `name` and `code`. Then decide which
users need access to each campus. A user's `campus_id` is their default campus.
Extra campus access is granted through `scope_assignments`, described in
section 6.4.

---

## 5. Phase 3: Configure the campus

### 5.1 What is configurable through the API

The campus update endpoint accepts:

- `name`
- `code`
- `type`
- `email`
- `phone`
- `whatsapp`
- `website`
- `address`
- `is_active`

It does **not** accept `settings`, `academic_model`, `term_system`,
`grading_system`, or `credit_hours_enabled`, even though those columns exist on
the `campuses` table.

### 5.2 Academic configuration columns

The columns `academic_model`, `term_system`, `grading_system`, and
`credit_hours_enabled` are present in the schema but are not exposed by the API
and are not read anywhere in the application. Setting them has no functional
effect today. Academic behaviour is determined by the records you create:
academic years, terms, grade scales, exams, and credit registrations.

If an integration depends on these columns, setting them is a database change,
not an application configuration step:

```bash
cd /var/www/educourt/apps/api
php artisan tinker --execute="\App\Models\Campus::findOrFail($CAMPUS_ID)->update(['academic_model' => 'term', 'term_system' => 'semester', 'grading_system' => 'letter', 'credit_hours_enabled' => true]);"
```

Do not treat that command as enabling those features. It only writes metadata.

### 5.3 Logo and print branding

Print headers read one key from campus settings:

```text
campus.settings.logo
```

There is no upload endpoint and no settings form for it. To use a logo:

1. Put the image in the API public storage, for example
   `/var/www/educourt/apps/api/storage/app/public/branding/logo.png`.
2. Ensure the storage link exists:
   `php artisan storage:link`.
3. Set the setting to a URL the browser can load, for example
   `/storage/branding/logo.png`.

```bash
cd /var/www/educourt/apps/api
php artisan tinker --execute="\$c = \App\Models\Campus::findOrFail($CAMPUS_ID); \$s = \$c->settings ?? []; \$s['logo'] = '/storage/branding/logo.png'; \$c->settings = \$s; \$c->save();"
```

Verify by opening a fee-counter receipt or voucher print view, or any report
print view. The logo appears on those printed headers; it is not used in the
application navigation, and fee-plan voucher print views may not use it.

### 5.4 Currency, timezone, and locale

These are global, not per campus:

- The staff web formats money as `PKR` in `apps/web/src/lib/format.ts`.
- The API default payment currency is `PAYMENT_CURRENCY`, default `PKR`.
- Timezone is global `APP_TIMEZONE`; the code default is `UTC`, while the
  repository's `.env.example` sets `Asia/Karachi`. Confirm the production value
  before promising local-time behaviour.

A non-PKR institute needs a code change in the web formatter and in any
institute-specific reporting expectations. Do not promise per-institute currency
configuration.

---

## 6. Phase 4: Users, roles, and campus assignments

### 6.1 Role catalogue

| Role value | Label | Scope |
|---|---|---|
| `platform_admin` | Super User (Product Owner) | All institutions and campuses |
| `campus_admin` | Campus Admin | One campus |
| `institution_head` | Institution Head | All campuses in one institution, read-only plus finance approval |
| `principal` | Principal / Head | One campus, academic and operational oversight |
| `finance_head` | Finance Head | One campus, full finance |
| `accountant` | Accountant | One campus, day-to-day finance |
| `admissions_officer` | Admissions / Receptionist | One campus |
| `hr_officer` | HR Officer | One campus |
| `academic_coordinator` | Academic Coordinator | One campus |
| `teacher` | Teacher | Assigned classes |
| `exam_controller` | Exam Controller | One campus |
| `student_affairs_officer` | Student Affairs Officer | One campus |
| `counsellor` | Counsellor | One campus |
| `canteen_manager` | Canteen Manager | One campus |
| `sports_director` | Sports Director / Coach | One campus |
| `it_administrator` | IT Administrator | One campus |
| `librarian` | Librarian / Lab In-charge | One campus |
| `store_incharge` | Store In-charge | One campus |
| `transport_hostel_incharge` | Transport / Hostel In-charge | One campus |
| `parent_guardian` | Parent / Guardian | Linked children only |
| `student` | Student | Own record only |

Only a platform administrator may grant `platform_admin`, `campus_admin`, or
`institution_head`. A campus admin cannot create another campus admin.

### 6.2 Create the campus administrator

Use the platform administrator token.

```bash
CAMPUS_ADMIN=$(curl -sS -X POST "$API/users" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\": \"Main Campus Admin\",
    \"email\": \"campus.admin@example.edu\",
    \"password\": \"Replace-with-a-strong-password\",
    \"institution_id\": $INSTITUTION_ID,
    \"campus_id\": $CAMPUS_ID,
    \"roles\": [\"campus_admin\"]
  }")

CAMPUS_ADMIN_ID=$(echo "$CAMPUS_ADMIN" | jq -r '.data.id')
```

The API automatically creates a scope assignment for each granted role. For a
campus role, the scope is the user's campus.

Ask the campus administrator to change the password at first login and,
if two-factor authentication is enforced, complete enrolment first. See section
12.3 for the current 2FA limitation.

### 6.3 Create the institution head

The institution head must have an institution and no campus.

```bash
curl -sS -X POST "$API/users" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\": \"Institution Head\",
    \"email\": \"head@example.edu\",
    \"password\": \"Replace-with-a-strong-password\",
    \"institution_id\": $INSTITUTION_ID,
    \"roles\": [\"institution_head\"]
  }"
```

The API forces `campus_id` to `null` for this role. Create at least one
institution head before go-live if expenses of 100,000 or more will be
approved, because that tier is routed to this role.

### 6.4 Create staff accounts

Use the campus administrator token and send the campus header.

```bash
CAMPUS_TOKEN=$(curl -sS -X POST "$API/auth/login" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"email":"campus.admin@example.edu","password":"Replace-with-a-strong-password","device_name":"onboarding"}' \
  | jq -r '.token')

curl -sS -X POST "$API/users" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\": \"Finance Head\",
    \"email\": \"finance@example.edu\",
    \"password\": \"Replace-with-a-strong-password\",
    \"institution_id\": $INSTITUTION_ID,
    \"campus_id\": $CAMPUS_ID,
    \"roles\": [\"finance_head\"]
  }"
```

Repeat for each role in the catalogue. Use separate accounts. Do not share the
campus administrator account with teachers or finance staff.

### 6.5 Grant access to a second campus

Create the user with their default campus, then add a scope assignment. Use the
**platform administrator token** for this step: a campus administrator cannot
grant access to a campus they do not already control, and only the platform
administrator can grant `campus_admin` or `institution_head`.

```bash
curl -sS -X POST "$API/scope-assignments" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"user_id\": $USER_ID,
    \"role\": \"accountant\",
    \"institution_id\": $INSTITUTION_ID,
    \"campus_id\": $SECOND_CAMPUS_ID,
    \"scope_type\": \"campus\",
    \"scope_id\": $SECOND_CAMPUS_ID
  }"
```

Optional validity dates:

- `starts_at`
- `ends_at`

Expired assignments stop granting access on the next request. The user's
default campus remains the one stored in `users.campus_id`; the extra assignment
only widens what they may select with `X-Campus-Id`.

### 6.6 Staff records versus login accounts

`staff_members` is the HR record. `users` is the login and RBAC record. They are
separate. Creating a staff member does not create a login. To let a staff member
sign in:

1. Create the `user` with a role.
2. Create or update the `staff_member` and link `user_id` if you want the HR
   record and the login to be associated.

Do not assume a staff member can log in because an HR record exists.

### 6.7 Student and guardian portal accounts

There is no automated portal-account provisioning endpoint.

For a guardian:

1. Create a `user` with role `parent_guardian`, the institution, and the campus.
2. Link the guardian record to that user through the guardian update API:
   `PUT /guardians/{guardian}` with `{"user_id": <user id>}`.
3. The portal resolves children through `guardians.user_id`.

For a student:

1. Create a `user` with role `student`, the institution, and the campus.
2. Link the student record to that user. There is no API field for this, so use
   a controlled database update:

```bash
cd /var/www/educourt/apps/api
php artisan tinker --execute="\App\Models\Student::findOrFail($STUDENT_ID)->update(['user_id' => $PORTAL_USER_ID]);"
```

3. Verify the portal shows only the linked student.

Portal accounts are authorized by the linked student or guardian record, not by
staff module permissions.

### 6.8 Verify role assignments

```bash
curl -sS "$API/users/$USER_ID" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" | jq '.data | {id, email, roles, scope_assignments}'
```

Check that:

- The roles are exactly the intended ones.
- The campus is correct.
- The scope assignment exists.
- The user is active.

If RBAC was changed in `config/rbac.php` but the database was not re-seeded,
permissions will be missing. Deploys run `RbacSeeder`, but manual role edits
outside the API do not.

---

## 7. Phase 5: Academic structure

Create records in this order. Each record depends on the previous one.

```text
Academic year
  -> Terms
  -> Stages
  -> Classes
  -> Sections
  -> Subjects
  -> Class subjects
  -> Teaching assignments
  -> Periods and rooms
  -> Timetable
```

All endpoints in this section require `X-Campus-Id`.

### 7.1 Academic year

Dashboard: `/dashboard/academics/academic-years/new`

```bash
YEAR=$(curl -sS -X POST "$API/academic-years" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "2026-2027",
    "starts_on": "2026-04-01",
    "ends_on": "2027-03-31",
    "status": "active",
    "is_current": true
  }')

YEAR_ID=$(echo "$YEAR" | jq -r '.data.id')
```

Only one academic year per campus is current. Setting `is_current` clears the
previous current year for that campus.

### 7.2 Terms

Dashboard: `/dashboard/academics/terms/new`

```bash
curl -sS -X POST "$API/terms" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"academic_year_id\": $YEAR_ID,
    \"name\": \"Term 1\",
    \"sequence\": 1,
    \"starts_on\": \"2026-04-01\",
    \"ends_on\": \"2026-09-30\",
    \"is_current\": true
  }"
```

Terms must fall inside the academic year. Only one term per campus is current.

### 7.3 Stages

Dashboard: `/dashboard/academics/stages/new`

A stage is a grouping such as Primary, Middle, or Secondary.

```bash
STAGE=$(curl -sS -X POST "$API/stages" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Primary","sequence":1,"is_active":true}')

STAGE_ID=$(echo "$STAGE" | jq -r '.data.id')
```

### 7.4 Classes

Dashboard: `/dashboard/academics/classes/new`

```bash
CLASS=$(curl -sS -X POST "$API/classes" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"stage_id\": $STAGE_ID,
    \"name\": \"Grade 1\",
    \"sequence\": 1,
    \"capacity\": 40,
    \"is_active\": true
  }")

CLASS_ID=$(echo "$CLASS" | jq -r '.data.id')
```

### 7.5 Sections

Dashboard: `/dashboard/academics/sections/new`

```bash
SECTION=$(curl -sS -X POST "$API/sections" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"class_room_id\": $CLASS_ID,
    \"name\": \"A\",
    \"capacity\": 40,
    \"is_active\": true
  }")

SECTION_ID=$(echo "$SECTION" | jq -r '.data.id')
```

Section names are unique within a class.

### 7.6 Subjects

Dashboard: `/dashboard/academics/subjects/new`

```bash
SUBJECT=$(curl -sS -X POST "$API/subjects" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Mathematics",
    "type": "core",
    "credit_hours": 4,
    "weekly_periods": 5,
    "is_active": true
  }')

SUBJECT_ID=$(echo "$SUBJECT" | jq -r '.data.id')
```

Allowed subject types: `core`, `elective`, `optional`.

### 7.7 Class subjects

Dashboard: `/dashboard/academics/class-subjects/new`

Link a subject to a class, optionally with a teacher and weekly periods. This
record is used by timetable and exam setup. Create one for every class and
subject combination that will be taught.

### 7.8 Teaching assignments

Dashboard: `/dashboard/academics/teaching-assignments/new`

A teaching assignment links a teacher to a class, section, and subject. Teacher
visibility of student records depends on these assignments through
`TeacherScope`. A teacher with no assignment will not see class rosters or be
able to enter attendance or marks.

### 7.9 Periods and rooms

Dashboard: `/dashboard/academics/periods/new` and
`/dashboard/academics/rooms/new`

Create the daily period structure and physical rooms before building the
timetable.

### 7.10 Timetable

Dashboard: `/dashboard/timetable`

Create timetable slots and publish them. Unpublished slots are not visible to
teachers or portal users. Publishing requires `timetable.approve`.

### 7.11 Minimum academic data before students

Do not import students until these exist:

- Current academic year
- At least one stage, class, and section
- At least one subject and class subject
- At least one teacher account with a teaching assignment, if teachers will use
  attendance or marks

---

## 8. Phase 6: Finance foundation

This phase must be complete before any fee, expense, or payment is recorded.
Skipping it produces errors such as missing fiscal year, missing chart of
accounts, or missing income account on a fee head.

### 8.1 Create the fiscal year

Dashboard: `/dashboard/finance/journal` and related finance screens use the
fiscal year. There is no dedicated top-level fiscal-year page in the navigation,
so use the API unless your deployment exposes one.

```bash
FISCAL=$(curl -sS -X POST "$API/fiscal-years" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "FY 2026-2027",
    "starts_on": "2026-04-01",
    "ends_on": "2027-03-31",
    "status": "open",
    "is_current": true
  }')

FISCAL_ID=$(echo "$FISCAL" | jq -r '.data.id')
```

### 8.2 Seed the chart of accounts

This is the most commonly missed step. Creating a campus does not create a
chart of accounts.

The service creates 47 standard accounts, codes `1000` to `5060`, including:

- Assets: cash, bank, receivables, fixed assets
- Liabilities: vendor payable, accrued salaries, fees received in advance
- Equity: capital, retained surplus
- Income: tuition, admission, transport, other, late fee, donation, sales
- Expenses: salaries, utilities, teaching supplies, repairs, marketing, cost of
  goods sold

Run this once per campus:

```bash
cd /var/www/educourt/apps/api
php artisan tinker --execute="app(\App\Services\Accounting\DefaultChartOfAccounts::class)->seed(\App\Models\Campus::findOrFail($CAMPUS_ID));"
```

The operation is idempotent: existing accounts with the same campus and code are
left alone.

Verify:

```bash
curl -sS "$API/chart-of-accounts?per_page=100" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" | jq '.meta.total'
```

Expected count: 47.

There is no dashboard button for this seed. If the count is zero, finance
posting will fail.

### 8.3 Generate accounting periods

Dashboard: not exposed in the current navigation. Use the API.

Generate monthly periods for the whole fiscal year:

```bash
curl -sS -X POST "$API/accounting-periods/generate" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{\"fiscal_year_id\": $FISCAL_ID}"
```

This is idempotent per period name. It creates one open period per month,
clipped to the fiscal year end.

Period close, reopen, and lock are API actions:

- `POST /accounting-periods/{id}/close`
- `POST /accounting-periods/{id}/reopen`
- `POST /accounting-periods/{id}/lock`

They require `finance.approve`.

### 8.4 Create cash and bank accounts

Review the seeded cash and bank ledger accounts before collecting payments or
recording expenses. The chart of accounts seed provides `1010 Cash in Hand` and
`1020 Bank Account`. If you need a real bank-account record for reconciliation,
create one through `POST /bank-accounts` and link it to an asset ledger account.
There is no bank-account screen in the current navigation; use the API.

### 8.5 Default expense approval hierarchy

Expense approvals are amount-based:

| Amount | Required role |
|---|---|
| 0 to 1,000 | Accountant |
| 1,000.01 to 99,999.99 | Finance Head |
| 100,000 and above | Institution Head |

This is implemented by `ExpenseApprovalHierarchySeeder`, which creates three
active `expense` workflows per campus and deactivates other active expense
workflows on that campus.

**Critical:** the seeder only processes campuses that exist when it runs. A
campus created after the last deploy has no expense workflows. You must create
them for the new campus. Do not re-run the seeder blindly on a production
database that has custom expense workflows on existing campuses, because it
deactivates them.

Be aware of the failure mode: when no workflow matches an amount,
`ApprovalService::assertMayProceed` returns without error. The expense can be
posted with no approval and no warning. A missing workflow is therefore a
control bypass, not a blocked transaction.

For a new campus with the standard hierarchy, create the three workflows through
the API. The following loop creates them with codes that match the seeder:

```bash
create_expense_workflow() {
  local code="$1"
  local name="$2"
  local min="$3"
  local max="$4"
  local role="$5"
  local label="$6"

  curl -sS -X POST "$API/approval-workflows" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer $CAMPUS_TOKEN" \
    -H "X-Campus-Id: $CAMPUS_ID" \
    -H 'Content-Type: application/json' \
    -d "{
      \"code\": \"$code\",
      \"name\": \"$name\",
      \"entity_type\": \"expense\",
      \"min_amount\": $min,
      \"max_amount\": $max,
      \"is_active\": true,
      \"steps\": [{
        \"sequence\": 1,
        \"label\": \"$label\",
        \"required_role\": \"$role\"
      }]
    }"
}

create_expense_workflow "EXPENSE-ACCOUNTANT" "Expense Approval - Accountant" 0 1000 "accountant" "Accountant approval"

create_expense_workflow "EXPENSE-FINANCE-HEAD" "Expense Approval - Finance Head" 1000.01 99999.99 "finance_head" "Finance Head approval"

create_expense_workflow "EXPENSE-INSTITUTION-HEAD" "Expense Approval - Institution Head" 100000 null "institution_head" "Institution Head approval"
```

The last call sends `"max_amount": null`, which is valid. If your shell or JSON
encoder rejects it, build that payload with `jq` instead of string
interpolation.

Verify:

```bash
curl -sS "$API/approval-workflows?entity_type=expense&is_active=1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" | jq '.data[] | {code, min_amount, max_amount, steps}'
```

Expected: three workflows, each with one step.

### 8.6 Approval workflow reality check

- The expense detail page in the staff web app has an **Approval** panel. It
  lists the latest request, its workflow and steps, and lets permitted users
  submit a request, approve or reject the current step, or cancel a pending
  request.
- Creating an expense draft is allowed without approval.
- Posting or approving the expense calls `ApprovalService::assertMayProceed`.
  The post action is hidden while a request is pending or rejected.
- If a workflow matches and no approved request exists, the API returns a
  validation error containing:
  `This operation requires approval under workflow [Expense Approval - Finance Head]. Submit an approval request first.`
- Create the approval request through `POST /approvals` with
  `entity_type: "expense"` and `entity_id`, then approve it through
  `POST /approvals/{id}/approve`.

The end-to-end sequence is:

```bash
# Create the draft expense. A category must already exist.
EXPENSE_ID=$(curl -sS -X POST "$API/expenses" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"expense_date\": \"2026-04-10\",
    \"payee_name\": \"Example Vendor\",
    \"memo\": \"April supplies\",
    \"lines\": [{
      \"expense_category_id\": $EXPENSE_CATEGORY_ID,
      \"amount\": 1500,
      \"description\": \"Supplies\"
    }]
  }" | jq -r '.data.id')

# Submit the approval request for the amount tier that applies.
APPROVAL_ID=$(curl -sS -X POST "$API/approvals" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{\"entity_type\":\"expense\",\"entity_id\":$EXPENSE_ID,\"amount\":1500}" \
  | jq -r '.data.id')

# Approve as the role required by that tier.
curl -sS -X POST "$API/approvals/$APPROVAL_ID/approve" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $APPROVER_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d '{"comment":"Approved"}'

# Post the approved expense.
curl -sS -X POST "$API/expenses/$EXPENSE_ID/approve" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $APPROVER_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID"
```

The same sequence works from the UI: open the draft expense, use **Submit for
approval** in the Approval panel, approve the current step as the required
approver, then use **Approve expense** in the Actions panel to post it. The API
sequence above remains useful for automation and for entity types that do not
yet have a UI.

### 8.7 Opening balances

There is no dedicated opening-balance wizard. To enter opening balances:

1. Ensure the fiscal year and accounting periods exist.
2. Create a manual journal entry at `/dashboard/finance/journal/new`.
3. Debit and credit the appropriate accounts.
4. Post the entry. Posting requires `finance.approve`.

The entry must balance. Posted entries are immutable and can only be reversed.

Cash and bank opening balances belong in the balance-sheet accounts, not in fee
income. Do not use fee income to record an opening bank balance. If you create a
`bank_accounts` record, its `opening_balance` is metadata for reconciliation; it
does not create a journal entry.

### 8.8 Expense master data

Before recording expenses:

- Create expense categories at `/dashboard/finance/expense-categories`.
- Create vendors at `/dashboard/finance/vendors` if you track payables.
- Confirm the seeded expense accounts (`5010` to `5060`) match the categories.

An expense line requires an expense category that belongs to the same campus.

### 8.9 Fee heads and income accounts

Dashboard: `/dashboard/finance/fee-heads`

Every fee head can be linked to an income account. For the fee plan and voucher
flow, the income account is required at posting time. If a fee head has no
income account, voucher posting fails with a message that the fee head has no
income account.

Recommended mapping for a standard campus:

| Fee head | Income account |
|---|---|
| Tuition Fee | 4010 Tuition Fee Income |
| Admission Fee | 4020 Admission Fee Income |
| Transport Fee | 4030 Transport Fee Income |
| Late Fee | 4050 Late Fee Income |
| Exam Fee | 4090 Exam Fee Income |
| Other | 4040 Other Income |

Create fee heads with `POST /fee-heads`:

```bash
curl -sS -X POST "$API/fee-heads" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\": \"Tuition Fee\",
    \"code\": \"TUITION\",
    \"income_account_id\": $TUITION_ACCOUNT_ID,
    \"sort_order\": 1,
    \"is_active\": true
  }"
```

---

## 9. Phase 7: Fees and billing

Read section 0.3 first. The rest of this section describes both flows so the
implementer can choose deliberately.

### 9.1 Option A: Fee plans and fee vouchers, recommended for accounting

Dashboard:

- Fee plans: `/dashboard/finance/fee-plans`
- Fee vouchers: `/dashboard/fees`
- Voucher detail: `/dashboard/fees/[id]`

This flow posts double-entry journals and is visible in the family portal.

Required data:

- Academic year
- Class
- Fee heads with income accounts
- Fee plan with items and installments
- Students enrolled in the class

Create a fee plan:

```bash
PLAN=$(curl -sS -X POST "$API/fee-plans" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"academic_year_id\": $YEAR_ID,
    \"class_room_id\": $CLASS_ID,
    \"name\": \"Grade 1 Annual Fees\",
    \"is_active\": true,
    \"late_fee_type\": \"flat\",
    \"late_fee_amount\": 500,
    \"late_fee_grace_days\": 7,
    \"items\": [
      {\"fee_head_id\": $TUITION_HEAD_ID, \"amount\": 60000, \"is_optional\": false},
      {\"fee_head_id\": $ADMISSION_HEAD_ID, \"amount\": 10000, \"is_optional\": false}
    ],
    \"installments\": [
      {\"label\": \"First installment\", \"due_date\": \"2026-04-15\", \"percentage\": 50},
      {\"label\": \"Second installment\", \"due_date\": \"2026-09-15\", \"percentage\": 50}
    ]
  }")
```

Rules:

- Installment percentages must total 100.
- Fee plan names are unique per campus, academic year, and class.
- Late fee type values are `none`, `flat`, and `percent`.
- All item fee heads must belong to the same campus.

Generate vouchers through `POST /fee-vouchers/generate` with the academic year,
class, and fee plan. Generation posts the billing journal. If the fee head has
no income account, the request fails.

Generate a prorated voucher through `POST /fee-vouchers/generate-prorated`.

Voiding a voucher requires `fee.approve`. Late fee application also requires
`fee.approve`.

### 9.2 Option B: Fee structures and fee counter

Dashboard:

- Fee structure: `/dashboard/finance/accounts-receivable/fee-structure`
- Generate voucher: `/dashboard/finance/accounts-receivable/generate-voucher`
- Receipts: `/dashboard/finance/accounts-receivable/receipts`
- Reports: `/dashboard/finance/accounts-receivable/reports`

This flow is designed for a front desk. It supports monthly bulk generation,
per-student dues, receipts, and printing.

Create a fee structure with items that reference fee heads and a billing kind.
Allowed `billing_kind` values are `monthly`, `exam`, `one_time`, `other`,
`late_fee`, and `legacy_installment`.

```bash
curl -sS -X POST "$API/fee-structures" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"academic_year_id\": $YEAR_ID,
    \"class_room_id\": $CLASS_ID,
    \"name\": \"Grade 1 Fee Structure\",
    \"is_active\": true,
    \"items\": [
      {\"fee_head_id\": $TUITION_HEAD_ID, \"name\": \"Monthly tuition\", \"billing_kind\": \"monthly\", \"amount\": 5000},
      {\"fee_head_id\": $ADMISSION_HEAD_ID, \"name\": \"Admission fee\", \"billing_kind\": \"one_time\", \"amount\": 10000}
    ]
  }"
```

Generate monthly charges in bulk:

```bash
curl -sS -X POST "$API/fee-counter/generate-bulk" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"academic_year_id\": $YEAR_ID,
    \"class_room_id\": $CLASS_ID,
    \"period_year\": 2026,
    \"period_month\": 4,
    \"due_date\": \"2026-04-15\"
  }"
```

Collect a payment:

```bash
curl -sS -X POST "$API/fee-receipts" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{
    \"student_id\": $STUDENT_ID,
    \"fee_charge_id\": $CHARGE_ID,
    \"payment_date\": \"2026-04-10\",
    \"amount\": 5000,
    \"method\": \"cash\",
    \"reference\": \"Counter receipt\"
  }"
```

Payment method values: `cash`, `bank_transfer`, `cheque`, `online`, `card`,
`other`.

### 9.3 Known limitations of the counter flow

- Fee charges and receipts do not create journal entries.
- The family portal reads legacy `fee_vouchers`, not `fee_charges`.
- A charge with payments cannot be voided. The code tells the operator to
  reverse the receipt first, but there is no receipt reversal or void endpoint.
  The refund endpoint applies to legacy fee-plan `fee_payments`, not to counter
  `fee_receipts`, so it cannot correct a counter receipt. Correcting a posted
  counter receipt currently requires a controlled database correction, not an
  API action.
- A charge void is a status change, not a journal reversal.
- Test counter receipts in staging, not in production.

If the institute uses the counter flow and also needs accurate accounts, finance
must post manual journals or use the fee plan flow. Document this in the
institute's accounting policy.

### 9.4 Discounts, concessions, scholarships, and fines

These modules exist and are campus-scoped. Configure them after the basic fee
plan and voucher flow is working:

- Scholarships and concessions: `/dashboard/scholarships` (schemes, awards,
  revocation).
- Fines: API only (`/fine-rules` and `/fines`); there is no fines screen in the
  current navigation.

Do not configure discounts before fee heads and fee plans exist, because
discount application depends on the fee plan and academic year.

### 9.5 Fee reminders

Fee reminders use `REMINDER_GATEWAY` and `REMINDER_CHANNEL`.

- Default gateway is `log`, which writes to the Laravel log.
- The only implemented gateways are `log` and `whatsapp`.
- Setting `REMINDER_GATEWAY=mail` does not send email; it falls through to the
  log gateway.
- WhatsApp requires a configured sender and guardian consent.

---

## 10. Phase 8: Students and admissions

### 10.1 Admissions workflow

Dashboard: `/dashboard/admissions`

Statuses:

```text
enquiry -> applied -> under_review -> approved -> enrolled
```

API actions:

- `POST /admissions` creates an enquiry or application.
- `POST /admissions/{id}/submit` moves it to `under_review`.
- `POST /admissions/{id}/approve` moves it to `approved`.
- `POST /admissions/{id}/reject` moves it to `rejected`.
- `POST /admissions/{id}/enroll` creates the student and enrollment.

Enrollment requires:

- `academic_year_id`
- `class_room_id`
- Optional `section_id`, `roll_number`, `gender`, `admission_no`,
  `admission_date`, `starts_on`

An enrolled admission cannot be edited or deleted.

### 10.2 Direct student creation

Dashboard: `/dashboard/students/new`

Required fields:

- `first_name`
- `last_name`
- `gender`

Optional profile fields include date of birth, blood group, nationality,
religion, category, national id, email, phone, address, city, previous school,
admission date, status, photo path, and notes.

Guardians must exist before they can be attached. A guardian requires `name` and
`phone`.

Enrollment in the same request requires an academic year and class.

### 10.3 CSV import

Dashboard: `/dashboard/students`, then the **Import CSV** button.

Required headers:

```text
first_name,last_name,gender
```

Accepted aliases include `firstname`, `surname`, `sex`, `admission_number`,
`dob`, `parent_name`, `father_name`, `parent_phone`, `class`, `section`, and
`academic_year`.

Limits:

- Maximum 5,000 rows per file.
- Preview first, then commit.
- Rows can be skipped when invalid.
- Guardian records are created or matched from the guardian columns.

The import endpoint requires `student.import`.

### 10.4 Guardians and portal links

Guardians are campus-scoped. Create them through `/dashboard/students` or
`POST /guardians`. Link a guardian to a portal user through the guardian update
`user_id` field.

### 10.5 Enrollment, promotion, and withdrawal

- Enrollment links a student to an academic year, class, and section.
- Promotion moves students to the next academic year or class.
- Withdrawal updates the student status and closes active enrollments.
- A transferred student's enrollments are marked transferred.

Run promotion only after the target academic year and classes exist.

---

## 11. Phase 9: Optional operational modules

These modules do not block basic go-live. Enable them only after the core
academic and finance data is correct.

| Module | Minimum setup | Dashboard |
|---|---|---|
| Attendance | Classes, sections, students, teaching assignments | `/dashboard/attendance` |
| Exams | Exam types, grade scales, exams, papers, marks | `/dashboard/exams` |
| HR and payroll | Staff members, designations, departments, salary structures | `/dashboard/hr/staff`, `/dashboard/hr/payroll` |
| Library | Catalogues, books, memberships | `/dashboard/library` |
| Inventory | Stores, items, stock | `/dashboard/inventory` |
| Transport | Routes, vehicles, stops, allocations | `/dashboard/transport` |
| Hostel | Hostels, rooms, allocations | `/dashboard/hostel` |
| Canteen | Items, stock, wallets | `/dashboard/canteen` |
| Sports | Teams, fixtures, equipment | `/dashboard/sports` |
| Student affairs | Clubs, events, conduct, complaints, counselling | `/dashboard/student-affairs` |
| Circulars and messaging | Audiences and templates | `/dashboard/circulars`, `/dashboard/messaging` |
| IT operations | Assets, helpdesk, changes, backups | `/dashboard` IT sections |

Create grade scales and exam types before entering marks. Create salary
components and structures before running payroll. Create inventory stores before
recording stock.

---

## 12. Phase 10: Notifications, integrations, and security

### 12.1 Email

Email is configured globally in `apps/api/.env`:

```text
MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=...
MAIL_FROM_NAME=...
```

The default `MAIL_MAILER=log` does not deliver email. Password reset links use
Laravel mail and `FRONTEND_URL`. Set `FRONTEND_URL` to the staff web origin so
reset links point to the correct host.

There is no per-institute SMTP. A new institute uses the platform mail identity.

Verify email by requesting a password reset for a non-production test account
and confirming delivery.

### 12.2 Notifications

In-app notifications are stored in `app_notifications` with a pending status.
Marking attendance queues an absence notice for each absent student, but nothing
dispatches the queue on a schedule. Staff must trigger sending through the
notifications or messaging screens, or through the API.

The notification gateway uses the same `REMINDER_GATEWAY` setting:

- `log` records the notification without external delivery.
- `whatsapp` sends through the WhatsApp Cloud API and requires consent.

### 12.3 Two-factor authentication

2FA is configured globally:

```text
ENFORCE_TWO_FACTOR=true
```

When enforcement is on, these roles must have 2FA enabled before login:

- Platform admin
- Campus admin
- Institution head
- Finance head
- Accountant
- HR officer
- IT administrator

There is currently no 2FA enrolment screen in the staff web UI. The API exposes
enable, confirm, disable, and recovery-code endpoints, but an operator must use
the API to enrol. If you enable enforcement without a plan for enrolment, those
users will be locked out.

Recommended rollout:

1. Leave enforcement off.
2. Enrol privileged users through the API.
3. Confirm each user can complete a challenge.
4. Then set `ENFORCE_TWO_FACTOR=true` and restart the API workers.

### 12.4 SSO

SSO is per institution, stored in `sso_providers`, and managed at
`/dashboard/settings/sso-providers`.

Supported flow: OpenID Connect authorization code with PKCE, state, and nonce.
Optional just-in-time provisioning.

To configure:

1. Create the provider with issuer, client id, client secret, redirect URI, and
   scopes.
2. Set the redirect URI in the identity provider to the EduCourt callback.
3. Enable the provider.
4. Test with a non-admin account before enabling for all staff.

SSO is for staff. Portal users continue to use email and password unless a
separate portal SSO flow is implemented.

### 12.5 WhatsApp

WhatsApp is configured through a Meta app, a sender, an integration policy, and
guardian consent.

Dashboard: `/dashboard/settings/whatsapp`

Steps:

1. Create a Meta WhatsApp Business app.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_ID`,
   `WHATSAPP_APP_SECRET`, and `WHATSAPP_VERIFY_TOKEN` in the API environment as
   needed.
3. Run the one-time bootstrap if using the platform-managed sender:

```bash
cd /var/www/educourt/apps/api
php artisan whatsapp:bootstrap --institution=$INSTITUTION_ID
```

4. Configure the webhook in Meta:

```text
GET  /api/v1/webhooks/whatsapp/{appKey}
POST /api/v1/webhooks/whatsapp/{appKey}
```

5. Verify the sender in the WhatsApp settings screen.
6. Import consent evidence. Absence of evidence is not consent.

```bash
php artisan whatsapp:import-consent $INSTITUTION_ID \
  --file=/path/to/consented-numbers.csv \
  --category=utility
```

Only numbers in the evidence file are marked opted in. All others stay pending
and are blocked from messaging.

Token expiry is reported daily at 02:00 by the scheduler:

```bash
php artisan whatsapp:tokens
```

### 12.6 Payment gateway

Only a `manual` gateway is implemented. `config/payments.php` defines a default
gateway and a webhook secret, but there is no JazzCash, EasyPaisa, Stripe, or
other live gateway driver in the repository.

Payment webhooks:

```text
POST /api/v1/webhooks/payments/{gateway}
```

The webhook is verified with an HMAC-SHA256 signature of the raw body using
`PAYMENT_WEBHOOK_SECRET`. Do not enable a gateway without implementing and
testing its driver.

### 12.7 Scheduler and queue

The scheduler currently runs only the WhatsApp token report. If you add jobs,
ensure the system cron exists:

```cron
* * * * * cd /var/www/educourt/apps/api && php artisan schedule:run >> /dev/null 2>&1
```

A queue worker should run if any queued jobs are added. The repository does not
define a queue worker in `ecosystem.config.js`; confirm the production process
manager has one before relying on queued work.

### 12.8 File uploads

Uploads are structurally validated by default:

```text
UPLOAD_SCANNER=strict
```

Strict mode validates magic bytes and file structure. It does not run antivirus.
For full malware scanning, install ClamAV and set:

```text
UPLOAD_SCANNER=clamav
```

Do not set `UPLOAD_SCANNER=off` in production.

---

## 13. Phase 11: Branding, domains, and institute-specific settings

### 13.1 What can be branded today

- Institution name and campus name, displayed throughout the UI and printouts.
- Institution and campus address, phone, and email, displayed on printouts.
- Campus logo on fee-counter voucher and receipt printouts, and on report
  printouts, through `campus.settings.logo`.
- Browser-local appearance preferences for each user. These are not institute
  branding and are not shared.

### 13.2 What cannot be branded without code

- Application name, logo, colours, and favicon in the navigation and login page.
- Per-institute email sender name and address.
- Per-institute custom CSS or themes.
- Per-institute portal branding.
- Per-institute domain.

`institutions.settings` and `campuses.settings` are JSON columns, but the only
setting read by the application is `campus.settings.logo`. Writing other keys
has no effect.

### 13.3 Custom domain

A custom domain is an infrastructure change:

1. Add DNS records for the new domain.
2. Add an Nginx server block and TLS certificate.
3. Point the domain to the staff web process or the family portal process.
4. Update `APP_URL`, `FRONTEND_URL`, and any callback URLs.
5. Rebuild the affected Next.js app if the public base URL is compiled in.

There is no in-app domain mapping per institution. If multiple institutes need
separate domains, use separate deployments or add host-based routing, which is a
code and infrastructure change.

### 13.4 Institute-specific settings checklist

| Setting | Where | Supported |
|---|---|---|
| Legal name | Institution record | Yes, stored |
| Display name | Institution and campus records | Yes |
| Address and contact | Institution and campus records | Yes |
| Logo on printouts | `campus.settings.logo` | Limited, manual |
| Currency | Global code and config | No per-institute |
| Timezone | Global `APP_TIMEZONE` | No per-institute |
| Academic model labels | Not read by code | No |
| Brand colours | Not implemented | No |
| Custom domain | Nginx and DNS | No in-app |

---

## 14. Phase 12: Subscription and security verification

### 14.1 Subscription state

The `institutions` table has:

- `plan`, default `standard`
- `status`, default `active`
- `trial_ends_at`
- `max_campuses`

None of these are enforced. There is no middleware that blocks login, campus
creation, or writes when a subscription is expired or over its campus limit.

If subscriptions must be enforced:

- Add a middleware or policy check, or
- Enforce manually through an operational process, or
- Add a scheduled job that deactivates institutions.

Do not tell an institute that its plan limits are enforced by the software. They
are not.

### 14.2 Isolation verification

Run these checks after creating the first campus and users:

```bash
cd /var/www/educourt/apps/api
php artisan test --filter=TenantIsolationTest
php artisan test --filter=InstitutionHeadCampusScopeTest
php artisan test --filter=TeacherScopeTest
php artisan test --filter=PortalTest
php artisan test --filter=RbacTest
```

Manual checks:

1. Sign in as campus A admin. Request a campus B student by id. Expect `404` or
   `403`, never the record.
2. Sign in as a teacher with one class. Request a student outside that class.
   Expect `403`.
3. Sign in as a portal student. Request another student. Expect `404`.
4. Sign in as a user with no campus assignment. Request a campus-scoped list
   without `X-Campus-Id`. Expect `403`.
5. Sign in as an institution head. List campuses. Expect all campuses in the
   institution, but write actions should fail.

### 14.3 Account hygiene

- One named account per person. No shared logins.
- Platform admin accounts limited to the smallest possible group.
- Deactivate leavers through the user API; this revokes tokens.
- Do not reuse passwords from demo or test data.
- Do not enable `SEED_DEMO_DATA` in production.
- Do not run `EduCourtTestInstituteSeeder` in production.

### 14.4 Audit trail

The application logs activity through `activity_log`, including authentication,
user provisioning, RBAC changes, and model changes on many entities. Audit
visibility requires `audit.view`.

Do not delete audit rows during onboarding.

---

## 15. Phase 13: Testing, deployment, and go-live

### 15.1 Local or staging test commands

Run these in a local or staging checkout, not on the production server.

```bash
cd apps/api
php artisan test
./vendor/bin/pint --test
```

The test configuration uses a dedicated `eis_testing` database and
`QUEUE_CONNECTION=sync`; create the test database before running the suite.

The feature test suite covers tenant isolation, RBAC, approvals, fee billing,
fee receipts, portal access, and accounting periods.

Minimum targeted suite before go-live:

```bash
php artisan test --filter=TenantIsolationTest
php artisan test --filter=RbacTest
php artisan test --filter=ApprovalWorkflowTest
php artisan test --filter=FeeBillingTest
php artisan test --filter=FeeReceiptPaymentTest
php artisan test --filter=PortalTest
php artisan test --filter=AccountingPeriodTest
```

### 15.2 Pre-deployment checks

```bash
cd /var/www/educourt
git status --short
git log --oneline -5
cd apps/api
php artisan migrate:status
```

Expected: no uncommitted changes on the server, and no failed migrations.

### 15.3 Deploy

The production deploy script backs up the database before migrating and refuses
to run destructive migrations unless explicitly overridden.

```bash
git push origin master
ssh -i /tmp/educourt_deploy_key root@161.97.107.236 'bash /root/deploy-edu.sh'
```

The script:

1. Pulls `origin/master`.
2. Dumps and verifies a MySQL backup.
3. Scans new migrations for destructive SQL.
4. Runs pending migrations.
5. Runs `RbacSeeder`.
6. Installs Composer dependencies.
7. Caches config, routes, and views.
8. Builds both Next.js apps.
9. Restarts PM2.
10. Checks API and web health.

It does not run demo seeders and does not delete data.

### 15.4 Post-deployment verification

```bash
curl -fsS http://127.0.0.1:8080/up
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/login
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002/login
curl -fsS -o /dev/null -w '%{http_code}\n' https://educourt.asifent.com/login
```

Then verify:

- Platform admin login.
- Campus admin login and campus switch.
- One academic year, class, and section visible.
- Chart of accounts count is 47 for the new campus.
- Three expense workflows are active.
- A test fee head exists with an income account.
- A test student can be created in the correct campus.
- A test receipt can be printed. Do not rely on an API reversal; there is no
  receipt reversal endpoint.
- A family portal account sees only its linked student.

### 15.5 Rollback

The deploy script creates a timestamped backup in `/root/backups`. If a release
must be rolled back:

1. Restore the code to the previous commit.
2. Restore the database only if the migration cannot be reversed.
3. Rebuild and restart PM2.

Do not run `migrate:rollback` on production without a verified backup and a
review of the migration's `down` method.

### 15.6 Routine backups

The codebase only creates a backup during deploy. There is no scheduled database
backup job in the repository. Add an OS-level cron or managed backup service.

A simple daily backup:

```bash
mysqldump --no-defaults --no-tablespaces -u educourt -p educourt | gzip > /root/backups/educourt-$(date +%F).sql.gz
```

Store backups off the application server and test restoration periodically.

---

## 16. Automation gaps and required code changes

The following gaps are confirmed in the current code. They are not
configuration mistakes.

| Gap | Impact | Workaround | Proper fix |
|---|---|---|---|
| No campus-created provisioning event | New campus has no chart of accounts, expense workflows, or fee defaults; missing workflows silently bypass approval | Run the manual steps in sections 8.2 and 8.5 | Add an observer or provisioning command |
| No settings API | Cannot set logo, academic metadata, or branding from the UI | Tinker or SQL | Add settings endpoints |
| Approvals UI covers expenses only | Fee refunds, other income, tax returns, payroll runs and payment vouchers still need the API | Use the API | Extend the approval panel to the other approvable screens |
| No 2FA enrolment UI | Enforcing 2FA can lock out privileged users | Enrol through the API before enforcing | Add profile enrolment |
| Counter fees do not post journals | Trial balance omits counter receipts | Use fee plans/vouchers or post manual journals | Add journal posting to the counter service |
| Portal reads legacy vouchers | Counter charges are invisible to parents | Use fee plans/vouchers or update the portal query | Point the portal at `fee_charges` |
| Subscription not enforced | Expired plans and campus limits do not block access | Manual process | Add middleware and billing checks |
| Per-institute currency and timezone unsupported | Non-PKR or non-UTC institutes see incorrect formatting | Global change | Add tenant settings and formatters |
| Per-institute branding unsupported | Only a print logo can be changed | Manual logo | Add a branding module |
| No scheduled backups in code | Data loss risk between deploys | OS cron | Add a backup job and monitoring |
| No receipt reversal endpoint | Posted counter receipts cannot be voided through the API | Controlled database correction only | Add a reversal endpoint |
| Student portal link has no API | Student portal provisioning is manual SQL | Tinker | Add a link endpoint |
| No public self-registration | All accounts must be provisioned | Manual provisioning | Keep as designed for a school SaaS |

Do not promise these capabilities during onboarding unless the code is changed
and tested.

---

## 17. Common onboarding mistakes

1. **Creating a campus and expecting a chart of accounts.** It does not happen.
   Finance posting fails until `DefaultChartOfAccounts::seed()` is run.
2. **Forgetting the `X-Campus-Id` header.** Campus-scoped routes return `403`.
3. **Creating a campus administrator with a campus administrator token.**
   Restricted roles require a platform administrator.
4. **Creating an institution head with a campus id.** The API nulls it, but the
   user must be created with an institution.
5. **Using the counter flow and expecting a trial balance.** Counter receipts do
   not post journals.
6. **Using the counter flow and expecting the parent portal to show fees.**
   The portal reads legacy vouchers.
7. **Mixing fee plans and fee structures for the same class and period.**
   This creates duplicate receivables.
8. **Creating fee heads without income accounts.** Voucher posting fails.
9. **Not creating expense workflows for a new campus.** Expenses post without
   the intended approval because no workflow matches.
10. **Not creating an institution head.** When the high-value workflow exists,
    expenses of 100,000 or more have no one who can approve them.
11. **Enabling 2FA enforcement without enrolling users.** Privileged users are
    locked out.
12. **Expecting reminder emails from `REMINDER_GATEWAY=mail`.** Only `log` and
    `whatsapp` are implemented.
13. **Expecting WhatsApp messages without consent.** Unconsented numbers are
    blocked by design.
14. **Running demo or test seeders in production.** This creates known-password
    accounts and test data.
15. **Assuming the subscription plan blocks access.** It does not.
16. **Assuming a staff HR record creates a login.** It does not.
17. **Assuming a student record creates a portal login.** It does not.
18. **Recording a live test receipt and expecting to reverse it.** There is no
    receipt reversal endpoint.
19. **Importing students before classes and sections exist.** Imports fail or
    create students without enrollment.
20. **Creating teachers without teaching assignments.** Teachers cannot see
    their classes.
21. **Promising a custom domain or institute colours.** Both require code and
    infrastructure work.

---

## 18. Go-live checklist

### Institution and campus

- [ ] Institution created and active.
- [ ] All campuses created and active.
- [ ] Institution contact details correct.
- [ ] Campus contact details and WhatsApp number correct.
- [ ] Campus logo set if print branding is required.
- [ ] Currency and timezone expectations documented, including any mismatch.

### Users and access

- [ ] At least one platform administrator, kept to a small group.
- [ ] One campus administrator per campus.
- [ ] One institution head, if high-value expenses will be approved.
- [ ] Finance head and accountant accounts created.
- [ ] Admissions, academic coordinator, teachers, and exam controller created as
      needed.
- [ ] Multi-campus users have scope assignments.
- [ ] Leavers deactivated.
- [ ] 2FA decision made and privileged users enrolled if enforcing.

### Academic structure

- [ ] Current academic year created.
- [ ] Terms created.
- [ ] Stages, classes, and sections created.
- [ ] Subjects and class subjects created.
- [ ] Teaching assignments created for all teachers.
- [ ] Periods and rooms created.
- [ ] Timetable created and published if in scope.

### Finance

- [ ] Fiscal year created and current.
- [ ] Chart of accounts seeded, expected 47 accounts.
- [ ] Accounting periods generated.
- [ ] Cash and bank ledger accounts reviewed; bank-account records created if
      reconciliation needs them.
- [ ] Opening balances posted through a balanced journal, if applicable.
- [ ] Expense approval workflows created for the campus.
- [ ] Fee heads created and mapped to income accounts.
- [ ] Fee plan or fee structure created for each class, depending on the chosen
      flow.
- [ ] One test voucher or charge generated and reconciled.
- [ ] One test receipt printed in staging; production correction procedure
      agreed, because there is no receipt reversal endpoint.
- [ ] Trial balance checked against the chosen fee flow.

### Students

- [ ] Admissions workflow tested from enquiry to enrollment.
- [ ] Students created or imported with valid classes and sections.
- [ ] Guardians created and linked.
- [ ] Portal accounts created and linked for a pilot group.
- [ ] Student photos and documents uploaded if required.

### Integrations

- [ ] SMTP configured and password reset tested.
- [ ] `FRONTEND_URL` points to the staff web origin.
- [ ] WhatsApp sender configured and webhook verified, if in scope.
- [ ] WhatsApp consent evidence imported.
- [ ] SSO provider configured and tested, if in scope.
- [ ] Payment gateway decision documented; manual only unless a driver is built.

### Security and operations

- [ ] Tenant isolation tests pass.
- [ ] Manual cross-campus access checks pass.
- [ ] Subscription enforcement decision documented.
- [ ] Backup schedule configured and restoration tested.
- [ ] Scheduler cron installed.
- [ ] Queue worker running if queued jobs are in use.
- [ ] Health checks monitored.
- [ ] Audit log access confirmed.

### Deployment

- [ ] Code deployed from `master`.
- [ ] Database backup created and verified.
- [ ] Post-deploy health checks pass.
- [ ] PM2 processes online.
- [ ] No demo or test seeder run in production.
- [ ] Rollback owner and contact list agreed.

---

## Appendix A: End-to-end bootstrap script

This script is a template. Replace every placeholder before running it. It
assumes a platform administrator token and an empty institution.

```bash
set -euo pipefail

API="https://educourt.asifent.com/mobile-api/v1"
PLATFORM_TOKEN="$PLATFORM_TOKEN"

INSTITUTION_ID=0
CAMPUS_ID=0

# Create the institution.
INSTITUTION_ID=$(curl -sS -X POST "$API/institutions" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $PLATFORM_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Example Institute","email":"info@example.edu"}' \
  | jq -r '.data.id')

# Create the campus.
CAMPUS_ID=$(curl -sS -X POST "$API/campuses" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $PLATFORM_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"institution_id\":$INSTITUTION_ID,\"name\":\"Main Campus\",\"type\":\"school\"}" \
  | jq -r '.data.id')

# Create the campus administrator.
CAMPUS_ADMIN_PASSWORD="ChangeMe-123456"

curl -sS -X POST "$API/users" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $PLATFORM_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Campus Admin\",\"email\":\"campus.admin@example.edu\",\"password\":\"$CAMPUS_ADMIN_PASSWORD\",\"institution_id\":$INSTITUTION_ID,\"campus_id\":$CAMPUS_ID,\"roles\":[\"campus_admin\"]}"

# Sign in as the campus administrator for campus-scoped calls.
CAMPUS_TOKEN=$(curl -sS -X POST "$API/auth/login" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"campus.admin@example.edu\",\"password\":\"$CAMPUS_ADMIN_PASSWORD\",\"device_name\":\"onboarding\"}" \
  | jq -r '.token')

# Create the current academic year.
YEAR_ID=$(curl -sS -X POST "$API/academic-years" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"2026-2027","starts_on":"2026-04-01","ends_on":"2027-03-31","status":"active","is_current":true}' \
  | jq -r '.data.id')

# Create the fiscal year.
FISCAL_ID=$(curl -sS -X POST "$API/fiscal-years" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"FY 2026-2027","starts_on":"2026-04-01","ends_on":"2027-03-31","status":"open","is_current":true}' \
  | jq -r '.data.id')

# Generate accounting periods.
curl -sS -X POST "$API/accounting-periods/generate" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CAMPUS_TOKEN" \
  -H "X-Campus-Id: $CAMPUS_ID" \
  -H 'Content-Type: application/json' \
  -d "{\"fiscal_year_id\":$FISCAL_ID}"
```

The chart of accounts seed is intentionally not in the shell script because it
runs through `artisan`, not HTTP:

```bash
cd /var/www/educourt/apps/api
php artisan tinker --execute="app(\App\Services\Accounting\DefaultChartOfAccounts::class)->seed(\App\Models\Campus::findOrFail($CAMPUS_ID));"
```

---

## Appendix B: Data map

| Area | Primary tables |
|---|---|
| Institution | `institutions` |
| Campus | `campuses` |
| Users and access | `users`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `scope_assignments` |
| Staff | `staff_members`, `staff_documents`, `staff_salaries`, `designations`, `departments` |
| Academic structure | `academic_years`, `terms`, `stages`, `class_rooms`, `sections`, `subjects`, `class_subjects`, `teaching_assignments`, `periods`, `rooms`, `timetable_slots` |
| Admissions | `admissions`, `admission_documents` |
| Students | `students`, `guardians`, `student_guardian`, `student_enrollments`, `student_documents` |
| Fee setup | `fee_heads`, `fee_structures`, `fee_structure_items` |
| Fee billing | `fee_plans`, `fee_plan_items`, `fee_installments`, `fee_vouchers`, `fee_voucher_lines`, `fee_payments` |
| Fee counter | `fee_charges`, `fee_charge_lines`, `fee_receipts`, `fee_receipt_allocations` |
| Fee refunds | `fee_refunds` |
| Accounting | `chart_of_accounts`, `fiscal_years`, `accounting_periods`, `journal_entries`, `journal_lines` |
| Expenses | `expenses`, `expense_lines`, `expense_payments`, `expense_categories`, `vendors` |
| Approvals | `approval_workflows`, `approval_workflow_steps`, `approval_requests`, `approval_request_actions` |
| Notifications | `app_notifications`, `notification_*` |
| WhatsApp | `meta_app_connections`, `whatsapp_senders`, `whatsapp_consents`, `whatsapp_usage`, `whatsapp_message_events`, `whatsapp_rate_cards`, `integration_policies` |
| SSO | `sso_providers`, `sso_identities` |
| Audit | `activity_log` |

---

## Appendix C: Dashboard path map

| Area | Path |
|---|---|
| Dashboard | `/dashboard` |
| Institutions | `/dashboard/institutions` |
| Institution list | `/dashboard/institutions/list` |
| New institution | `/dashboard/institutions/list/new` |
| Campuses | `/dashboard/institutions/campuses` |
| New campus | `/dashboard/institutions/campuses/new` |
| Users | `/dashboard/users` |
| New user | `/dashboard/users/new` |
| Roles | `/dashboard/roles` |
| Academic structure | `/dashboard/academics` |
| Academic years | `/dashboard/academics/academic-years` |
| Terms | `/dashboard/academics/terms` |
| Stages | `/dashboard/academics/stages` |
| Classes | `/dashboard/academics/classes` |
| Sections | `/dashboard/academics/sections` |
| Subjects | `/dashboard/academics/subjects` |
| Class subjects | `/dashboard/academics/class-subjects` |
| Teaching assignments | `/dashboard/academics/teaching-assignments` |
| Periods | `/dashboard/academics/periods` |
| Rooms | `/dashboard/academics/rooms` |
| Timetable | `/dashboard/timetable` |
| Admissions | `/dashboard/admissions` |
| Students | `/dashboard/students` |
| Promotions | `/dashboard/promotions` |
| Finance overview | `/dashboard/finance` |
| Accounts receivable | `/dashboard/finance/accounts-receivable` |
| Fee structure | `/dashboard/finance/accounts-receivable/fee-structure` |
| Generate voucher | `/dashboard/finance/accounts-receivable/generate-voucher` |
| Receipts | `/dashboard/finance/accounts-receivable/receipts` |
| AR reports | `/dashboard/finance/accounts-receivable/reports` |
| Student fee report | `/dashboard/finance/accounts-receivable/students` |
| Fee heads | `/dashboard/finance/fee-heads` |
| Fee plans | `/dashboard/finance/fee-plans` |
| Fee vouchers | `/dashboard/fees` |
| Chart of accounts | `/dashboard/finance/accounts` |
| Journal | `/dashboard/finance/journal` |
| Trial balance | `/dashboard/finance/trial-balance` |
| Expenses | `/dashboard/finance/expenses` |
| Other income | `/dashboard/finance/other-income` |
| Vendors | `/dashboard/finance/vendors` |
| Expense categories | `/dashboard/finance/expense-categories` |
| Budgets | `/dashboard/finance/budgets` |
| Staff | `/dashboard/hr/staff` |
| Payroll | `/dashboard/hr/payroll` |
| Attendance | `/dashboard/attendance` |
| Exams | `/dashboard/exams` |
| Settings | `/dashboard/settings` |
| SSO providers | `/dashboard/settings/sso-providers` |
| WhatsApp settings | `/dashboard/settings/whatsapp` |
| Appearance | `/dashboard/settings/appearance` |
| Audit | `/dashboard/audit` |

---

## Appendix D: Ownership and sign-off

Before go-live, record the owner for each area:

| Area | Owner | Sign-off |
|---|---|---|
| Institution and campus data | | |
| Users and roles | | |
| Academic structure | | |
| Finance setup | | |
| Fee policy and billing flow | | |
| Admissions and student data | | |
| Integrations | | |
| Security and access review | | |
| Backups and operations | | |
| Go-live approval | | |

Do not mark the implementation complete until the go-live checklist in section
18 is fully signed off.
