# AR Addendum — Ubiquitous Fee Voucher Generation

Status: design
Depends on: `docs/superpowers/specs/2026-10-06-accounts-receivable-redesign-design.md`
(sub-project 2, shipped) and the live counter
(`apps/web/src/components/fee-counter/GenerateVoucherCounter.tsx`,
`/v1/fee-counter/*`).
Priority: this is the most wanted capability of the AR module. It ships **before**
the Accounts Payable module.

## Objective

Fee vouchers must be generatable from **every part of the product where a
student, or a group of students, appears** — not only from the AR counter. The
same voucher logic is reused everywhere via one shared component and one shared
API, so behaviour, validation, quick-create and printing stay identical no
matter where the user starts.

Examples of launch points: students list, student profile, admissions after
enrollment, class/section rosters, attendance roster, exam marks/defaulter
views, AR/student reports, hostel/transport/canteen student pickers, and a
global quick action available on every page.

## Decisions (agreed)

1. **One reusable generator, not per-page copies.** Extract the counter into a
   reusable `FeeVoucherGenerator` and host it in a `FeeVoucherDialog`. Pages
   mount a small `FeeVoucherAction` button instead of reimplementing anything.
2. **Pre-bound or search.** The generator accepts an optional student (and
   optional academic-year/class/section context). When pre-bound it opens
   directly on that student's dues; it can still switch students via the search
   panel. When unbound it behaves like the counter.
3. **Global quick action.** `AppShell` shows a "Generate Voucher" action
   (gated by `fee.create`) that opens the dialog with an empty student and the
   search panel, available on every dashboard page.
4. **API unchanged.** Reuse `GET /v1/fee-counter/students/{student}/dues` and
   `POST /v1/fee-counter/generate`. No new schema. Bulk generation (a whole
   class/section roster) is built on the same component and endpoint.
5. **Permissions unchanged.** `fee.create` to launch/generate, `fee.view` to
   read dues. Platform admins have no `fee.*` and never see the action.

## Architecture

**`FeeVoucherGenerator`** (`apps/web/src/components/fee-counter/`) — the
existing counter body, refactored to accept props:

```
initialStudent?: { id: number; name?: string | null } | null
initialContext?: { academic_year_id?: number; class_room_id?: number; section_id?: number }
showSearch?: boolean      // false when the mount wants a locked, pre-bound flow
onGenerated?: (result) => void
onClose?: () => void
```

All state stays lifted inside it (student selection, cart, discount, payment,
quick-create) so a fee-structure/fee-head dialog round-trip never loses the
selected student or dues — the behaviour already required by the counter.

**`FeeVoucherDialog`** — a modal (existing `dialog-overlay`/`dialog-panel`
styles) that hosts `FeeVoucherGenerator` with `showSearch` and the optional
initial student. Closes on Escape/backdrop; calls `onGenerated` so the host
page can reload lists.

**`FeeVoucherAction`** — the standard launch control. Props:
`student?: { id, name }`, `label?`, `variant?`, `onGenerated?`. Renders
nothing unless `fee.create`. Used by every mount point so adding a surface is a
one-line change.

**`FeeVoucherProvider` + global action** — `AppShell` hosts one
`FeeVoucherDialog` instance and a context so any descendant (e.g. a deeply
nested roster table) can call `openVoucher({ student })` without prop drilling.

The AR counter page keeps a full-page instance (`GenerateVoucherGenerator` with
`showSearch`), so the screen is unchanged after the refactor.

## Mount points

| Surface | Route | Behavior |
|---|---|---|
| AR counter | `/dashboard/finance/accounts-receivable/generate-voucher` | Full-page generator (unchanged) |
| Global quick action | all dashboard pages (`AppShell`) | Dialog, empty student, search inside |
| Students list | `/dashboard/students` | Per-row `FeeVoucherAction` (pre-bound) |
| Student profile | `/dashboard/students/[id]` | Header action (pre-bound) |
| Admissions | `/dashboard/admissions/[id]` (post-enroll) | Action once a student exists |
| Attendance roster | `/dashboard/attendance/students` | Per-row action |
| Exam marks / analysis | `/dashboard/exams/marks`, `/exams/analysis` | Per-row action |
| Student reports | `/dashboard/reports/students` | Per-row action |
| AR reports | `.../accounts-receivable/reports` | Per-row action (pre-bound) |
| Hostel/transport/canteen student pickers | respective `new`/detail pages | Action on the selected student |

Each mount is additive and independent, so they can ship incrementally.

## Bulk generation

From a class/section roster (or the global dialog with a class filter), offer
"Generate for all students in this class/section for the selected month". This
loops the existing per-student `dues` + `generate` calls (or a new
`POST /v1/fee-counter/generate-bulk` that does the same server-side) and
reports a per-student result summary. Idempotency is already enforced by the
monthly duplicate-guard index, so re-runs skip existing months.

## Printing

The printable Fee Receiving Voucher used by the counter is reused unchanged
from every launch point (same `window.open` printable payload returned by
`generate`).

## Testing and verification

- Refactor parity: the AR counter page behaves exactly as before (Playwright
  regression on `http://localhost:3100`).
- For each mount: open the action, confirm the dialog opens pre-bound, generate
  a monthly voucher with partial payment, and confirm the host list/report
  reloads.
- Global quick action works from an unrelated page (e.g. dashboard, attendance).
- `tsc --noEmit` + `eslint` clean; deploy via `/root/deploy-edu.sh`; verify the
  new launch points on production.

## Non-goals

- No new AR schema and no change to ledger posting (that is sub-project 3).
- No change to fee-structure/fee-head setup screens.
- Bulk generation is limited to rosters that already provide a student set;
  no background job queue is introduced.
