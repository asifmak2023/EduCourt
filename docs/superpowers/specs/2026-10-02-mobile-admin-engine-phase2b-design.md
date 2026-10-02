# Mobile Admin Engine - Phase 2b: Documents, Promotions, Student Create Parity

Status: design
Depends on: `2026-10-02-mobile-admin-engine-design.md` (Phase 1 engine),
`2026-10-02-mobile-admin-engine-phase2-design.md` (Phase 2 modules).

Phase 2b closes the items explicitly deferred by Phase 2:

1. Student create/edit **guardian repeater** and the optional nested
   **enrollment** block (web parity).
2. Bulk **Promotions** screen (`POST /v1/students/promote`).
3. Admission and student **document** upload/list/download/delete/verify.

No backend API changes are required; every endpoint already exists. Two engine
extensions plus one new bespoke screen are added.

## Scope

- Section: "Admissions & Students".
- Mobile engine under `apps/mobile/src/admin/`.
- No navigation library; reuse the `customScreen` route extension (below).

Out of scope (deferred to later phases): student bulk import/export, admission
bulk actions, promotion history/rollback.

## API surface (existing)

### Documents

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/admissions/{id}/documents` | GET | `admission.view` |
| `/v1/admissions/{id}/documents` | POST (multipart) | `admission.create` |
| `/v1/admissions/{id}/documents/{doc}/download` | GET | `admission.view` |
| `/v1/admissions/{id}/documents/{doc}` | DELETE | `admission.delete` |
| `/v1/students/{id}/documents` | GET | `student.view` |
| `/v1/students/{id}/documents` | POST (multipart) | `student.create` |
| `/v1/students/{id}/documents/{doc}/download` | GET | `student.view` |
| `/v1/students/{id}/documents/{doc}/verify` | POST | `student.approve` |
| `/v1/students/{id}/documents/{doc}` | DELETE | `student.delete` |

Document types (shared enum): `birth_certificate`, `identity_card`, `photo`,
`previous_report`, `transfer_certificate`, `other`.

Admission upload fields: `type` (required), `title`, `file` (required,
<=10 MB, pdf/jpg/jpeg/png/webp/doc/docx). Student upload adds `issued_on`,
`expires_on`, `notes`.

Index returns a non-paginated `{ data: [...] }` collection with
`download_url`, `type_label`, `original_name`, `size`, and (student)
`is_verified`.

### Promotions

`POST /v1/students/promote` (permission `student.edit`):

```json
{
  "from_academic_year_id": 12,
  "to_academic_year_id": 13,
  "from_class_room_id": 3,
  "to_class_room_id": 4,
  "section_id": 8,
  "repeat_student_ids": [101, 102]
}
```

`section_id` optional; `repeat_student_ids` is a list of students who repeat
(instead of being promoted). Response `{ message, promoted }`. Candidates are
read with `GET /v1/students?academic_year_id=&class_room_id=&per_page=200`.

### Student create/update nested payload

`POST /v1/students` accepts flat profile fields plus:

- `guardians[]`: `{ guardian_id, relationship, is_primary, is_emergency_contact }`
  (`guardian_id` required, `relationship` in `father|mother|guardian|other`).
- `enrollment`: `{ academic_year_id, class_room_id, section_id?, roll_number?,
  starts_on? }` (singular; create only; `update` ignores it).

New guardians are created first via `POST /v1/guardians` with `{ name, phone }`
to obtain a `guardian_id` (web parity).

## Engine extensions

### A. Repeater field

```ts
interface RepeaterFieldConfig extends BaseFieldConfig {
  type: "repeater";
  itemFields: InputFieldConfig[];   // subfields, flat (no photo/repeater)
  addLabel: string;                 // e.g. "Add guardian"
  createEndpoint?: string;          // "POST /v1/guardians" when a row is new
  createBody?: (row) => object;     // row -> { name, phone }
  mapItem: (row, createdId?) => object; // row -> nested payload item
  emptyItem: () => Record<string, unknown>;
}
```

- Rendered by `fields/RepeaterField.tsx`: a list of removable rows, each row
  renders its `itemFields` via the existing `Field` component, plus an "Add"
  button.
- `ModuleFormScreen` pre-processes repeaters before `buildPayload`:
  for each row, if a row-level identity key is present use it, otherwise if the
  `createEndpoint` is set and the row's create fields are non-empty, POST to
  create the related record and capture `data.id`; then `mapItem` produces the
  nested item. Rows that are blank (no identity and no create fields) are
  dropped. The resulting array is written to `values[field.name]`.
- `initialValues`/`mergeRecord` treat a repeater as `[]`. `mergeRecord` maps
  existing `record[name]` entries into rows using a reverse of `mapItem`
  (each existing item becomes a row with its identity key set).

### B. Group field (toggle + nested object)

```ts
interface GroupFieldConfig extends BaseFieldConfig {
  type: "group";
  toggleLabel: string;        // "Enroll now"
  fields: InputFieldConfig[]; // nested fields, flat
  wrapKey: string;            // "enrollment"
  createOnly?: boolean;       // hidden when editing
}
```

- Rendered by `fields/GroupField.tsx`: a checkbox row; when checked, the nested
  fields render indented.
- On submit, when checked, the nested fields are built into an object written to
  `values[wrapKey]`; when unchecked the key is omitted.
- `createOnly` groups are not rendered on the edit form.

`buildPayload` gains awareness of `repeater`/`group` (they are resolved to
arrays/objects before the call, then emitted verbatim).

### C. Documents detail section

```ts
interface DocumentSectionConfig {
  title: string;                       // "Documents"
  path: (item) => string;              // base path, e.g. `/v1/students/5/documents`
  types: SelectOption[];               // document type options
  uploadPermission?: string;
  deletePermission?: string;
  verifyPermission?: string;           // student only
  withValidity?: boolean;              // student: issued_on/expires_on/notes
}

