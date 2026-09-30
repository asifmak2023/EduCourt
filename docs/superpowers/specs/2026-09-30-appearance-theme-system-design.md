# Appearance and theming system (web + mobile)

Date: 2026-09-30
Status: Approved (design)

## Goal

Give EduCourt a first-class, user-customisable appearance system that is
identical in option set on web and mobile: color mode (system/light/dark),
vibrant accent themes, selectable backgrounds (solid, gradient, Pexels
wallpaper), a dim control for readability, and a subtle animation preference.
The same presets drive both apps from one shared source so the two clients feel
like the same product.

## Context

- `apps/web` is Next.js 16.3.6 / React 19.2.8 / Tailwind v4 with HeroUI v3
  (`@heroui/react` + `@heroui/styles` 3.2.6). It has no theme provider.
- HeroUI's default theme already declares light **and** dark token sets, a
  `[data-vibrant-palette="true"]` hook, and derives `--accent-hover`,
  `--accent-soft`, focus rings, etc. from a single `--accent` variable
  (`node_modules/@heroui/styles/dist/themes/default/variables.css`). Theming can
  therefore be layered entirely with CSS variables - no new web dependencies.
- `apps/web/src/app/globals.css` currently hard-codes `:root { --background:
  #f8fafc; --foreground: #0f172a }` unlayered, which overrides HeroUI's theme
  tokens (unlayered rules beat `@layer base`). This is why the app is always
  light and must be removed for dark mode to work.
- The web sidebar (`apps/web/src/components/AppShell.tsx`) renders flat,
  non-collapsible sections from `apps/web/src/lib/nav.ts`
  (`NAV_SECTIONS`, `visibleSections`, `findNavItem`).
- `apps/web` has no animation library (no framer-motion); animations will be
  pure CSS.
- `apps/mobile` is minimal: a single `App.tsx` (login form + static dashboard
  summary), no navigation library, no theme layer, no AsyncStorage. It does not
  use Expo Router. `index.ts` registers `App` via `registerRootComponent`.
- `pnpm-workspace.yaml` lists `apps/web` and `apps/mobile`. There is no
  `packages/` directory yet.

## Decisions

1. **One shared presets package.** Add `packages/appearance`: a
   framework-agnostic TypeScript data module (no runtime dependencies) that both
   apps import. This is the single source of truth for modes, accents,
   backgrounds, gradients, wallpapers, defaults and the storage key.
2. **CSS-variable theming on web.** An `AppearanceProvider` writes
   `data-theme`, `data-accent`, `data-background` and `data-vibrant-palette`
   onto `<html>`. CSS preset blocks re-map HeroUI's existing tokens, so all
   ~320 pages restyle without per-page edits.
3. **Cross-platform color values.** Accents and backgrounds are defined as
   **hex** strings in the shared package, because React Native does not support
   `oklch()`. Web sets these hex values on `--accent` and lets HeroUI's
   `color-mix` derive the rest; mobile derives its own soft/foreground tokens.
4. **Per-browser / per-device persistence.** Web uses `localStorage`; mobile
   uses AsyncStorage, both under the shared key `APPEARANCE_STORAGE_KEY`.
   No backend, migration or API change.
5. **Backgrounds are a fixed layer, cards stay opaque.** A full-screen layer
   sits behind the layout; cards, tables, forms and modals keep opaque surface
   backgrounds so data stays readable. A user-controlled dim overlay (0-80%)
   sits above the wallpaper and below content.
6. **Accordion sidebar.** Category groups collapse; one group open at a time;
   the group containing the current route opens on load and the open group is
   remembered.
7. **Animations are subtle and optional.** Transitions are short (150-220ms)
   and can be disabled by the user; `prefers-reduced-motion` (web) and
   `AccessibilityInfo.isReduceMotionEnabled` (mobile) always override the
   preference.
8. **Mobile appearance parity only.** Mobile gets the same appearance options
   and tokens, but its current shell is not rebuilt into a full navigation app.
   Its appearance controls live behind a button on the dashboard that opens a
   modal.

## Shared package: `packages/appearance`

Layout:

```
packages/appearance/
  package.json        # name "@eis/appearance"; main/exports -> src/index.ts; no deps
  tsconfig.json
  src/index.ts        # re-exports + types + DEFAULT_APPEARANCE + STORAGE key
  src/types.ts
  src/accents.ts
  src/backgrounds.ts
  src/wallpapers.ts
```

Types (indicative):

