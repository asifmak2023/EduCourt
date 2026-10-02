# Mobile admin engine — Phase 1 design

Date: 2026-10-02

## Goal

Give staff accounts (starting with `campus_admin`) a real, usable mobile
sidebar and working screens by building a **config-driven admin engine** in the
React Native app, then shipping the **Academics** domain as the first full set
of modules. This is Phase 1 of full functional parity with the web admin.

## Context

- The mobile sidebar currently only shows the 4 student-portal tabs, and only
  when a student is linked. `campus_admin` has no linked student, so it sees
  only Dashboard and Profile.
- `AuthUser` already carries `permissions: string[]` from `GET /v1/auth/me`, so
  the sidebar can be permission-driven.
- The API is uniformly REST with a standard envelope:
  - list: `{ data: [...], links: {...}, meta: { current_page, per_page, total, last_page } }`
  - show/create/update: `{ data: {...} }`
  - delete: `{ message: "..." }`
  - validation errors: HTTP 422 with `{ message, errors: { field: [msg] } }`
- Tenant scope is selected with the `X-Campus-Id` header; a campus-scoped route
  returns 403 without it. The mobile `apiFetch` already supports `campusId`.
- The web admin proves this pattern with `MasterList` / `MasterForm`: ~40-45 of
  its ~80 create-capable modules are pure declarative list+form config. We mirror
  that approach on mobile instead of hand-writing one screen per module.

## Scope

In scope (Phase 1):

1. Config-driven engine: list, form, detail, field components, data hooks.
2. Permission-driven sidebar mirroring web sections.
3. Campus / institution context so admin calls always send `X-Campus-Id`.
4. The Academics domain as config modules:
   `academic-years`, `terms`, `stages`, `classes`, `sections`, `subjects`,
   `periods`, `rooms`, `class-subjects`, `teaching-assignments`,
   `curriculum syllabus-units`, `curriculum class-books`.

Out of scope (later phases, each with its own spec): Students & Admissions,
Fees & Finance, HR & Payroll, Exams & Attendance, Operations, Student affairs,
Reports, Administration, and bespoke flows (bulk entry, dashboards,
status-transition detail pages).

## Architecture

New directory `apps/mobile/src/admin/`:

```
admin/
  registry.ts            ModuleConfig[] and lookup registry
  types.ts               ModuleConfig, FieldConfig, ColumnConfig, ActionConfig
  useList.ts             paginated list hook (page/search/filters/refresh)
  useResource.ts         single-record GET hook
  useLookups.ts          async option loaders (resource-backed selects)
  ModuleListScreen.tsx   search + filters + FlatList infinite scroll + create
  ModuleFormScreen.tsx   create/edit form driven by FieldConfig[]
  ModuleDetailScreen.tsx read-only detail + actions + delete
  fields/                one component per field type
    TextField.tsx
    NumberField.tsx
    DateField.tsx
    TimeField.tsx
    SelectField.tsx
    CheckboxField.tsx
    TextAreaField.tsx
    LookupField.tsx
```

The existing `Screen`, `AppHeader`, `Sidebar`, `ui.tsx`, `theme/*` are reused.
`nav.ts` is rewritten to produce permission-driven sections and to merge the
student-portal items with staff modules.

### Data layer

- `useList<T>({ endpoint, params, searchable })` returns
  `{ items, meta, loading, refreshing, error, reload, loadMore, setSearch, setParam }`.
  It sends `page`, `per_page` (default 25), `search` and filter params, reads
  `data` + `meta`, appends on `loadMore`, and passes `campusId` from context.
- `useResource<T>(endpoint, id)` returns `{ data, loading, error, reload }`.
- `useLookups` exposes resource-backed option loaders keyed by name
  (`academicYears`, `terms`, `stages`, `classRooms`, `sections`, `subjects`,
  `staffUsers`), each loading a bounded `?per_page=200` list and mapping to
  `{ value, label }`.
- All hooks call the existing `apiFetch`, which injects the bearer token and
  `X-Campus-Id`.

### ModuleConfig

