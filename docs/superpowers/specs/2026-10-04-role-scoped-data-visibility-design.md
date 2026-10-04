# Role-Scoped Data Visibility

Status: design
Depends on: nothing. Backend-only enforcement; no schema changes.

This spec closes data-scope leaks where a signed-in user sees rows that belong
to a scope they should not reach. The reported symptom: a **student** account
opened the staff attendance list and saw attendance for every class in the
campus (Computer Science, Software Engineering, BBA, Electrical Engineering).

## Goal

- A signed-in user only ever sees data relevant to their role/identity.
- Portal accounts (student, parent/guardian) read only their own / their
  children's data.
- Teachers read only the classes/sections they are assigned to.
- Campus and institution isolation (already enforced) keeps working underneath.
- No client changes are required for enforcement; web and mobile both inherit it.

## Root cause

Campus/institution isolation already exists: `BelongsToCampus` /
`BelongsToInstitution` global scopes filter 136/138 models to the active tenant.
The missing layer is **identity/role scoping**, combined with a permission leak:

- `config/rbac.php` grants staff-module permissions to portal roles:
  - `student`: `attendance.view`, `exam.view`, `academic.view`,
    `timetable.view`, `credit.view`, `circular.view`, `complaint.create`.
  - `parent_guardian`: `student.view`, `attendance.view`, `exam.view`,
    `fee.view`, `academic.view`, `timetable.view`, `credit.view`,
    `circular.view`, `complaint.view`, `complaint.create`.
- These permissions gate the **staff** endpoints (e.g.
  `GET /v1/attendance/students` is `permission:attendance.view`). The endpoints
  never narrow rows to the caller, so a student passes the gate and receives the
  whole campus.
- Teachers hold `attendance.view`, `student.view`, `exam.*`, etc. and likewise
  receive campus-wide rows instead of their own classes.

## Decisions (confirmed during brainstorming)

| Question | Decision |
|---|---|
| Where to fix | Backend only; all clients inherit. |
| Enforcement approach | Approach 3 — separate portal permissions from staff permissions, plus teacher class scoping. |
| Portal user behaviour on staff endpoints | Denied: portal roles lose the staff permissions entirely, so these endpoints return 403. Portal data is served by `/v1/me/*`. |
| Teacher scope | Restrict teachers to their `TeachingAssignment` classes/sections in teacher-accessible modules. |
| Multi-role precedence | A campus-broad role wins; narrowing applies only when no broader role is held. |
| Web dashboard for portal-only accounts | Show a "use the mobile app" screen instead of a broken/empty dashboard. |

## Architecture

Three parts.

### Part 1 — Portal permission separation

Edit `apps/api/config/rbac.php` so `student` and `parent_guardian` hold **no**
staff-module permissions. They keep only the `baseline` (`appearance.view`).

All family-facing data is already served by the permission-free `/v1/me/*`
routes (`PortalController`), which authorize by the linked student record, not
by permissions:

- `me/children`, `me/timetable`, `me/attendance`, `me/results`, `me/fees`.

`RbacSeeder` calls `syncPermissions()`, which replaces a role's permission set,
so re-running it on deploy revokes the removed permissions from the existing
role rows. No per-user data migration is required.

Result: `GET /v1/attendance/students` (and every other staff endpoint) returns
403 for student/parent accounts; `/v1/me/attendance` continues to work.

### Part 2 — Teacher class scoping

New service `App\Services\Access\TeacherScope`.

- `isTeacherScoped(User $user): bool` — true when the user holds `teacher` and
  holds no campus-broad staff role. (Campus-broad roles: all `RoleName` cases
  except `teacher`, `student`, `parent_guardian`.)
- `classRoomIds(User $user): array<int,int>` and
  `sectionIds(User $user): array<int,int>` — active `TeachingAssignment` rows
  for `teacher_user_id = $user->id` (optionally filtered to the active academic
  year), de-duplicated.
- `studentIds(User $user): array<int,int>` — students with an active
  `StudentEnrollment` in any allowed class (and section, when the assignment is
  section-specific).
- `applyTo(Builder $query, string $column): Builder` — applies
  `whereIn($column, ...)`; a no-op when the user is not teacher-scoped.

Applied to the teacher-accessible list/report endpoints (and their write
validation), not to campus-broad roles:

| Module | Controllers / methods |
|---|---|
| Student attendance | `StudentAttendanceController` `index`, `report`, `studentReport`, `store`, `bulkStore` |
| Students | `StudentController` `index`, `show`; `StudentHistoryController::show` |
| Exams | `ExamMarkController` `index`, `bulkStore`, `resultCard`; `ExamPaperController` `index`, `show` |
| Conduct | `ConductRecordController` `index`, `show` (+ writes) |
| Credit | `CourseRegistrationController` `index`, `show`; `TranscriptController` `show`, `term` |
| Curriculum | `LessonPlanController`, `SyllabusUnitController` (`index`, `show`, + writes) |
| PTM | `PtmBookingController`, `PtmEventController` (`index`, `show`, + writes) |
| Timetable | `TimetableSlotController::index` |

Campus/institution global scopes continue to apply underneath. A user who also
holds a campus-broad role is not narrowed.

### Part 3 — Portal-only accounts on the web dashboard

After Part 1 a student/parent who signs into the Next.js dashboard has no staff
permissions: the nav is empty and dashboard widgets 403. Add a guard in the web
app: detect portal-only accounts (roles ⊆ {`student`, `parent_guardian`}) and
render a "Use the EduCourt mobile app for your portal" screen instead of the
dashboard shell. No web portal is built.

## Out of scope

- **Curriculum data bug.** `Circuit Analysis` is assigned to
  `BS Computer Science` (class 37) in the UAT data, so a CS student's own
  timetable/results legitimately include it. This is a seeding/data issue, not a
  view-scope leak; tracked as a separate seed fix.
- Broad refactor of `ScopeAssignment` / `ScopeType` (data-driven scoping).
  Role-based defaults are used for this iteration.

## Verification

Backend feature tests (`apps/api/tests/Feature`):

- Portal roles: `student`/`parent` get 403 on staff attendance/students/fees
  list endpoints, and 200 on `/v1/me/*`.
- Teacher: attendance index/report and student index return only rows for
  assigned classes/sections; a teacher with no assignments returns empty.
- Campus-broad roles (e.g. `campus_admin`) remain campus-wide.
- Existing `AttendanceTest`, `PortalTest`, `ReportTest` stay green.

Manual smoke against UAT:

- `student1.nuas-isb@uat.educourt.test` → `GET /v1/attendance/students` = 403,
  `GET /v1/me/attendance` = 200 (own record only).
- `teacher1.nuas-isb@uat.educourt.test` → attendance/students limited to its
  assigned classes (the UAT seed assigns teacher1 broadly; assert against the
  assignment set, not a fixed number).
