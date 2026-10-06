# Implementation Plan — AR Ubiquitous Fee Voucher Generation

Companion to:
`docs/superpowers/specs/2026-10-06-ar-ubiquitous-voucher-generation-design.md`.
Priority: ships before the Accounts Payable module.

Each phase ends with `tsc --noEmit` + `eslint` clean, a verification step, and a
commit/push/deploy per the standing workflow.

---

## Phase A — Extract the reusable generator + global dialog

Goal: turn the page-specific counter into shared pieces and prove parity.

Files / work:
- `apps/web/src/components/fee-counter/GenerateVoucherCounter.tsx` (972 lines):
  split into focused pieces under `components/fee-counter/`:
  - `StudentSearchPanel.tsx` — search + year/class/section facets + result list.
  - `StudentDuesCard.tsx` — student card + dues/derived summary.
  - `VoucherBuilder.tsx` — monthly/exam/other cart builder + discount.
  - `PaymentPanel.tsx` — pay-now amount/method/reference.
  - `FeeVoucherGenerator.tsx` — orchestrator; owns all state and accepts
    `initialStudent`, `initialContext`, `showSearch`, `onGenerated`, `onClose`.
  - `generate-voucher/page.tsx` renders `FeeVoucherGenerator` with
    `showSearch`; behaviour must be byte-for-byte equivalent.
- `apps/web/src/components/fee-counter/FeeVoucherDialog.tsx` — modal host using
  the existing `dialog-overlay`/`dialog-panel` classes; accepts the same props
  plus `open`/`onOpenChange`; Escape + backdrop close; `onGenerated` bubbles.
- `apps/web/src/components/fee-counter/FeeVoucherAction.tsx` — standard launch
  button (`student?`, `label?`, `variant?`, `onGenerated?`); renders `null`
  unless `can("fee.create")`.
- `apps/web/src/components/fee-counter/FeeVoucherProvider.tsx` — context with
  `openVoucher({ student? })`; `AppShell` mounts one `FeeVoucherDialog` and
  wraps children in the provider.
- `apps/web/src/components/AppShell.tsx` — add the global "Generate Voucher"
  top-bar action (gated by `fee.create`) calling `openVoucher()`.
- Retire the obsolete `apps/web/src/components/GenerateVoucherDialog.tsx`
  (old `/v1/fee-vouchers/*` flow); replace its use on `/dashboard/fees/page.tsx`
  with `FeeVoucherAction` so there is a single generator.

Verification: Playwright regression on the AR counter page
(`http://localhost:3100`) — search, open dues, generate monthly voucher with
partial payment, print; global action opens from `/dashboard`. `tsc`/`eslint`
clean.

---

## Phase B — Student list, profile, and AR reports

Files / work:
- `apps/web/src/app/dashboard/students/page.tsx` — add an actions column with
  `FeeVoucherAction` per row (pre-bound `{ id, name }`), reload on generated.
- `apps/web/src/app/dashboard/students/[id]/page.tsx` — header
  `FeeVoucherAction` next to Edit/Back.
- `.../accounts-receivable/reports/page.tsx` — per-row `FeeVoucherAction`
  (pre-bound from `row.student_id`/`row.student_name`).
- i18n keys for the new labels/actions in `packages/i18n/src/locales/en.ts` and
  regenerate `index.ts`.

Verification: Playwright opens the dialog pre-bound from each surface, generates
a voucher, and confirms the source list/report reloads.

---

## Phase C — Remaining student surfaces

Files / work:
- `apps/web/src/app/dashboard/admissions/[id]/page.tsx` — action once the
  admission has a `student_id`.
- `apps/web/src/app/dashboard/attendance/students/page.tsx` — per-row action.
- `apps/web/src/app/dashboard/exams/marks/page.tsx` and
  `.../exams/analysis/page.tsx` — per-row action on the class roster.
- `apps/web/src/app/dashboard/reports/students/page.tsx` — per-row action.
- Student-picker contexts (hostel/transport/canteen/etc. details or the
  selected-student card) — add `FeeVoucherAction` on the chosen student where it
  is natural; at minimum the global action covers these pages.

Verification: Playwright spot-check each surface; `tsc`/`eslint` clean.

---

## Phase D — Bulk generation from a roster

Files / work:
- Optional server endpoint
  `POST /v1/fee-counter/generate-bulk` in `FeeCounterController` accepting
  `{ academic_year_id, class_room_id, section_id?, period_year, period_month,
  billing_kind }`; loops students, reusing `FeeCounterService`, and returns a
  per-student summary (`created`, `skipped`, `errors`). Idempotent via the
  existing monthly duplicate-guard index. Gated `fee.create`.
- `BulkFeeVoucherDialog.tsx` — launched from a class/section roster (e.g.
  attendance roster or exams marks header) and from the global dialog; shows a
  result summary with per-student links.

Verification: bulk-generate a month for a class with a mix of existing/new
charges; confirm skipped duplicates and correct new counts; reports reflect the
new charges.

---

## Phase E — Hardening, i18n, deploy

- Final `tsc --noEmit` + `eslint` in `apps/web`; regenerate route-paths if routes
  changed; run the i18n check script.
- Playwright full pass over every launch point on desktop + narrow viewport.
- Commit, push, deploy via `/root/deploy-edu.sh`, verify health and the new
  launch points on production.

---

## Deferred

- Accounts Payable module (design already written:
  `docs/superpowers/specs/2026-10-06-accounts-payable-module-design.md`).
- Sub-project 3 (AR double-entry ledger posting).
