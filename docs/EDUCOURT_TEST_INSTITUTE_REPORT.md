# EduCourt Test Institute - Demo Dataset and Verification Report

Date: 2026-11-12
Seeder: `apps/api/database/seeders/TestInstitute/EduCourtTestInstituteSeeder.php`
Commit: `5640a2b feat(seeders): add EduCourt Test Institute demo dataset`
Deployed to production and verified there with 98/98 automated checks passing.

## 1. Purpose

Provide a minimal, fully wired institute for demos and manual testing: two
campuses, two campus administrators, two teachers, two students, four parents,
and roughly two records per operational module, with realistic cross-links so
every list, portal, and permission boundary can be exercised.

The seeder is additive and idempotent. Re-running it does not duplicate rows.

## 2. Environment

| Item | Value |
| --- | --- |
| Web admin | https://educourt.asifent.com |
| Parent/student portal | https://educourt-parent.asifent.com |
| API base | https://educourt.asifent.com/api/v1 |
| Production server API | `127.0.0.1:8080` (php-fpm) |
| Local verification DB | `eis_seedtest` (MySQL) |
| Test password | `Password@123` |

## 3. Institution and Campuses

| Level | Name | Code |
| --- | --- | --- |
| Institution | EduCourt Test Institute | EDCTEST |
| Campus 1 | EduCourt Test Institute - Main Campus (Lahore) | EDCT-MAIN |
| Campus 2 | EduCourt Test Institute - City Campus (Karachi) | EDCT-CITY |

Academic year: `2026-2027` (code `AY-2026`), terms Term 1 and Term 2.

## 4. Accounts

All accounts use password `Password@123`.

| Role | Email | Campus |
| --- | --- | --- |
| Campus Administrator | `campusadmin.main@test.educourt.test` | Main |
| Campus Administrator | `campusadmin.city@test.educourt.test` | City |
| Teacher | `teacher.main@test.educourt.test` | Main |
| Teacher | `teacher.city@test.educourt.test` | City |
| Student | `student.main@test.educourt.test` | Main |
| Student | `student.city@test.educourt.test` | City |
| Parent (father) | `parent.main.father@test.educourt.test` | Main |
| Parent (mother) | `parent.main.mother@test.educourt.test` | Main |
| Parent (father) | `parent.city.father@test.educourt.test` | City |
| Parent (mother) | `parent.city.mother@test.educourt.test` | City |

Notes:
- On production an existing platform super admin was reused for scope grants,
  so the institution has 10 new users. On a clean database the seeder also
  creates `superadmin@test.educourt.test` (11 users).
- Each parent is a separate login linked to the same child through
  `student_guardian` (father is primary and emergency contact).

## 5. People and Relationships

| Student | Admission No | Campus | Class / Section | Father login | Mother login |
| --- | --- | --- | --- | --- | --- |
| Hamza Test | EDCT-MAIN-2026-0001 | Main | Class 1 / A | parent.main.father | parent.main.mother |
| Ayesha Test | EDCT-CITY-2026-0001 | City | Class 1 / A | parent.city.father | parent.city.mother |

Teachers are assigned to Class 1 Section A and Class 2 Section A for both
subjects (Mathematics, Computer Science), which is what drives teacher-scoped
student visibility.

## 6. Data Inventory (per campus, total = 2 campuses)

| Module | Records per campus | Total |
| --- | --- | --- |
| Campuses | 1 | 2 |
| Campus admins | 1 | 2 |
| Teachers | 1 | 2 |
| Students | 1 | 2 |
| Guardians / parent logins | 2 | 4 |
| Classes (C1, C2) | 2 | 4 |
| Sections (A, B per class) | 4 | 8 |
| Subjects (Mathematics, Computer Science) | 2 | 4 |
| Student enrollments | 1 | 2 |
| Student attendance | 2 days | 4 |
| Fee structures | 2 (one per class) | 4 |
| Fee charges (monthly + admission) | 2 | 4 |
| Fee receipts (partial payment) | 1 | 2 |
| Portal fee vouchers (legacy mirror) | 2 | 4 |
| Exams | 2 | 4 |
| Exam papers | 2 | 4 |
| Exam marks | 2 | 4 |
| Timetable slots | 2 | 4 |
| Library books | 2 | 4 |
| Book issues | 2 | 4 |
| Transport routes | 2 | 4 |
| Transport allocations | 1 | 2 |
| Conduct records | 2 | 4 |
| Circulars | 2 | 4 |

Financial position per student: billed 15,000, paid 5,000, outstanding 10,000
(monthly tuition 5,000 paid in full, admission fee 10,000 unpaid).

Exam results per student: Mathematics 85, Computer Science 92, total 177.

## 7. Verification Performed (Production, 98/98 checks)

The verification harness logged in as every account and exercised real API
endpoints on the production php-fpm listener. All checks passed.

| Area | Checks | Result |
| --- | --- | --- |
| Authentication and role/campus mapping | 21 | Pass |
| Campus admin module listing (13 modules x 2 campuses, plus students/users) | 32 | Pass |
| Campus isolation guard | 1 | Pass |
| Teacher scope (class/section-limited students, permissions) | 8 | Pass |
| Student portal (children, attendance, results, fees, guards) | 13 | Pass |
| Parent portal (children, fees, permission guards) | 16 | Pass |
| Cross-child and cross-campus denial | 4 | Pass |
| Integration RBAC (campus admin vs teacher vs parent) | 3 | Pass |
| Total | 98 | 98/98 pass |

Key verified behaviors:
- Each campus admin lists exactly one student, one receipt, two charges, two
  exams, two marks, two books, two routes, two circulars, two conduct records,
  and two timetable slots, all restricted to their own campus.
- Cross-campus student detail requests return 404 for the other campus admin.
- Teachers only see students in their assigned section and cannot create
  students. Teachers can read the user directory but only within their campus
  (`user.view` is part of the teacher role by design).
- Students and parents see only their linked child, their own attendance,
  results, and fees. Requesting another child returns 404.
- Students and parents cannot list students, fee charges, or integration
  settings (403).
- Campus admins can read WhatsApp/outreach integration settings (200) via
  `integration.view`; teachers and parents cannot.

## 8. Findings and Limitations

1. Parent and student portals read the legacy `fee_vouchers` ledger, while the
   administrative fee-counter uses `fee_charges`. The seeder therefore mirrors
   billing into both ledgers so the portal fee page is populated. If the product
   intends to retire `fee_vouchers`, `PortalController::fees` needs to read
   `fee_charges`; this was not changed here to avoid altering ledger semantics.
2. There is no homework module. The closest supported entity is `Circular`
   (announcements/notices) and class books; homework tracking is unsupported.
3. Payment gateway flows (JazzCash/EasyPaisa) were not seeded or exercised;
   they remain deferred.
4. Urdu/RTL and ClamAV scanning were not exercised; deferred.
5. The seeder is additive; it does not delete or overwrite existing data. On a
   database that already has the institution, re-running it only fills gaps.

## 9. Reproduce

Seed locally:

```bash
cd apps/api
DB_DATABASE=eis php artisan db:seed --class="Database\Seeders\TestInstitute\EduCourtTestInstituteSeeder" --force
```

Seed production:

```bash
cd /var/www/educourt/apps/api
php artisan db:seed --class="Database\Seeders\TestInstitute\EduCourtTestInstituteSeeder" --force
```

After seeding, log in at the web or parent portal with any account above using
`Password@123`.
