# Mobile Admin Engine - Phase 4: People (HR, Payroll, Leave)

Status: design
Depends on: `2026-10-02-mobile-admin-engine-design.md` (Phase 1 engine),
`2026-10-02-mobile-admin-engine-phase2-design.md`,
`2026-10-02-mobile-admin-engine-phase2b-design.md`,
`2026-10-02-mobile-admin-engine-phase3-design.md`.

Phase 4 delivers **People** parity for campus staff: the HR registry, payroll
setup and monthly payroll runs, and leave requests. It follows the same
config-driven approach as Phases 1-3. No backend API changes are required; every
endpoint already exists and is permission-gated.

## Scope

- New **"People"** section (`SECTIONS.people`).
- Permissions: `hr.*`, `payroll.*`, `attendance.*` (leave).
- Mobile engine under `apps/mobile/src/admin/`.
- Reuses existing engine features: `searchable`, filters, `headerActions`,
  `actions` with `fields`, `repeater`, and `detailSections`.
- New `peopleSections.tsx` with salary-items and payslips detail sections.
- Staff documents reuse `documentsSection` with a staff-specific path.

Out of scope: staff attendance registers and reports screens
(`/v1/attendance/staff`, `/v1/staff-reports/*`), which are bespoke collection
screens rather than row CRUD; they can be a later phase.

## Engine additions (Phase 4)

### A. Lookups (`useLookups.ts`)

| key | endpoint | labelKey |
|---|---|---|
| `departments` | `/v1/departments` | `name` |
| `designations` | `/v1/designations` | `name` |
| `staffMembers` | `/v1/staff` | `full_name` |
| `salaryComponents` | `/v1/salary-components` | `name` |

`staffUsers` (`/v1/users`) already exists for linking a login to a staff member
and for leave requests.

### B. Option constants (`registry.ts`)

`EMPLOYMENT_TYPE`, `STAFF_STATUS`, `SALARY_COMPONENT_TYPE`,
`SALARY_CALCULATION`, `PAYROLL_ADJUSTMENT_TYPE`, `PAYROLL_RUN_STATUS`,
`LEAVE_TYPE`, `LEAVE_STATUS`.

### C. Permission constants

```ts
const HR = { view: "hr.view", create: "hr.create", edit: "hr.edit",
             delete: "hr.delete", approve: "hr.approve" };
const PAYROLL = { view: "payroll.view", create: "payroll.create",
                  edit: "payroll.edit", delete: "payroll.delete",
                  approve: "payroll.approve" };
```

Leave requests use `attendance.view/create/edit/approve`.

### D. Detail sections (`peopleSections.tsx`)

- `staffSalaryItemsSection` - renders `items[]` from a salary structure
  (`component.name`, `amount`, `percentage`).
- `payrollPayslipsSection` - renders `payslips[]` from a payroll run
  (`staff_member.full_name`, `gross`, `deductions`, `net`).

Both reuse the same record-list pattern as `feeSections.tsx` /
`accountingSections.tsx`.

## Module definitions

### Departments (`hr.*`) - `DepartmentController.php`

CRUD `/v1/departments`. Filter `is_active`.

- Columns: `name`, `code`, `head.name`, `designations_count`, `staff_count`,
  `is_active` (badge).
- Fields: `name` (required), `code` (required, unique per campus),
  `head_user_id` (lookup `staffUsers`), `description` (textarea),
  `is_active` (checkbox, default true).

### Designations (`hr.*`) - `DesignationController.php`

CRUD `/v1/designations`. Filter `is_active` (server also supports
`department_id`, not exposed as a static chip).

- Columns: `name`, `code`, `department.name`, `grade`, `is_active` (badge).
- Fields: `name` (required), `code` (required), `department_id` (lookup
  `departments`), `grade`, `job_description` (textarea), `is_active`
  (checkbox, default true).

### Staff (`hr.*`) - `StaffMemberController.php`

CRUD `/v1/staff` (index allows `hr.view|payroll.view`). Searchable; filters
`status` and `employment_type`.

- Columns: `employee_no`, `full_name`, `department.name`, `designation.name`,
  `employment_type_label`, `status_label` (badge).
- Fields: `first_name` (required), `last_name`, `employee_no`,
  `user_id` (lookup `staffUsers`), `department_id` (lookup), `designation_id`
  (lookup), `gender` (select), `date_of_birth` (date), `cnic`, `phone`,
  `email` (email), `address`, `emergency_contact_name`,
  `emergency_contact_phone`, `employment_type` (select),
  `status` (select), `joining_date` (date, required), `leaving_date` (date),
  `bank_name`, `bank_account_no`, `tax_number`, `notes` (textarea).
- Row action **Terminate** (`hr.approve`): `leaving_date` (date, required),
  `status` (select), `reason` (textarea).
- Detail section: staff documents via `documentsSection` at
  `/v1/staff/{id}/documents`, `withValidity: true`, upload `hr.create`, verify
  `hr.approve`, delete `hr.delete`.

### Salary components (`payroll.*`) - `SalaryComponentController.php`