documentsSection(config): DetailSection
```

- `documents.tsx` exports `documentsSection` and a `DocumentsList` component
  that fetches the collection, shows rows (title, type label, size, verified
  badge), and exposes Upload / Download / Delete / Verify actions gated by
  permission.
- Upload uses `expo-document-picker` (`pickDocument`) and `apiUpload` with a
  `FormData` of `type`, optional `title`/`issued_on`/`expires_on`/`notes`, and
  `file`.
- Download uses a new authenticated `apiDownload(path)` in `lib/api.ts`
  returning a `Blob`; on web it triggers an object-URL anchor download. On
  native it falls back to `Linking.openURL(download_url)` (documented
  limitation).
- Registered through the existing `detailSections` array; no `ModuleConfig`
  type change.

## Custom screen route

`NavItem` gains `customScreen?: string`. `nav.ts` appends a Promotions item to
the "Admissions & Students" section when the user has `student.edit`:

```
{ key: "promotions", label: "Promotions", subtitle: "Bulk student promotion",
  customScreen: "promotions" }
```

`App.tsx` keeps a `customScreens` registry (`src/admin/screens.ts`) mapping
`"promotions" -> PromotionsScreen`. When the active nav item has
`customScreen`, render it instead of the module/portal flow; back is not
required (single screen).

## Promotions screen

`src/admin/screens/PromotionsScreen.tsx`:

1. **From**: academic year lookup + class lookup + "Load students" button.
2. Candidates from `GET /v1/students?academic_year_id&class_room_id&per_page=200`,
   each row with a "Repeat" checkbox.
3. **To**: academic year lookup + class lookup + optional section lookup
   (filtered by `to_class_room_id` via the existing dependent lookup).
4. **Promote** posts the payload and shows the `promoted` count `message`.
5. Gated by `student.edit`.

Validation mirrors the API: from/to year and class required; `section_id` must
belong to the target class (enforced server-side).

## Files

New:

- `apps/mobile/src/admin/fields/RepeaterField.tsx`
- `apps/mobile/src/admin/fields/GroupField.tsx`
- `apps/mobile/src/admin/documents.tsx`
- `apps/mobile/src/admin/screens.ts`
- `apps/mobile/src/admin/screens/PromotionsScreen.tsx`

Changed:

- `apps/mobile/src/admin/types.ts` (repeater/group configs)
- `apps/mobile/src/admin/form.ts` (repeater/group handling)
- `apps/mobile/src/admin/ModuleFormScreen.tsx` (render + pre-submit)
- `apps/mobile/src/admin/registry.ts` (student guardians/enrollment, documents
  sections, promotions permission)
- `apps/mobile/src/lib/api.ts` (`apiDownload`, `apiUpload` already exists)
- `apps/mobile/src/lib/nav.ts` (`customScreen`)
- `apps/mobile/App.tsx` (custom screen registry)
- `apps/mobile/package.json` (`expo-document-picker` via `npx expo install`)

## Verification

- `tsc --noEmit` and `expo lint` clean.
- Metro web bundle loads with zero transform errors.
- API smoke:
  - student document upload -> list -> verify -> delete.
  - admission document upload -> list -> delete.
  - promote a from-year/class into a to-year/class; assert `promoted` count and
    that repeat students are marked `repeated`.
  - create a student with two guardians (one new, one existing) and an inline
    enrollment; assert the response contains both guardians and one enrollment.
- Manual preview: upload a document, download it, run a promotion, create a
  student with guardians/enrollment.

## Risks

- `expo-document-picker` is a native module; the web build supports it, native
  requires a dev build (already the case for `expo-image-picker`).
- Authenticated download on native is best-effort until a file-system/sharing
  module is added.
- Promoting across campuses is impossible by construction (tenant-scoped
  lookups); repeat student ids are not cross-checked server-side, matching web.
