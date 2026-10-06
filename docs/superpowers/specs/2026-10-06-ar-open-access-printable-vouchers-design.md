# AR Addendum 2 — Open Access + Printable Vouchers & Receipts

Status: design (approved)
Depends on:
`docs/superpowers/specs/2026-10-06-accounts-receivable-redesign-design.md` and
`docs/superpowers/specs/2026-10-06-ar-ubiquitous-voucher-generation-design.md`
(both shipped).
Priority: completes the "AR is the most wanted module" goal before Accounts
Payable.

## Objective

Make Accounts Receivable the fastest, smoothest surface in the product:

1. **Open access.** Anyone with fee, accounts (finance) or academics view rights
   can view, generate, and collect against fee vouchers — the same way a campus
   admin can. Principal is explicitly included.
2. **Printable everywhere.** A generated voucher prints as a proper school fee
   challan; a payment prints as a proper fee receipt — both with the school
   header, from any surface a student appears on.
3. **Find and act in one place.** The AR list becomes the voucher workspace:
   search, filter, print, and collect from a single screen.

## Decisions (agreed)

1. **View rights grant create.** A user who can view AR can also generate
   vouchers and record payments. This is intentional: front-desk, academic and
   accounts staff all need to issue vouchers and take money without waiting on a
   separate grant.
2. **Academic access is scoped to academic managers, not every academic
   viewer.** The original proposal used `academic.view`, but every teacher holds
   that permission, which would have let teachers issue vouchers, collect money
   and read fee reports. AR now uses `academic.create | academic.edit` instead,
   covering the Principal and Academic Coordinator while excluding plain
   `academic.view` holders such as teachers, librarians and IT admins.
3. **Principal is in.** Principal is covered by the OR set already (it holds
   `fee.view` and `finance.view`), and additionally receives explicit
   `fee.view` / `fee.create` so the intent is literal and robust.
4. **D1 — reuse, don't duplicate.** The existing AR reports list already
   searches, filters, paginates, exports and prints. It becomes the voucher
   workspace with per-row **Print** and **Collect payment** actions. A single new
   **Receipts** list is added. No parallel voucher list.
5. **No schema changes.** Reuse `fee_charges`, `fee_charge_lines`, `fee_receipts`
   and `fee_receipt_allocations` exactly as shipped. Payments are recorded
   through a new endpoint on the existing receipt model.
6. **Destructive and configuration actions stay restricted.** Voiding charges,
   fee-structure authoring, refunds and approvals keep their current permissions.

## Permission model

Two OR-sets, expressed with Spatie's pipe syntax (`a|b` = any-of):

- `AR_VIEW`  = `fee.view | finance.view | academic.create | academic.edit`
- `AR_WRITE` = `fee.view | finance.view | academic.create | academic.edit | fee.create | finance.create`

### Route changes (`apps/api/routes/api.php`)

| Endpoint | Before | After |
| --- | --- | --- |
| `GET fee-counter/students` | `fee.view` | `AR_VIEW` |
| `GET fee-counter/students/{student}/dues` | `fee.view` | `AR_VIEW` |
| `POST fee-counter/generate` | `fee.create` | `AR_WRITE` |
| `POST fee-counter/generate-bulk` | `fee.create` | `AR_WRITE` |
| `GET fee-charges` | `fee.view` | `AR_VIEW` |
| `GET fee-charges/{feeCharge}` | `fee.view` | `AR_VIEW` |
| `GET fee-receipts` | `fee.view` | `AR_VIEW` |
| `GET fee-receipts/{feeReceipt}` | `fee.view` | `AR_VIEW` |
| `POST fee-receipts` (new) | — | `AR_WRITE` |
| `GET fee-reports/ar`, `ar-summary`, `defaulters`, `students/{student}/statement` | `fee.view` | `AR_VIEW` |

Unchanged: `POST fee-charges/{feeCharge}/void`, `fee-structures` create/edit/
delete, `fee-refunds`, `fee-payments/*` (legacy model), all approvals.

### Role config (`apps/api/config/rbac.php`)

Add `fee.view`, `fee.create`, `fee.export` to the **Principal** definition. Because
production is not re-seeded by the deploy script, the effective grant is applied
with a targeted, idempotent `givePermissionTo` on the Principal role; config is
kept in sync as the documented source of truth.

### Frontend

- `apps/web/src/lib/auth.tsx`: add `canAny(permissions: string[])`.
- `apps/web/src/lib/nav.ts`: `permission` accepts `string | string[]`; matching
  uses `canAny`. AR/fee nav entries use `AR_VIEW`.
