"use client";

import type { ReactNode } from "react";
import {
  Alert,
  Card as HeroCard,
  Chip,
  EmptyState as HeroEmptyState,
  Spinner as HeroSpinner,
} from "@heroui/react";
import { useTranslation } from "@eis/i18n";
import { useTr } from "@/lib/i18n";

export function Card({
  children,
  className = "",
  hoverable = true,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <HeroCard
      className={`gap-0 p-0 ${hoverable ? "surface-card" : ""} ${className}`}
    >
      {children}
    </HeroCard>
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
    default: "text-foreground",
    positive: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };
  const tr = useTr();

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {tr(label)}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{tr(hint)}</p> : null}
    </Card>
  );
}

type BadgeColor = "success" | "warning" | "danger" | "accent" | "default";

const BADGE_COLORS: Record<string, BadgeColor> = {
  active: "success",
  paid: "success",
  approved: "success",
  enrolled: "success",
  posted: "success",
  partial: "warning",
  unpaid: "danger",
  pending: "warning",
  draft: "warning",
  reversed: "default",
  inactive: "default",
  applied: "accent",
  enquiry: "default",
  under_review: "accent",
  rejected: "danger",
  void: "default",
  failed: "danger",
  sent: "success",
  cancelled: "default",
  passed: "success",
  pass: "success",
  fail: "danger",
  present: "success",
  absent: "danger",
  late: "warning",
  leave: "accent",
  excused: "default",
  default: "default",
};

export function Badge({ value }: { value: string | null | undefined }) {
  const key = (value ?? "default").toLowerCase();
  const color = BADGE_COLORS[key] ?? BADGE_COLORS.default;

  return (
    <Chip color={color} size="sm" variant="soft" className="capitalize">
      {(value ?? "-").replace(/_/g, " ")}
    </Chip>
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
  const tr = useTr();

  return (
    <div className="page-header flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {tr(title)}
        </h1>
        {description ? (
          <p className="mt-1 text-md">{tr(description)}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  const { t } = useTranslation();
  const tr = useTr();

  return (
    <HeroEmptyState className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="text-sm font-medium text-foreground">{t("common.nothingHere")}</p>
      <p className="text-sm text-muted">{tr(message)}</p>
    </HeroEmptyState>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  const tr = useTr();

  return (
    <div className="flex items-center justify-center gap-3 py-14 text-sm text-muted">
      <HeroSpinner size="md" />
      {label ? tr(label) : t("common.loading")}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  const tr = useTr();

  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{tr(message)}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}

export function SuccessNotice({ message }: { message: string }) {
  const tr = useTr();

  return (
    <Alert status="success">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{tr(message)}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}

export function DataList({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </dl>
  );
}

export function DataItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  const tr = useTr();

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {tr(label)}
      </dt>
      <dd className="mt-1 break-words text-sm text-foreground">
        {value ?? "-"}
      </dd>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const tr = useTr();

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{tr(title)}</h2>
          {description ? (
            <p className="mt-0.5 text-s text-muted">{tr(description)}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="px-6 py-5">{children}</div>
    </Card>
  );
}
