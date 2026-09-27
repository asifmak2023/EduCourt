import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "text-slate-900",
    positive: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-rose-600",
  };

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}

const BADGE_TONES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  enrolled: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  partial: "bg-amber-50 text-amber-700 ring-amber-200",
  unpaid: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  applied: "bg-sky-50 text-sky-700 ring-sky-200",
  enquiry: "bg-slate-100 text-slate-600 ring-slate-200",
  under_review: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  void: "bg-slate-100 text-slate-500 ring-slate-200",
  default: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ value }: { value: string | null | undefined }) {
  const key = (value ?? "default").toLowerCase();
  const tone = BADGE_TONES[key] ?? BADGE_TONES.default;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${tone}`}
    >
      {(value ?? "-").replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-600">Nothing here yet</p>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
}
