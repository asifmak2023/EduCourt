# Salary Structure Templates - Design

Status: implemented
Depends on: `staff_members`, `designations`, `salary_components`,
`staff_salaries`, `staff_salary_items`, `payroll_runs`, `payslips`
(`apps/api`), the web payroll hub (`apps/web`) and the mobile admin engine
(`apps/mobile`).

## Objective

Give HR the same authoring flow for pay that Finance already has for billing:
define a **reusable, designation-scoped salary template** (the salary analogue
of a class fee structure), then apply it to produce per-staff effective-dated
salaries. Today salary exists only as ad-hoc per-employee `staff_salaries`
rows, so there is no shared "how much does a Senior Teacher earn" definition and
onboarding a cohort means retyping the same components.

The fee structure works as: template (`fee_structures` + items) -> generate
vouchers (copy of the plan per student). Salary mirrors that:

```
salary_structures + salary_structure_items      (template, keyed by designation)
            │  apply
            ▼
staff_salaries + staff_salary_items             (per staff, effective-dated)
            │  payroll run
            ▼
payslips + payslip_items -> ledger accrual/payment
```

## Decisions

1. **Template keyed to campus + designation.** One structure per designation per
   campus (the analogue of `academic_year + class_room` for fees). This is
   enforced at the application layer, not by a DB unique index, so a soft-deleted
   structure can be replaced without a hard delete. Rationale: designations
   already carry grade and department, and every staff member points at one.
2. **Apply copies into `staff_salaries`.** Applying a template never links a
   payslip live to the template; it snapshots `basic_salary` and the component
   lines into an effective-dated `staff_salaries` row. This keeps the payroll
   engine unchanged, preserves history, and allows per-employee overrides.
   Later template edits do not retroactively change existing pay.
3. **Provenance, not dependency.** `staff_salaries.salary_structure_id` records
   which template produced a row (nullable, `nullOnDelete`). Payroll still reads
   `staff_salaries` exactly as before, so nothing in `PayrollRunService` changes.
4. **Apply scope.** `POST /v1/salary-structures/{id}/apply` targets every employed
   staff member holding the designation by default, or an explicit
   `staff_member_ids` list. Re-applying for the same `effective_from` updates the
   existing row (`updateOrCreate`) instead of duplicating it.

6. **Staff appointment.** Creating a staff member requires a `basic_salary`
   amount and immediately creates an effective-dated `staff_salaries` row
   starting on the joining date. The amount is entered manually (templates do
   not pre-fill it) and the row is not linked to a structure. Salary creation
   at appointment is allowed for anyone with `hr.create`, regardless of payroll
   permissions, so Campus Admins can onboard staff. The staff list shows the
   current basic salary and the detail page renders a salary summary. When an
   edit changes the designation, the form offers to re-assign the salary from
   the new designation's current structure (`reassign_salary` +
   `salary_effective_from`), which closes the previous row using the same
   overlap rules as apply.

## Schema

**`salary_structures`**
`id`, `institution_id`, `campus_id`, `designation_id`, `name`,
`version` (default 1), `superseded_by_id` (nullable self FK),
`basic_salary` (decimal 12,2), `currency` (3), `effective_from`,
`effective_to` (nullable), `is_active`, `increment_type` (`percent`/`fixed`,
nullable), `increment_value` (decimal 12,2, nullable),
`increment_every_months` (int, nullable), `notes`, timestamps, soft deletes.
Index `(campus_id, designation_id)`.

`superseded_by_id` links a version to its replacement; `superseded_by_id IS NULL`
means the version is current. Uniqueness of "one current structure per
designation per campus" is enforced in validation over rows where both
`deleted_at` and `superseded_by_id` are null.

**`salary_structure_items`**
`id`, `salary_structure_id`, `salary_component_id`, `amount` (nullable),
`percentage` (nullable), `sort_order`, timestamps.
Unique `(salary_structure_id, salary_component_id)`.

**`staff_salaries` (altered)**
Adds `salary_structure_id` nullable FK -> `salary_structures`, `nullOnDelete`.

## Versioning and increments

Salary structures are versioned rather than mutated once applied. A revision:

1. Creates a new row with `version = previous.version + 1`, copying
   `basic_salary` and component lines from the current version unless overridden.
2. Sets the previous version's `superseded_by_id` to the new row, so it is no
   longer current, listable only with `include_history=1`, and rejected for
   `PUT`/revise.