```ts
export type ColorMode = "system" | "light" | "dark";

export interface AccentPreset {
  id: string;              // "indigo" | "violet" | ...
  label: string;           // "Indigo"
  accent: string;          // hex, e.g. "#6366f1"
  accentForeground: string;// hex, readable on accent
}

export interface SolidBackground {
  id: string; label: string;
  light: string; dark: string; // hex
}

export interface GradientBackground {
  id: string; label: string;
  colors: string[];        // hex stops
  light: string[]; dark: string[]; // per-mode stops
}

export interface WallpaperPreset {
  id: string; label: string; category: string;
  thumbUrl: string; fullUrl: string;   // Pexels image URLs
  photographer: string; attributionUrl: string; // Pexels photo page
}

export interface AppearanceConfig {
  mode: ColorMode;
  accentId: string;
  vibrant: boolean;
  backgroundId: string;   // "default" | solid/gradient/wallpaper id
  wallpaperDim: number;   // 0-80
  animations: boolean;
}
```

Contents:

- `ACCENTS`: 8 vibrant presets - indigo (default), violet, fuchsia, rose,
  amber, emerald, teal, sky. `accentForeground` is chosen per accent for
  contrast (dark for amber, white otherwise).
- `SOLIDS`: 6 backgrounds - default, slate, sand, mint, sky, lavender, each
  with light and dark hex values.
- `GRADIENTS`: 4 - aurora, ocean, sunset, forest.
- `WALLPAPERS`: 12 curated Pexels photos across categories (nature, abstract,
  study, minimal, space, architecture). Each entry stores the real Pexels
  thumbnail and full-size URLs plus photographer and photo-page attribution;
  the project shows a "Photos provided by Pexels" credit.
- `DEFAULT_APPEARANCE`: `{ mode: "system", accentId: "indigo", vibrant: true,
  backgroundId: "default", wallpaperDim: 0, animations: true }`.
- `APPEARANCE_STORAGE_KEY = "eis.appearance"`.
- Helpers to look up a preset by id and to classify a background id
  (`solid | gradient | wallpaper | default`).

## Web implementation

### Theme engine

- `apps/web/src/lib/appearance.tsx`: `AppearanceProvider` + `useAppearance()`.
  On mount it reads `localStorage[APPEARANCE_STORAGE_KEY]`, merges with
  `DEFAULT_APPEARANCE`, and applies attributes to `document.documentElement`:
  - `data-theme="light|dark"` (resolving `system` via
    `matchMedia("(prefers-color-scheme: dark)")`, with a change listener)
  - `data-accent="<accentId>"`
  - `data-vibrant-palette="true|false"`
  - `data-background="<backgroundId>"`
  - `data-animations="true|false"`
  - inline CSS custom properties for the active background colors and
    `--wallpaper-dim`.
- Writes back to `localStorage` on every change.
- Wraps the tree in `apps/web/src/app/layout.tsx`.
- A small inline `<script>` in the `<head>` applies the stored attributes before
  first paint to avoid a flash of the wrong theme (reads the same key).
- Remove the unlayered `:root { --background; --foreground }` from
  `globals.css`; keep the `@theme inline` mapping so `bg-background` etc. follow
  HeroUI tokens.

### Preset CSS

- `globals.css` gains `[data-accent="<id>"] { --accent: <hex>;
  --accent-foreground: <hex>; }` blocks (values from `ACCENTS`).
- A `#app-background` fixed, `inset-0`, `-z-10` layer renders the selected
  solid, gradient or wallpaper (`background-size: cover`, `center`) plus a dim
  overlay whose opacity is `--wallpaper-dim`. Body/layout chrome becomes
  translucent over it while cards/panels stay opaque `bg-surface`.
- Nav/table/card hover styles move to shared utility classes
  (`.hover-lift`, nav item hover using `accent-soft`) in `globals.css`.

### Settings > Appearance

- Add an **Appearance** tab to the Settings page (`SettingsTabs.tsx`) built from
  existing HeroUI components:
  - Color mode: segmented control (System / Light / Dark).
  - Accent: swatch grid (HeroUI `color-swatch-picker` or buttons) + a "Vibrant
    palette" toggle (`Switch`).
  - Background: family tabs (Solid / Gradient / Wallpaper) with thumbnail
    grids; wallpaper thumbs lazy-loaded.
  - Wallpaper dim: `Slider` (0-80).
  - Animations: `Switch`.
  - Reset to defaults button.
- All controls read/write `useAppearance()`.

### Collapsible sidebar

