# Mobile Admin Engine - Phase 3: Fees & Accounting

Status: design
Depends on: `2026-10-02-mobile-admin-engine-design.md` (Phase 1 engine),
`2026-10-02-mobile-admin-engine-phase2-design.md` (Phase 2 modules),
`2026-10-02-mobile-admin-engine-phase2b-design.md` (documents/repeater/group).

Phase 3 delivers finance parity for campus staff. It is split so each half can be
implemented, verified, committed, pushed and deployed independently:

- **Phase 3a - Fees** (permissions `fee`, `fine`, `reminder`, `concession`):
  fee heads, fee plans, fee vouchers, payments, refunds, fines, reminders,
  concession policies, concessions and the fee reports screen.
- **Phase 3b - Accounting** (permission `finance`): chart of accounts, journals,
  trial balance, expenses, vendors, expense categories, budgets and reports.

Scholarships and scholarship awards were already shipped in Phase 2 and are not
repeated here. No backend API changes are required; every endpoint already
exists. Phase 3a adds three engine extensions plus one bespoke screen. Phase 3b
is scoped at a high level in this document and gets its own detailed section
during implementation.

## Scope

- Sections: a new **"Finance"** section (`SECTIONS.finance`) holding the 3a fee
  modules; a **"Reports"** entry for the fee reports screen.
- Mobile engine under `apps/mobile/src/admin/`.
- No navigation library; reuse the `customScreen` route extension.

Out of scope for 3a: online payment intents (`/v1/online-payments`, gateway
provider work), fee plan import/export, bulk voucher generation beyond the
existing generate endpoints, and accounting (3b).

## Engine extensions (Phase 3a)

### A. Collection-level header actions

Some fee operations act on the collection, not a row (generate vouchers, run a
reminder batch, send all). Add:

```ts
interface ModuleConfig {
  // ...
  headerActions?: ActionConfig[];
}
```

`ActionConfig` already supports `method`, `path`, `body`, `fields`,
`submitLabel`, `permission`, `confirm`, `successMessage`. `ModuleListScreen`
renders each header action as a button in the list header; tapping opens the
existing `ActionFormModal` with the action's `fields`. This reuses all form
machinery and needs no bespoke screen for generate flows.

### B. Multiselect field

Concession policy `criteria` is a nested object containing arrays
(`criteria.gender[]`, `criteria.categories[]`). Add:

```ts
interface MultiSelectFieldConfig extends BaseFieldConfig {
  type: "multiselect";
  options: SelectOption[];
  wrapKey?: string; // "criteria" -> value stored at values.criteria[name]
}
```

Rendered by `fields/MultiSelectField.tsx` as toggleable chips; value is a
`string[]`. `buildPayload` writes arrays through unchanged; `initialValues`
treats a multiselect as `[]`. Used inside a `group` for concession policies so
`criteria` is only sent when the group toggle is on.

### C. Lookups

New entries in `useLookups.ts`:

| key | endpoint | labelKey |
|---|---|---|
| `feeHeads` | `/v1/fee-heads` | `name` |
| `feePlans` | `/v1/fee-plans` | `name` |
| `feeVouchers` | `/v1/fee-vouchers` | `voucher_no` |
| `feePayments` | `/v1/fee-payments` | `receipt_no` |
| `concessionPolicies` | `/v1/concession-policies` | `name` |
| `fineRules` | `/v1/fine-rules` | `name` |

`feeVouchers` depends on `student_id` and `feePayments` depends on `student_id`
(`depParam`), so dependent lookups filter by the selected student.

### D. Fee reports screen (bespoke)

`screens/FeeReportsScreen.tsx`, registered in `screens.ts` and surfaced as a
permission-gated nav item (`fee.view`). Three read-only tabs:

- **Defaulters** - `GET /v1/fee-reports/defaulters?academic_year_id=&class_room_id=&min_balance=&per_page=`.
- **Collection** - `GET /v1/fee-reports/collection?from=&to=&academic_year_id=`.
- **Class summary** - `GET /v1/fee-reports/classes/summary?academic_year_id=`.

Each tab has its own filter row and a simple results list. A student statement
(`GET /v1/fee-reports/students/{student}/statement`) is linked from the student
picker on the Defaulters tab.

## API surface - Phase 3a (existing)

