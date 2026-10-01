# Glassmorphism Surfaces + Background Blur

## Goal

Add an opt-in glassmorphism treatment to the dashboard — cards, the top navbar, and the sidebar — plus a background blur, with independent controls for blur strength, surface transparency, and background blur.

## Decisions

- Exposed as an **independent "Glass surfaces" toggle** in Settings > Appearance (not a surface-style selector, not auto-linked to the background).
- **Off by default**; nothing changes until enabled.
- Three independent sliders so the user can tune the effect:
  - **Glass blur** — the glassmorphism strength (`backdrop-filter` blur).
  - **Transparency** — how see-through the frosted surfaces are (alpha), independent of blur.
  - **Background blur** — blurs the wallpaper/gradient layer itself.
- Web-first implementation with mobile (expo-blur) parity in the same batch.

## Data model

`AppearanceConfig` (shared `@eis/appearance`) gains four fields:

| field | type | default | meaning |
| --- | --- | --- | --- |
| `glass` | boolean | `false` | enable glass surfaces |
| `glassBlur` | number | `12` | backdrop blur radius, 0–24 px |
| `glassTransparency` | number | `45` | surface transparency, 0–100 % |
| `backgroundBlur` | number | `0` | background layer blur, 0–24 px |

`normalizeAppearance` clamps every field; `DEFAULT_APPEARANCE` gains them so existing stored configs migrate without a version bump.

## Web

- The provider sets `data-glass` and the CSS variables `--glass-blur`, `--glass-alpha`, `--bg-blur` on `<html>`.
  - `--glass-alpha` = `${100 - glassTransparency}%`, floored at `15%` so text stays legible.
  - `--glass-blur` = `${glassBlur}px`.
  - `--bg-blur` = `${backgroundBlur}px`.
- `globals.css`:
  - `html[data-glass="true"] .surface-card` (all `Card` components) and `html[data-glass="true"] .app-glass` become translucent `--surface` via `color-mix`, with `backdrop-filter: blur(var(--glass-blur)) saturate(1.35)`.
  - The top navbar gets `app-glass`; the sidebar root (desktop + mobile drawer) gets `app-glass app-sidebar`, using `--surface-secondary`.
  - `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` falls back to opaque surfaces.
- `AppBackground` applies `filter: blur(var(--bg-blur))` and `transform: scale(1.08)` (to hide edge bleed) to the background layer only; the dim overlay stays crisp.

## Mobile

- `expo-blur` `BlurView` renders the header scrim; cards use a translucent `withAlpha(surface, alpha)` fill (RN has no per-view backdrop blur for arbitrary content).
- `AppBackground` wallpaper uses `Image.blurRadius` plus a `scale(1.1)` inside an `overflow: hidden` container.
- `AppearanceModal` gains a **Surface** section with a switch and stepper rows for the three sliders.
- `ThemeProvider` exposes `setGlass`, `setGlassBlur`, `setGlassTransparency`, `setBackgroundBlur`, and glass surface colors.

## Controls (Settings > Appearance — "Surface" section)

- Glass surfaces — switch.
- Glass blur — slider 0–24, disabled when glass is off.
- Transparency — slider 0–100, disabled when glass is off.
- Background blur — slider 0–24, disabled on the default background.

## Out of scope

- Frosting dialogs, dropdowns, and popovers.
- Per-surface granular control (e.g. glass on cards only).
- A separate glass tint/accent color.

## Verification

- `tsc --noEmit`, `eslint`, and `next build` all pass.
- Playwright screenshots: glass off/on over a wallpaper and a gradient, plus background blur; assert the computed `backdrop-filter` on a card.
