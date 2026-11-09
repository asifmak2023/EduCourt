import type { ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export { cx };

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-[var(--radius-xl2)] border bg-panel shadow-[var(--shadow-soft)]",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  success: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
  warning: "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[color-mix(in_srgb,var(--warning)_80%,#000)]",
  danger: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
  brand: "bg-brand-soft text-brand",
  muted: "bg-panel-muted text-muted",
};

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES | string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone] ?? TONES.muted,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const ring: Record<string, string> = {
    brand: "text-brand bg-brand-soft",
    success: "text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_14%,transparent)]",
    warning: "text-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]",
    danger: "text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]",
  };

  return (
    <div className="rounded-3xl border bg-panel p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
        {icon ? (
          <span
            className={cx(
              "grid h-8 w-8 place-items-center rounded-xl",
              ring[tone]
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="numeric mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
        {value}
      </div>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-panel-muted/40 px-6 py-12 text-center">
      {icon ? (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          {icon}
        </span>
      ) : null}
      <p className="font-semibold text-foreground">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-sm text-muted">{message}</p> : null}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
      {message}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-2xl", className)} />;
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--panel-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        {label ?? (
          <span className="numeric font-[family-name:var(--font-display)] text-xl font-bold">
            {Math.round(clamped)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  tone = "brand",
}: {
  value: number;
  max?: number;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color: Record<string, string> = {
    brand: "var(--brand)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
  };

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-panel-muted">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${pct}%`, background: color[tone] }}
      />
    </div>
  );
}
