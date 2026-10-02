# Mobile portal sidebar design

Date: 2026-10-02

## Goal

Replace the mobile app's bottom tab bar with a proper sidebar navigation and
keep every module backed by real data (no placeholder structures).

## Scope

The mobile sidebar is a **portal** (self-service) experience, not the staff ERP.
It covers the signed-in user's own student record, or a guardian's linked
children:

- Dashboard
- Timetable
- Attendance
- Results
- Fees
- Profile

When the account has no linked student, only Dashboard and Profile are shown.
Staff ERP modules, CRUD and offline caching are explicitly out of scope.

## Navigation

- Left drawer that slides in from the left with a dimmed backdrop.
- Opened by a hamburger button in the header; closes on item tap, backdrop tap.
- On wide viewports (tablet/web preview, width >= 900) the drawer becomes a
  persistent sidebar next to the content and the hamburger is hidden.

Sidebar contents, top to bottom:

1. User block: avatar, name, campus / institution.
2. Child selector (only when more than one linked student) as a vertical list.
3. Nav items, gated the same way as today.
4. Footer: Appearance and Sign out.

## Screens

Screens keep hitting the existing `/v1/me/*` endpoints and keep their
loading / error / empty states. Each gains pull-to-refresh. The child selector
moves out of the screens and into the sidebar, so screens receive only the
active student id.

## Files

- `src/components/Sidebar.tsx` (new)
- `src/components/AppHeader.tsx` (new)
- `src/components/Screen.tsx` (body-only after refactor)
- `src/components/ChildSelector.tsx` (repurposed as vertical sidebar list)
- `App.tsx` (shell + drawer state)
- portal screens (drop inline selector / appearance props)

No backend changes and no production deploy.