### Fee heads (`fee.*`) - `apps/api/.../FeeHeadController.php`

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/fee-heads` | GET | `fee.view` |
| `/v1/fee-heads` | POST | `fee.create` |
| `/v1/fee-heads/{id}` | GET/PUT/DELETE | `fee.view`/`fee.edit`/`fee.delete` |

Fields: `code` (unique per campus), `name`, `description`, `income_account_id`
(optional, lookup `finance.accounts` when 3b lands; plain number field for 3a),
`sort_order`, `is_active`. Filters: `search`, `is_active`.

### Fee plans (`fee.*`) - `FeePlanController.php`

CRUD. Filters `academic_year_id`, `class_room_id`, `is_active`.

- Fields: `academic_year_id` (lookup), `class_room_id` (lookup), `name`,
  `description`, `is_active`, `late_fee_type` (`none|flat|percent`),
  `late_fee_amount`, `late_fee_grace_days`.
- `items` repeater: `{ fee_head_id (lookup feeHeads, required), amount (number,
  required), is_optional (checkbox), sort_order (number) }`.
- `installments` repeater: `{ label (text, required), due_date (date, required),
  percentage (number, required, 1..100) }`. Server enforces percentages sum to
  100 and at least one item + one installment.

### Fee vouchers (`fee.*`) - `FeeVoucherController.php`

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/fee-vouchers` | GET | `fee.view` |
| `/v1/fee-vouchers/generate` | POST | `fee.create` |
| `/v1/fee-vouchers/generate-prorated` | POST | `fee.create` |
| `/v1/fee-vouchers/{id}` | GET | `fee.view` |
| `/v1/fee-vouchers/{id}/void` | POST | `fee.approve` |
| `/v1/fee-vouchers/{id}/late-fee` | POST | `fee.approve` |

- List filters: `search` (voucher_no/student), `student_id`, `academic_year_id`,
  `class_room_id`, `status` (`unpaid|partial|paid|void`).
- Columns: `voucher_no`, student name, `due_date`, `amount`, `paid_amount`,
  `balance`, `status`.
- **Generate** header action fields: `academic_year_id` (lookup), `class_room_id`
  (lookup), `fee_plan_id` (lookup feePlans), `apply_scholarships` (checkbox),
  `apply_concessions` (checkbox). Body drops empty optional booleans.
- **Generate prorated** header action adds `student_id` (lookup) + `join_date`.
- Row actions: **Void** (field `memo` textarea, confirm), **Apply late fee**
  (no fields, confirm).
- Detail sections: voucher lines (from `lines[]`), payments (from `payments[]`).

### Fee payments (`fee.*`) - `FeePaymentController.php`

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/fee-payments` | GET/POST | `fee.view`/`fee.create` |
| `/v1/fee-payments/{id}` | GET | `fee.view` |
| `/v1/fee-payments/{id}/void` | POST | `fee.approve` |
| `/v1/fee-payments/{id}/apply` | POST | `fee.edit` |

- List filters: `search` (receipt_no/student), `student_id`, `fee_voucher_id`,
  `method`, `status`, `from`, `to`.
- Create fields: `student_id` (lookup), `fee_voucher_id` (lookup feeVouchers,
  dependsOn `student_id`, required), `payment_date` (date), `amount` (number,
  > 0), `method` (`cash|bank_transfer|cheque|online|card|other`), `reference`,
  `notes`. Server rejects amount beyond voucher balance.
- Row actions: **Void** (`memo` textarea), **Apply** (no fields).

### Fee refunds (`fee.*`) - `FeeRefundController.php`

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/fee-refunds` | GET/POST | `fee.view`/`fee.create` |
| `/v1/fee-refunds/{id}` | GET | `fee.view` |
| `/v1/fee-refunds/{id}/approve\|reject\|revoke` | POST | `fee.approve` |

- Filters: `student_id`, `fee_payment_id`, `approval_status`, `from`, `to`.
- Create fields: `fee_payment_id` (lookup feePayments, dependsOn `student_id`),
  `refund_date`, `amount` (> 0), `method`, `reason`.
- Approve/reject/revoke actions take `decision_note` (textarea).

### Fine rules (`fine.*`) - `FineRuleController.php`

CRUD. Filters `search`, `category`, `is_active`.
Fields: `name`, `code`, `category`
(`library|lab|discipline|late_payment|other`), `amount`, `fee_head_id` (lookup
feeHeads), `is_active`, `description`.

### Student fines (`fine.*`) - `StudentFineController.php`

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/fines` | GET/POST | `fine.view`/`fine.create` |
| `/v1/fines/{id}` | GET | `fine.view` |
| `/v1/fines/{id}/apply\|waive\|revoke` | POST | `fine.approve` |

- Filters: `student_id`, `fine_rule_id`, `status`, `from`, `to`.
- Create fields: `student_id` (lookup), `fine_rule_id` (lookup fineRules),
  `academic_year_id` (lookup), `fee_voucher_id` (lookup feeVouchers, optional),
  `amount` (number, required only when no `fine_rule_id`), `reason`, `issued_on`.
- Apply: no fields. Waive: `waived_reason` textarea. Revoke: `reason` textarea.

### Fee reminders (`reminder.*`) - `FeeReminderController.php`

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/fee-reminders` | GET/POST | `reminder.view`/`reminder.create` |
| `/v1/fee-reminders/send` | POST | `reminder.send` |
| `/v1/fee-reminders/{id}` | GET/DELETE | `reminder.view`/`reminder.delete` |
| `/v1/fee-reminders/{id}/send\|cancel` | POST | `reminder.send` |