```ts
interface ModuleConfig {
  key: string;                     // route key, e.g. "academic-years"
  section: string;                 // sidebar section label
  label: string;                   // "Academic years"
  icon?: string;
  endpoint: string;                // "/v1/academic-years"
  permissions: {
    view: string;                  // "academic.view"
    create?: string;
    edit?: string;
    delete?: string;
  };
  searchable?: boolean;
  filters?: FilterConfig[];        // { param, label, options }
  columns: ColumnConfig[];         // { key | render(item), label, align? }
  fields: FieldConfig[];           // form + detail fields
  deleteMessage?: string;
  actions?: ActionConfig[];        // { label, method, path(item), body?, confirm? }
}

type FieldConfig =
  | { type: "text" | "number" | "date" | "time" | "textarea"; name; label; required?; min?; max?; step?; hint?; span?: 1 | 2; readOnlyOnEdit? }
  | { type: "select"; name; label; required?; options: { value: string | number; label: string }[] }
  | { type: "checkbox"; name; label; default?: boolean }
  | { type: "lookup"; name; label; required?; lookup: string; labelKey?: string; dependsOn?: string };
```

`ColumnConfig` supports either `key` (read a scalar attribute, optionally with a
`format` of `text | number | money | date | badge`) or a `render(item)` escape
hatch for derived cells. `ActionConfig` posts to a computed path and reloads.

### Field types (Phase 1 uses text, number, date, time, select, checkbox, textarea, lookup)

- `lookup` renders a searchable picker modal backed by a `useLookups` loader;
  `dependsOn` filters options by another field (e.g. `sections` depend on
  `class_room_id`, subjects on academic year).
- `date`/`time` use a small in-app picker modal built from primitives (no new
  native dependency), storing `YYYY-MM-DD` and `HH:mm`. Web and native share the
  same component.
- Form submit mirrors the web `MasterForm` semantics: trim strings, coerce
  numbers with `Number()`, booleans with `Boolean()`, skip empty optional fields,
  `PUT {endpoint}/{id}` when editing else `POST {endpoint}`. On 422, map
  `errors[field][0]` onto the matching field and show a summary banner.

### Navigation

`nav.ts` produces `NavSection[]`:

- **Overview**: Dashboard (always), plus portal items when a student is linked.
- Staff sections mirroring the web registry, filtered by `user.permissions`:
  Admissions & Students, Academics, Finance, People, Operations, Administration.
- Each section renders only when it has visible items. Module items resolve to
  `/v1`-backed config screens; unimplemented phases are hidden until their
  module is registered (so the sidebar never links to a dead screen).
- The child selector stays in the sidebar for portal accounts.

### Campus / institution context

- On sign-in the app loads `GET /v1/auth/me` (already) and the user's allowed
  campuses (`GET /v1/campuses`). If more than one campus is available, the
  sidebar shows a campus switcher; otherwise it shows the fixed campus name.
- The selected campus id is stored in a `CampusProvider` and automatically sent
  as `X-Campus-Id` by `apiFetch` for admin calls. Switching campus reloads the
  active list/form.
- Platform admin (all campuses) defaults to the first campus until one is chosen.
- Portal (`/v1/me/*`) calls remain scoped by the linked student, not by campus.

### Routing

Add a lightweight in-app navigator state rather than pulling in a navigation
library: `AdminNavProvider` holds `{ moduleKey, mode: "list" | "detail" | "create" | "edit", id? }`.
`App.tsx` renders the matching admin screen inside the existing shell. Back
returns to the list. This keeps the shell identical to the portal experience.

## Phase 1 module definitions

Permissions come from `config/rbac.php` and the API route middleware. Lookups
reference other resource list endpoints.

