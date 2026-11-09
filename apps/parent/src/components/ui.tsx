import type { ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export { cx };

/** Page masthead: small eyebrow line + oversized Khand title. */
export function PageTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-none tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
      </div>
      {right}
    </div>
  );
}

/** Paper card: warm off-white surface with a faint hairline. */
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
        "rounded-lg border border-hairline bg-card shadow-[0_1px_0_rgba(0,0,0,0.02),0_18px_40px_-30px_rgba(20,40,30,0.35)]",
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
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-none text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  success:
    "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
  warning:
    "bg-[color-mix(in_srgb,var(--marigold)_22%,transparent)] text-[var(--marigold-ink)]",
  danger:
    "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
  brand: "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-primary",
  muted: "bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] text-muted",
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-card/40 px-6 py-12 text-center">
      {icon ? (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
          {icon}
        </span>
      ) : null}
      <p className="font-semibold text-foreground">{title}</p>
      {message ? (
        <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      ) : null}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
      {message}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-lg", className)} />;
}