- Filters: `student_id`, `status`, `channel`, `academic_year_id`.
- **Generate** header action fields (all optional): `as_of`, `academic_year_id`,
  `class_room_id`, `channel` (`email|sms|in_app`), `overdue_only` (checkbox),
  `min_days_overdue`, `min_balance`, `force`.
- **Send all** header action (body filters) + row **Send** / **Cancel** actions.

### Concession policies (`concession.*`) - `ConcessionPolicyController.php`

CRUD. Filters `search`, `type`, `academic_year_id`, `is_active`.
Fields: `name`, `code`, `type` (`sibling|staff_ward|need_based|category|other`),
`discount_type` (`percentage|fixed`), `value`, `max_amount`, `priority`,
`is_stackable`, `requires_approval`, `is_active`, `academic_year_id` (lookup),
`class_room_id` (lookup), `description`, plus a **criteria group** (toggle) with
`gender` (multiselect `male|female|other`), `categories` (multiselect free text
- represented as a comma text field for 3a), `min_siblings` (number).

### Concessions (`concession.*`) - `ConcessionController.php`

| Endpoint | Method | Permission |
|---|---|---|
| `/v1/concessions` | GET/POST | `concession.view`/`concession.create` |
| `/v1/concessions/{id}` | GET | `concession.view` |
| `/v1/concessions/{id}/approve\|reject\|revoke` | POST | `concession.approve` |

- Filters: `student_id`, `academic_year_id`, `concession_policy_id`, `status`.
- Create fields: `student_id` (lookup), `academic_year_id` (lookup),
  `concession_policy_id` (lookup concessionPolicies), and, when no policy is
  chosen, `discount_type`, `value`, `amount`; plus `note`.
- Approve/reject/revoke: decision note textarea.

## Registry additions - Phase 3a

Add `SECTIONS.finance = "Finance"` and modules (all with `searchable` where the
API supports `search`):

| key | label | endpoint | permissions |
|---|---|---|---|
| `fee-heads` | Fee heads | `/v1/fee-heads` | fee.view/create/edit/delete |
| `fee-plans` | Fee plans | `/v1/fee-plans` | fee.view/create/edit/delete |
| `fee-vouchers` | Fee vouchers | `/v1/fee-vouchers` | fee.view/create(+header)/approve |
| `fee-payments` | Fee payments | `/v1/fee-payments` | fee.view/create/approve/edit |
| `fee-refunds` | Fee refunds | `/v1/fee-refunds` | fee.view/create/approve |
| `fine-rules` | Fine rules | `/v1/fine-rules` | fine.view/create/edit/delete |
| `student-fines` | Student fines | `/v1/fines` | fine.view/create/approve |
| `fee-reminders` | Fee reminders | `/v1/fee-reminders` | reminder.view/create/send/delete |
| `concession-policies` | Concession policies | `/v1/concession-policies` | concession.view/create/edit/delete |
| `concessions` | Concessions | `/v1/concessions` | concession.view/create/approve |

Plus `FeeReportsScreen` (`fee.view`) as a `customScreen` nav item labelled
**Fee reports**.

## Phase 3b - Accounting (high level)

Permission `finance.*`; detailed section written during 3b implementation. Web
nav grouping to mirror: Chart of accounts, Journal, Trial balance, Expenses,
Vendors, Expense categories, Budgets, Reports (`report.view`). Existing
controllers include `ChartOfAccountController`, `JournalEntryController`,
`ExpenseController`, `ExpenseCategoryController`, `VendorController`,
`BudgetController`, `FinanceReportController` (exact list confirmed at 3b
kickoff). Reuse the 3a header-action and multiselect extensions; expect a
journal-entry lines repeater and an expense-payments detail section.

## Verification

- `npx tsc --noEmit` and `npx expo lint` in `apps/mobile`.
- Metro bundle builds with 0 transform errors.
- API smoke per module: list (`GET`), create (`POST`), update where applicable,
  action endpoints, filters, and 422 paths.
- Permission gating: nav items hidden without the matching `*.view`; action
  buttons hidden without the action permission.
- Backend unchanged, so no `apps/api` deploy is required for 3a; deploy only if
  an API defect is found.

## Commit / deploy

- Spec commit, then implementation commit; push to `master`.
- Mobile-only change: no VPS deploy; `apps/api`/`apps/web` changes deploy via
  `bash /root/deploy-edu.sh` (watch for `==> Deploy complete`).
