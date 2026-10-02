# Mobile admin engine — Phase 2 design

Date: 2026-10-02

## Goal

Extend the config-driven mobile admin engine so staff can work the
**Admissions & Students** domain: student records, guardians, enrollments,
admissions with their approval workflow, and scholarships. This is Phase 2 of
full functional parity with the web admin.

## Context

- Phase 1 (`9e71f96` spec, `bd8bee8` implementation) shipped the engine plus the
  Academics domain. `ModuleConfig` today supports text/number/date/time/textarea/
  select/checkbox/lookup fields, list filters, list columns, read-only detail,
  generic actions, and delete.
- Research of the API and web admin shows both **Students** and **Admissions** are
  bespoke on web (not `MasterList`/`MasterForm`) because they carry: nested
  guardian repeaters, an optional nested enrollment block, a photo upload widget,
  nested relation displays (guardians, enrollments), and status-transition
  workflows. Scholarships are mostly config-driven already.
- The engine already has `apiUpload` (multipart) in `src/lib/api.ts`, and
  `expo-image-picker ~57.0.20` is already installed.
- API envelope and tenant rules are unchanged: `X-Campus-Id` required, list
  `{data,meta}`, show `{data}`, delete `{message}`, 422 `{message,errors}`.

## Scope

In scope (Phase 2 = "Admissions & Student records — core"):