| Module | Endpoint | Permissions | Key columns | Key fields | Lookups |
|---|---|---|---|---|---|
| Academic years | `/v1/academic-years` | `academic.*` | name, code, starts_on, ends_on, status, is_current | name, code, starts_on, ends_on, status(select draft/active/closed), is_current, notes | — |
| Terms | `/v1/terms` | `academic.*` | name, academic year, starts_on, ends_on, is_current | academic_year_id, name, sequence, starts_on, ends_on, is_current | academicYears |
| Stages | `/v1/stages` | `academic.*` | name, code, sequence, is_active | name, code, sequence, is_active | — |
| Classes | `/v1/classes` | `academic.*` | name, stage, capacity, in_charge, is_active | stage_id, name, code, sequence, capacity, room, in_charge_user_id, is_active | stages, staffUsers |
| Sections | `/v1/sections` | `academic.*` | name, class, capacity, in_charge, is_active | class_room_id, name, capacity, in_charge_user_id, is_active | classRooms, staffUsers |
| Subjects | `/v1/subjects` | `academic.*` | name, code, type, credit_hours, weekly_periods, is_active | name, code, type(select core/elective/optional), credit_hours, weekly_periods, is_active | — |
| Periods | `/v1/periods` | `academic.*` | name, sequence, starts_at, ends_at, is_break, is_active | name, sequence, starts_at(time), ends_at(time), is_break, is_active | — |
| Rooms | `/v1/rooms` | `academic.*` | name, code, block, floor, type, capacity, is_active | name, code, block, floor, type(select), capacity, is_active | — |
| Class subjects | `/v1/class-subjects` | `academic.*` | class, subject, academic year, is_elective, weekly_periods | academic_year_id, class_room_id, subject_id, is_elective, weekly_periods, is_active | academicYears, classRooms, subjects |
| Teaching assignments | `/v1/teaching-assignments` | `academic.*` | teacher, subject, class, section, academic year, weekly_periods | academic_year_id, teacher_user_id, subject_id, class_room_id, section_id, weekly_periods, is_active | academicYears, staffUsers, subjects, classRooms, sections |
| Syllabus units | `/v1/syllabus-units` | `curriculum.*` | title, subject, class, term, sequence, estimated_periods | academic_year_id, class_room_id, subject_id, term_id, title, description, sequence, estimated_periods | academicYears, classRooms, subjects, terms |
| Class books | `/v1/class-books` | `curriculum.*` | title, author, class, subject, is_required, price | academic_year_id, class_room_id, subject_id, title, author, publisher, isbn, edition, price, is_required | academicYears, classRooms, subjects |

Field rules mirror each controller's `rules()` method exactly (the source of
truth). Filters mirror the controller `index` params: `is_active` where present,
`academic_year_id` for terms/class-subjects/syllabus-units/class-books,
`class_room_id`/`section_id`/`subject_id` for dependent lists, `type` for
rooms/subjects.

## UX behaviour

- **List**: sticky search field (when `searchable`), horizontally scrollable
  filter chips, rows with the configured columns, empty/loading/error states,
  pull-to-refresh, infinite scroll to `meta.last_page`, and a floating or header
  create button shown only when the user has the create permission.
- **Form**: grouped fields, inline per-field validation errors, a submit button
  that disables while saving, and a top error banner for non-field errors.
- **Detail**: read-only field list, edit/delete buttons gated by permission, and
  a confirmation step before delete.
- **Permission gating**: list/form/detail render a permission-denied notice when
  the required permission is missing, matching the web `PermissionGate`.

## Error handling and edge cases

- 401 clears the token and returns to login.
- 403 shows a permission/tenant notice rather than a raw error.
- 422 maps field errors; unknown fields surface in the banner.
- Empty list, last page reached, and campus switch mid-view are handled by
  resetting to page 1.
- Dates are sent as `YYYY-MM-DD`, times as `HH:mm`; numbers are coerced and
  validated (`min`/`step`) before submit.

## Testing and verification

- `npx tsc --noEmit` and `npx expo lint` clean.
- Metro web bundle compiles; manual smoke test of list → create → edit → delete
  for at least one Phase 1 module against the live API, plus a permission check
  with a `student` account confirming admin sections are hidden.
- API regressions guarded by existing backend tests; no backend change in this
  phase.

## Files

- New: `apps/mobile/src/admin/*` (engine, fields, registry).
- New: `apps/mobile/src/lib/campus.tsx` (campus context provider).
- Rewrite: `apps/mobile/src/lib/nav.ts` (permission-driven sections).
- Update: `apps/mobile/App.tsx` (admin nav state, campus provider, module screens).
- Update: `apps/mobile/src/components/Sidebar.tsx` (sections + campus switcher).
- No backend changes. The app is previewed through the Expo dev server; no VPS
  deploy is required for this phase.