- Refactor the nav in `AppShell.tsx` so each section is a header button
  (`aria-expanded`, rotating chevron) toggling its item list.
- Accordion behavior: opening one group closes the others.
- On load, open the group returned by a new
  `sectionForPath(pathname)` helper (added to `lib/nav.ts`); remember the open
  group label in `localStorage`.
- Expand/collapse animates with the CSS `grid-template-rows: 0fr -> 1fr`
  technique for a smooth, accessible height transition; respects the animation
  preference and reduced-motion. Permission filtering and the "Soon" badge are
  preserved.

### Animation polish

- Shared transition utilities (hover lift + shadow on cards, nav/row tint) and a
  subtle fade/slide-in wrapper in `AppShell`'s `<main>` keyed by pathname.
- `@media (prefers-reduced-motion: reduce)` and `[data-animations="false"]`
  disable non-essential transitions.
- Kept restrained (short durations, transform/opacity only) to avoid table
  performance issues.

## Mobile implementation

- Install with `npx expo install expo-linear-gradient
  @react-native-async-storage/async-storage`.
- `apps/mobile/metro.config.js`: monorepo config (`watchFolders` to the repo
  root, `nodeModulesPaths` for the app and root) so `@eis/appearance` resolves.
- `apps/mobile/src/theme/ThemeProvider.tsx`: `ThemeProvider` + `useTheme()`.
  Reads the shared config, resolves `system` with RN `useColorScheme()`,
  persists to AsyncStorage, and exposes tokens
  (`background`, `surface`, `surfaceSecondary`, `foreground`, `muted`,
  `border`, `accent`, `accentSoft`, `accentForeground`) derived from mode +
  accent, mirroring the web token names.
- `apps/mobile/src/theme/AppBackground.tsx`: renders the solid, `LinearGradient`
  or `ImageBackground` (Pexels `fullUrl`) with a dim overlay `View`.
- `apps/mobile/src/screens/AppearanceSheet.tsx`: a `Modal` with the same
  controls as web (mode segmented control, accent swatches, background family
  tabs, dim slider, animations switch, reset).
- Apply tokens to `App.tsx` (login + dashboard), replacing the hard-coded
  `#f8fafc` / `#0f172a` values, and add a palette button on the dashboard header
  that opens the appearance modal.
- Subtle motion with RN `Animated` (fade/slide on mount, press feedback),
  gated by the animations preference and `AccessibilityInfo`.
- `app.json`: set `userInterfaceStyle` to `automatic`; apply any other config
  required by Expo SDK 57 for the added modules, per the versioned Expo docs.

## Parity rule

- Both apps import `ACCENTS`, `SOLIDS`, `GRADIENTS`, `WALLPAPERS`,
  `DEFAULT_APPEARANCE` and `APPEARANCE_STORAGE_KEY` from `@eis/appearance`.
- Adding or changing a preset in the shared package updates both apps with no
  other code change.
- Pixel-for-pixel equality is not a goal; the same option set, names and color
  values are.

## Verification

- Web: `pnpm exec tsc --noEmit`, `pnpm exec eslint src`; Playwright screenshots
  across light/dark × several accents × solid/gradient/wallpaper backgrounds at
  1024/1440/1920, checking readable contrast and no console warnings; confirm
  sidebar accordion active-group default and persistence.
- Mobile: `npx tsc --noEmit`; attempt an Expo web bundle/export smoke test. The
  mobile dev server cannot be visually driven the same way as web in this
  environment; that limitation is recorded rather than worked around.
- No API tests are affected (no backend change).

## Risks

- **Workspace TS in Next/Turbopack**: importing `@eis/appearance` requires
  `transpilePackages: ["@eis/appearance"]` in `next.config`; verify the dev
  server resolves it.
- **Expo/Metro monorepo resolution**: symlinked workspace packages can fail to
  resolve without a `metro.config.js` `watchFolders`/`nodeModulesPaths` setup.
- **Contrast on wallpapers**: busy photos can hurt legibility; mitigated by the
  dim overlay and opaque cards. Default dim may be tuned.
- **RN color support**: `oklch` is unsupported, hence hex everywhere; soft
  variants are derived by alpha blending on mobile.
- **Remote images in RN**: Pexels URLs must be reachable; loading states and
  failures fall back to the solid background.

## Out of scope

- Full mobile navigation/feature parity (Expo Router, drawer/tabs, module
  screens). Only appearance parity is in scope this round.
- Per-user server-side persistence of appearance.
- Backend/API changes, i18n, RTL, custom user-uploaded wallpapers.