CRUD `/v1/salary-components`. Filters `type`, `is_active`.

- Columns: `name`, `code`, `type_label`, `calculation`, `default_amount`
  (money), `is_taxable` (badge), `is_active` (badge).
- Fields: `name` (required), `code` (required), `type` (select, required),
  `calculation` (select), `default_amount` (number),
  `default_percentage` (number), `is_taxable` (checkbox),
  `is_active` (checkbox, default true), `sort_order` (number).

### Staff salaries (`payroll.*`) - `StaffSalaryController.php`

CRUD `/v1/staff-salaries`. Filter `is_active`.

- Columns: `staff_member.full_name`, `basic_salary` (money), `currency`,
  `effective_from` (date), `effective_to` (date), `is_active` (badge).
- Fields: `staff_member_id` (lookup `staffMembers`, required),
  `basic_salary` (number, required), `currency`, `effective_from` (date,
  required), `effective_to` (date), `is_active` (checkbox), `notes`
  (textarea).
- `items` repeater: `salary_component_id` (lookup `salaryComponents`,
  required), `amount` (number), `percentage` (number).
- Detail section: `staffSalaryItemsSection`.

### Payroll adjustments (`payroll.*`) - `PayrollAdjustmentController.php`

CRUD `/v1/payroll-adjustments`. Filters `period`, `type`, `is_applied`.

- Columns: `staff_member.full_name`, `type_label`, `amount` (money),
  `period`, `reason`, `is_applied` (badge).
- Fields: `staff_member_id` (lookup `staffMembers`, required), `type` (select,
  required), `amount` (number, required), `period` (text, required, `YYYY-MM`),
  `reason`.

### Payroll runs (`payroll.*`) - `PayrollRunController.php`

CRUD `/v1/payroll-runs` (create/show/delete) plus actions. Filters `period`,
`status`.

- Columns: `period`, `status_label` (badge), `payslips_count` (number),
  `total_gross` (money), `total_deductions` (money), `total_net` (money).
- Fields: `period` (text, required, `YYYY-MM`), `notes` (textarea).
- Actions:
  - **Generate** - `POST /v1/payroll-runs/{id}/generate` (`payroll.edit`,
    confirm).
  - **Approve** - `POST /v1/payroll-runs/{id}/approve` (`payroll.approve`,
    confirm).
  - **Pay** - `POST /v1/payroll-runs/{id}/pay` (`payroll.approve`) with
    `payment_method` (select, required).
- Detail section: `payrollPayslipsSection` (payslips load on `show`).

### Leave requests (`attendance.*`) - `LeaveRequestController.php`

CRUD `/v1/leave-requests` (create/show/update/cancel/delete). Filters `status`,
`leave_type`.

- Columns: `user.name`, `leave_type_label`, `from_date` (date), `to_date`
  (date), `days` (number), `status_label` (badge).
- Fields: `user_id` (lookup `staffUsers`, optional - admins may file for
  another user), `leave_type` (select, required), `from_date` (date,
  required), `to_date` (date, required), `days` (number), `reason`
  (textarea).
- Actions:
  - **Approve** - `POST /v1/leave-requests/{id}/approve` (`attendance.approve`)
    with `decision_note`.
  - **Reject** - `POST /v1/leave-requests/{id}/reject` (`attendance.approve`)
    with `decision_note`.
  - **Cancel** - `POST /v1/leave-requests/{id}/cancel` (`attendance.edit`).

## Registry additions

Add `SECTIONS.people = "People"` and modules:

| key | label | endpoint | permissions |
|---|---|---|---|
| `departments` | Departments | `/v1/departments` | hr.view/create/edit/delete |
| `designations` | Designations | `/v1/designations` | hr.view/create/edit/delete |
| `staff` | Staff | `/v1/staff` | hr.view/create/edit/delete/approve |
| `salary-components` | Salary components | `/v1/salary-components` | payroll.view/create/edit/delete |
| `staff-salaries` | Staff salaries | `/v1/staff-salaries` | payroll.view/create/edit/delete |
| `payroll-adjustments` | Payroll adjustments | `/v1/payroll-adjustments` | payroll.view/create/edit/delete |
| `payroll-runs` | Payroll runs | `/v1/payroll-runs` | payroll.view/create/edit/delete/approve |
| `leave-requests` | Leave requests | `/v1/leave-requests` | attendance.view/create/edit/approve |

The existing `nav.ts` `STAFF_ORDER` already contains `"People"`, so the section
sorts between Finance and Operations.

## Verification

- `npx tsc --noEmit` and `npx expo lint` in `apps/mobile`.
- Metro bundle builds with 0 transform errors and includes the new modules.
- API smoke per module: list, create, update, action endpoints, filters, and
  422 paths, using the campus admin UAT account.
- Permission gating: nav items hidden without the matching `*.view`; action
  buttons hidden without the action permission.

## Commit / deploy

- Spec commit, then implementation commit; push to `master`.
- Mobile-only change: no VPS deploy; deploy only if an API defect is found.