- `FeeVoucherAction`, `FeeVoucherQuickAction`, `AppShell` global action and AR
  report row gates switch from `can("fee.create")` to `canAny(AR_VIEW)`.
- Route-level `PermissionGate` for AR pages switches to the `AR_VIEW` set.

## Printable fee challan

New page `apps/web/src/app/dashboard/finance/accounts-receivable/vouchers/[id]/page.tsx`.

- Data: `GET /v1/fee-charges/{id}`. `FeeChargeResource` gains optional `campus`
  and `institution` (whenLoaded); `FeeChargeController::show` loads them.
  `CampusResource` gains `settings` so the print header can use a stored logo.
- Layout (print-first, `@media print` hides app chrome): institution/campus name,
  address, phone, email, logo; title **FEE VOUCHER**; voucher no and due date;
  student block (name, admission no, class/section, roll, guardian); fee-lines
  table; subtotal / discount / total / paid / balance; status; payment
  instructions; signature lines.
- `?print=1` triggers `window.print()` once loaded.
- Launch: a shared **Print voucher** action placed next to Generate on students
  list, student profile, AR reports rows and the vouchers list.

## Standalone payment + printable receipt

New page `apps/web/src/app/dashboard/finance/accounts-receivable/receipts/[id]/page.tsx`.

- Backend `POST /v1/fee-receipts` accepts
  `{ student_id, amount, method, payment_date, reference?, notes?, fee_charge_id? }`,
  creates a `FeeReceipt` plus `FeeReceiptAllocation` rows (FIFO oldest-first, or
  pinned to `fee_charge_id`), updates each charge's `paid_amount`/`status`, and
  returns a `FeeReceiptResource` with allocations. Implemented as
  `FeeCounterService::receivePayment()` reusing the existing `allocatePayment`
  logic. Overpayment beyond total outstanding is rejected (422).
- `FeeReceiptResource` gains optional `campus` / `institution`;
  `FeeReceiptController::show` loads them.
- Web **Collect payment** dialog: student pre-bound or searched; lists
  outstanding charges with a running total; amount (default = total), method,
  date, reference, notes; on success routes to the printable receipt.
- Receipt print layout: header, **FEE RECEIPT**, receipt no/date, student,
  amount in figures and words, method/reference, allocation table, "Received by"
  signature. `?print=1` auto-prints.

## Searchable lists

- **Vouchers:** the AR reports page gains per-row **Print** and **Collect
  payment** actions and keeps its existing search/filters/CSV/print.
- **Receipts:** new list page `.../accounts-receivable/receipts/page.tsx` backed
  by `GET /v1/fee-receipts` (search by receipt no / student, date range), with a
  Print action per row and CSV export.

## Navigation

Add `Receipts` under the Finance section (permission `AR_VIEW`). Rename the AR
reports nav label to reflect its dual role as the voucher workspace if needed;
keep existing routes stable.

## Data flow

```
Generate voucher  -> POST /v1/fee-counter/generate -> voucher row
Print challan     -> GET  /v1/fee-charges/{id}     -> vouchers/[id]?print=1
Collect payment   -> POST /v1/fee-receipts         -> receipts/[id]?print=1
Print receipt     -> GET  /v1/fee-receipts/{id}    -> receipts/[id]?print=1
```

## Error handling

- Payment `amount` > total outstanding, or no outstanding balance -> 422 with a
  clear message; the dialog disables submit when nothing is due.
- `fee_charge_id` that does not belong to the student -> 422.
- Unauthorized -> existing Spatie 403; frontend hides actions via `canAny`.
- Missing campus/institution branding degrades gracefully (fields omitted).

## Testing

- Feature tests:
  - An `academic.create` user can list charges, generate a voucher, and record a
    receipt; an `academic.view`-only user (e.g. a teacher) and a user with none
    of the perms both get 403.
  - Void charge still 403 for `academic.create`.
  - `receivePayment` allocates FIFO, updates statuses, rejects overpayment.
  - Principal permission set includes the fee view/create perms.
- Playwright: print a challan from students list, profile and AR reports; collect
  a payment; print the receipt; render lists; check narrow viewport; zero console
  errors.

## Out of scope

- AR double-entry journal posting (separate sub-project).
- Accounts Payable (separate spec).
- Reworking the legacy `/v1/fee-vouchers` and `/v1/fee-payments` flows.