1. Engine extensions:
   - `photo` field type (multipart upload/remove) with a picker.
   - Action forms: an action may declare `fields`; the detail screen then opens a
     modal form and submits the entered values (enables Reject/Enroll/Withdraw/
     Revoke).
   - `detailSections` on a module: custom rendered sections for nested relations
     (e.g. a student's guardians and enrollments).
2. Modules (config):
   - Students, Guardians, Student enrollments, Scholarships, Scholarship awards,
     Admissions.
3. Lookups: `students`, `scholarships`, `guardians` (plus Phase 1 lookups).
4. Sidebar section "Admissions & Students".

Deferred to Phase 2b/3 (documented, not in this batch):

- Student create/edit guardian repeater and the optional nested enrollment block
  on student create (web parity): guardians are managed through the Guardians
  module and the enrollments module in this phase; the student detail screen
  shows them read-only.
- Bulk **Promotions** screen (`POST /v1/students/promote`).
- Student document upload/verify and admission document upload.
- Admission detail documents list.

## Engine extensions

### `photo` field

```ts
interface PhotoFieldConfig extends BaseFieldConfig {
  type: "photo";
  path: string;          // "/v1/students/{id}/photo"  ({id} substituted)
  fileField?: string;    // multipart field name, default "photo"
  urlKey?: string;       // response field for the image url, default "photo_url"
}
```

- Never part of the create/edit payload (the API has a dedicated endpoint). The
  form screen skips it; the detail screen renders `PhotoField`.
- `PhotoField` shows the current image (`urlKey`, dot-path aware), a "Change
  photo" button (`expo-image-picker`), and a "Remove" button. Upload posts the
  picked asset as multipart with `apiUpload`; remove calls `DELETE path`.
- Gated by `ModulePermissions.photo` when present.
- Web uses `asset.file` when provided by the picker; native builds a FormData
  part from `{ uri, name, type }`.

### Action forms

```ts
interface ActionConfig<T> {
  label: string;
  method?: "POST" | "PUT" | "DELETE";
  path: string | ((item: T) => string);
  body?: Record<string, unknown> | ((item: T) => Record<string, unknown>);
  confirm?: string;
  permission?: string;
  fields?: FieldConfig[];   // when present, collect input via a modal form
  submitLabel?: string;
  successMessage?: string;
}
```

- No `fields`: current behaviour (confirm → POST → reload).
- With `fields`: open `ActionFormModal` (title = action label) built from `Field`
  components; submit builds the body with the shared `buildPayload` (so numbers
  and empty values are coerced) and posts it, then reloads and shows
  `successMessage`.
- Shared form helpers (`initialValues`, `buildPayload`, `mergeRecord`) move to
  `src/admin/form.ts` and are reused by the form screen and the action modal.

### Detail sections

```ts
interface ModuleConfig<T> {
  // ...
  detailSections?: { title: string; render: (item: T) => ReactNode }[];
}
```

Rendered as cards under the field card on the detail screen. Used for a student's
`guardians[]` and `enrollments[]`.

## Phase 2 module definitions

| Module | Endpoint | Permissions | Key columns | Key fields | Lookups | Actions |
|---|---|---|---|---|---|---|
| Admissions | `/v1/admissions` | `admission.*`, `admission.approve` | application_no, full_name, class_room, guardian_phone, applied_on, status | first_name*, last_name*, gender, date_of_birth, class_room_id, academic_year_id, guardian_name, guardian_phone, guardian_email, guardian_relation, previous_school, city, address, applied_on, notes, status | classRooms, academicYears | Submit (`admission.edit`), Approve, Reject (reason), Enroll (year, class, section, roll, admission_no, starts_on) |
| Students | `/v1/students` | `student.*`, `student.approve`, `student.photo` | admission_no, full_name, gender, date_of_birth, status | admission_no, first_name*, last_name*, gender*, date_of_birth, blood_group, nationality, religion, category, national_id, email, phone, city, previous_school, admission_date, status, address, notes, photo | — | Withdraw (`student.approve`: status, date, notes) |
| Guardians | `/v1/guardians` | `student.*` | name, phone, email, occupation, national_id | name*, national_id, occupation, email, phone*, alternate_phone, address | — | — |
| Student enrollments | `/v1/student-enrollments` | `student.*` | student.full_name, academic_year.name, class_room.name, section.name, roll_number, status | student_id*, academic_year_id*, class_room_id*, section_id, roll_number, status, starts_on, ends_on, notes | students, academicYears, classRooms, sections | — |
| Scholarships | `/v1/scholarships` | `scholarship.*` | name, code, type_label, discount, sponsor, is_active | name*, code*, type*, discount_type*, value*, academic_year_id, sponsor, description, is_active | academicYears | — |
| Scholarship awards | `/v1/scholarship-awards` | `scholarship.*` | student.name, scholarship.name, awarded_on, effective_value, status | scholarship_id*, student_id*, academic_year_id, awarded_on, value_override, status, notes | scholarships, students, academicYears | Revoke (`scholarship.approve`: notes) |

Section for all six: **Admissions & Students** (matches the web nav group).

Status filter options:

- Admissions: `enquiry, applied, under_review, approved, rejected, enrolled`.
- Students: `active, inactive, withdrawn, transferred, graduated` + gender.
- Student enrollments: `active, promoted, repeated, withdrawn, transferred`.
- Scholarship awards: `active, revoked`.
- Scholarships: `is_active` (1/0) + type
  (`merit, need_based, sports, sibling, staff_ward, other`).

Select options: gender (`male/female/other`), guardian relation
(`father/mother/guardian/other`), admission status, enrollment status, student
status, scholarship type, discount type (`percentage/fixed`), award status,
withdraw outcome (`withdrawn/transferred`).

## UX behaviour

- Listing, search, filters, pagination, pull-to-refresh and permission gating are
  inherited from Phase 1.
- Detail screens gain: photo widget, workflow action buttons with optional input
  modals, and nested relation cards.
- Lookups remain a client-filtered modal over a `?per_page=200` load; for large
  campuses the searchable `LookupField` filters the loaded page client-side (a
  server-search lookup is deferred).

## Testing and verification

- `npx tsc --noEmit` and `npx expo lint` clean.
- Metro web bundle compiles (HTTP 200, no transform errors).
- API smoke against the live/local API with a `campus_admin`:
  - all six list endpoints return 200 with pagination meta;
  - student withdraw, admission submit/reject/enroll, scholarship award revoke
    validate and succeed on a throwaway record;
  - a `student` account sees no admin sections.
- No backend change in this phase.

## Files

- Update: `apps/mobile/src/admin/types.ts` (photo field, action fields, detail sections).
- New: `apps/mobile/src/admin/form.ts` (shared initial/payload helpers).
- New: `apps/mobile/src/admin/fields/PhotoField.tsx`.
- New: `apps/mobile/src/admin/ActionFormModal.tsx`.
- Update: `apps/mobile/src/admin/ModuleDetailScreen.tsx` (photo, action forms, detail sections).
- Update: `apps/mobile/src/admin/ModuleFormScreen.tsx` (use shared helpers; skip photo).
- Update: `apps/mobile/src/admin/useLookups.ts` (students, scholarships, guardians).
- Update: `apps/mobile/src/admin/registry.ts` (six modules, section, options).
- No change to `nav.ts` section list (already includes "Admissions & Students").
