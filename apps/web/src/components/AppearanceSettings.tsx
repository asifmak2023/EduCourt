"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Slider, Switch } from "@heroui/react";
import {
  ACCENTS,
  GRADIENTS,
  SOLIDS,
  WALLPAPERS,
  type BackgroundKind,
  type ColorMode,
} from "@eis/appearance";
import { useAppearance } from "@/lib/appearance";
import { Button } from "@/components/Form";
import { Icon } from "@/components/Icons";
import { Card } from "@/components/ui";

const MODES: { value: ColorMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const FAMILIES: { value: BackgroundKind; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient" },
  { value: "wallpaper", label: "Wallpaper" },
];

function familyOf(backgroundId: string): BackgroundKind {
  if (SOLIDS.some((solid) => solid.id === backgroundId)) return "solid";
  if (GRADIENTS.some((gradient) => gradient.id === backgroundId)) return "gradient";
  if (WALLPAPERS.some((wallpaper) => wallpaper.id === backgroundId)) {
    return "wallpaper";
  }
  return "default";
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex w-fit max-w-full flex-wrap rounded-lg border border-border bg-surface-secondary p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              selected
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Swatch({
  selected,
  label,
  onSelect,
  style,
  caption,
  children,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
  style?: CSSProperties;
  caption?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition ${
        selected
          ? "border-accent ring-2 ring-accent"
          : "border-border hover:border-accent"
      }`}
    >
      <span
        className="block h-14 w-full bg-surface-secondary"
        style={style}
        aria-hidden="true"
      >
        {children}
      </span>
      {caption ? (
        <span className="truncate px-2 py-1.5 text-xs text-muted">
          {caption}
        </span>
      ) : null}
      {selected ? (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon name="check" className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <Switch isSelected={checked} onChange={onChange}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <span className="sr-only">{label}</span>
        </Switch.Content>
      </Switch>
    </div>
  );
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
        <span className="text-xs text-muted">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <Slider
        aria-label={label}
        minValue={min}
        maxValue={max}
        step={step}
        isDisabled={disabled}
        value={value}
        onChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
        className="mt-2"
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  );
}

export function AppearanceSettings() {
  const {
    config,
    resolvedMode,
    setMode,
    setAccent,
    setVibrant,
    setBackground,
    setWallpaperDim,
    setAnimations,
    setGlass,
    setGlassBlur,
    setGlassTransparency,
    setBackgroundBlur,
    reset,
  } = useAppearance();

  const activeFamily = familyOf(config.backgroundId);
  const [family, setFamily] = useState<BackgroundKind>(activeFamily);
  const isDark = resolvedMode === "dark";

  const selectFamily = (next: BackgroundKind) => {
    setFamily(next);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        title="Color mode"
        description="Choose a fixed theme or follow your operating system."
      >
        <Segmented
          label="Color mode"
          options={MODES}
          value={config.mode}
          onChange={setMode}
        />
      </Section>

      <Section
        title="Accent color"
        description="Used for buttons, links, highlights and focus rings."
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              aria-pressed={config.accentId === accent.id}
              aria-label={accent.label}
              title={accent.label}
              onClick={() => setAccent(accent.id)}
              className={`relative flex h-10 items-center justify-center rounded-lg transition ${
                config.accentId === accent.id
                  ? "ring-2 ring-offset-2 ring-offset-surface"
                  : "hover:opacity-90"
              }`}
              style={{
                backgroundColor: accent.accent,
                color: accent.accentForeground,
                ...(config.accentId === accent.id
                  ? ({ "--tw-ring-color": accent.accent } as CSSProperties)
                  : {}),
              }}
            >
              {config.accentId === accent.id ? (
                <Icon name="check" className="h-4 w-4" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <ToggleRow
            label="Vibrant palette"
            hint="Use richer accent-tinted surfaces throughout the app."
            checked={config.vibrant}
            onChange={setVibrant}
          />
        </div>
      </Section>

      <Section
        title="Background"
        description="Applies behind cards and content. Cards stay readable."
      >
        <Segmented
          label="Background family"
          options={FAMILIES}
          value={family}
          onChange={selectFamily}
        />

        <div className="mt-4">
          {family === "default" ? (
            <button
              type="button"
              aria-pressed={config.backgroundId === "default"}
              onClick={() => setBackground("default")}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                config.backgroundId === "default"
                  ? "border-accent ring-2 ring-accent"
                  : "border-border hover:border-accent"
              }`}
            >
              Default surface background
            </button>
          ) : null}

          {family === "solid" ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {SOLIDS.map((solid) => (
                <Swatch
                  key={solid.id}
                  selected={config.backgroundId === solid.id}
                  label={solid.label}
                  caption={solid.label}
                  onSelect={() => setBackground(solid.id)}
                  style={{ backgroundColor: isDark ? solid.dark : solid.light }}
                />
              ))}
            </div>
          ) : null}

          {family === "gradient" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GRADIENTS.map((gradient) => (
                <Swatch
                  key={gradient.id}
                  selected={config.backgroundId === gradient.id}
                  label={gradient.label}
                  caption={gradient.label}
                  onSelect={() => setBackground(gradient.id)}
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${(
                      isDark ? gradient.dark : gradient.light
                    ).join(", ")})`,
                  }}
                />
              ))}
            </div>
          ) : null}

          {family === "wallpaper" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {WALLPAPERS.map((wallpaper) => (
                <Swatch
                  key={wallpaper.id}
                  selected={config.backgroundId === wallpaper.id}
                  label={wallpaper.label}
                  caption={wallpaper.label}
                  onSelect={() => setBackground(wallpaper.id)}
                  style={{
                    backgroundImage: `url("${wallpaper.thumbUrl}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {family === "wallpaper" ? (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Wallpaper dimming
              </p>
              <span className="text-xs text-muted">
                {config.wallpaperDim}%
              </span>
            </div>
            <Slider
              aria-label="Wallpaper dimming"
              minValue={0}
              maxValue={80}
              step={5}
              value={config.wallpaperDim}
              onChange={(value) =>
                setWallpaperDim(Array.isArray(value) ? value[0] : value)
              }
              className="mt-2"
            >
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </div>
        ) : null}
      </Section>

      <Section
        title="Surface"
        description="Glassmorphism for cards, the top bar, and the sidebar."
      >
        <ToggleRow
          label="Glass surfaces"
          hint="Frost cards, the top bar, and the sidebar."
          checked={config.glass}
          onChange={setGlass}
        />
        <div className="mt-5 space-y-5">
          <SliderRow
            label="Glass blur"
            hint="Strength of the frosted blur."
            value={config.glassBlur}
            min={0}
            max={24}
            step={2}
            suffix="px"
            disabled={!config.glass}
            onChange={setGlassBlur}
          />
          <SliderRow
            label="Transparency"
            hint="How see-through the glass surfaces are."
            value={config.glassTransparency}
            min={0}
            max={100}
            step={5}
            suffix="%"
            disabled={!config.glass}
            onChange={setGlassTransparency}
          />
          <SliderRow
            label="Background blur"
            hint="Blurs the wallpaper or gradient behind the dashboard."
            value={config.backgroundBlur}
            min={0}
            max={24}
            step={2}
            suffix="px"
            disabled={activeFamily === "default"}
            onChange={setBackgroundBlur}
          />
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-border-secondary pt-4">
          <p className="text-xs text-muted">
            Recommended: glass blur 12px, transparency 15%, background blur 0px.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setGlass(true);
              setGlassBlur(12);
              setGlassTransparency(15);
              setBackgroundBlur(0);
            }}
          >
            Recommended
          </Button>
        </div>
      </Section>

      <Section
        title="Motion"
        description="Subtle transitions for page and dialog entry."
      >
        <ToggleRow
          label="Interface animations"
          hint="Disabled when your system requests reduced motion."
          checked={config.animations}
          onChange={setAnimations}
        />
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={reset}>
            Reset to defaults
          </Button>
        </div>
      </Section>
    </div>
  );
}