3. Computes the new basic from `increment_type` + `increment_value`
   (`SalaryIncrementType::applyTo`) when an increment is supplied, otherwise
   from an explicit `basic_salary`.

Increments are also available per staff. `POST /v1/staff-salaries/{id}/increment`
inserts a **new effective-dated `staff_salaries` row** with the incremented
basic and copied component lines, closing the previous row the day before the
new `effective_from`. Payroll therefore picks up the raise from that date with no
engine changes, and the prior row stays as history.

## API

All routes sit in the payroll block and are guarded by `payroll.*`:

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/v1/salary-structures` | `payroll.view` |
| GET | `/v1/salary-structures/resolve?designation_id=` | `payroll.view` |
| POST | `/v1/salary-structures` | `payroll.create` |
| GET | `/v1/salary-structures/{id}` | `payroll.view` |
| PUT | `/v1/salary-structures/{id}` | `payroll.edit` |
| DELETE | `/v1/salary-structures/{id}` | `payroll.delete` |
| POST | `/v1/salary-structures/{id}/revise` | `payroll.edit` |
| GET | `/v1/salary-structures/{id}/apply-preview` | `payroll.view` |
| POST | `/v1/salary-structures/{id}/apply` | `payroll.edit` |
| POST | `/v1/staff-salaries/{id}/increment` | `payroll.edit` |

`GET /v1/salary-structures` returns only current versions by default; pass
`include_history=1` (optionally with `designation_id=`) to list superseded
versions.

`revise` body: `increment_type` (`percent`/`fixed`), `increment_value`, or an
explicit `basic_salary`; optional `effective_from`, `effective_to`, `notes`,
`items`, `currency`, `is_active`. Returns `201` with the new version.

`apply-preview` query: `effective_from?` and optional `staff_member_ids[]`.
Response: `{ data: { effective_from, matched_staff, already_from_this_structure,
will_supersede, already_on_this_date, requires_confirmation, basic_salary,
currency, staff: [{ id, full_name, employee_no }] } }` (staff capped at 50).

`apply` body: `staff_member_ids?` (array), `effective_from?` (date; defaults to
the structure's `effective_from`, else today). Response:
`{ data: { salary_ids: [...], staff_count: n } }`.

`increment` (staff salary) body: `increment_type`, `increment_value`,
`effective_from`, optional `notes`. Returns `201` with the new
`staff_salaries` row; the prior row receives `effective_to = effective_from - 1
day`.

## Web

- `/dashboard/hr/payroll` hub gains a **Salary structures** tile; the existing
  per-staff screen is relabelled **Staff salaries**.
- `/dashboard/hr/payroll/salary-structures` - list (name, designation, basic,
  components, status).
- `/dashboard/hr/payroll/salary-structures/new` and `/{id}/edit` -
  `SalaryStructureForm` (designation, name, basic, currency, effective dates,
  default increment type/value/cadence, repeater of component lines with a live
  gross/deductions/net preview).
- `/dashboard/hr/payroll/salary-structures/{id}` - detail with version badge,
  component table, **Create revised version** card (current versions only),
  **Version history** table, an **Apply to staff** card and delete.
- `/dashboard/hr/payroll/salaries/{id}` - staff salary detail gains a
  **Give increment** card (type, value, effective date, notes).

## Mobile

Admin engine module `salary-structures` under People, with a `items` repeater,
default increment fields, a `salaryStructureItemsSection` detail section,
**Create revised version** and **Apply to staff** actions. The `staff-salaries`
module gains a **Give increment** action posting to the increment endpoint.

## Tests

`apps/api/tests/Feature/SalaryStructureTest.php` covers create-with-items,
one-structure-per-designation validation, apply-to-matching-staff, explicit
staff selection, idempotent re-apply for the same effective date, item
replacement on update, resolve, permission denial for teachers, revision by
percent and fixed increment, revision with overridden basic/items, rejection of
edits/revisions on superseded versions, current-only listing vs
`include_history`, and per-staff percent/fixed increments creating a new
effective-dated row while closing the previous one.

## Out of scope

Approval workflows on salary changes and automatic propagation of template edits
to already-applied salaries, plus automatic (scheduled) application of
`increment_every_months`. These can be layered on later without schema change;
the cadence fields are persisted now so a scheduler can consume them later.
