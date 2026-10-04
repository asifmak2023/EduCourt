import { findNavItem } from "./nav";
import { ROUTE_PATHS } from "./route-paths";

const ROUTE_SET = new Set(ROUTE_PATHS);

const ACRONYMS = new Set([
  "hr",
  "sso",
  "gpa",
  "id",
  "it",
  "ui",
  "api",
  "pdf",
  "csv",
]);

const SEGMENT_LABELS: Record<string, string> = {
  "academic-years": "Academic Years",
  "class-subjects": "Class Subjects",
  "teaching-assignments": "Teaching Assignments",
  "term-gpa": "Term GPA",
  "sso-providers": "SSO Providers",
  "expense-categories": "Expense Categories",
  "expense-payments": "Expense Payments",
  "trial-balance": "Trial Balance",
  "stock-entries": "Stock Entries",
  "grade-scales": "Grade Scales",
  "result-card": "Result Card",
  "student-affairs": "Student Affairs",
};

export interface Breadcrumb {
  label: string;
  href: string;
  isCurrent: boolean;
}

type Translate = (value: string | undefined | null) => string;

function humanizeSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) =>
      ACRONYMS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function isDynamicSegment(segment: string): boolean {
  return (
    /^\d+$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(segment)
  );
}

function normalizeDynamic(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => (isDynamicSegment(segment) ? "_" : segment))
    .join("/");
}

/** A crumb should be clickable only when it maps to a page that actually exists. */
export function isRoutable(href: string): boolean {
  return ROUTE_SET.has(href) || ROUTE_SET.has(normalizeDynamic(href));
}

/** Build the breadcrumb trail for the dashboard shell from the current path. */
export function buildBreadcrumbs(
  pathname: string,
  tr: Translate
): Breadcrumb[] {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const parts = clean.split("/").filter(Boolean);

  if (parts[0] !== "dashboard") {
    return [];
  }

  const crumbs: Breadcrumb[] = [];
  let href = "";

  for (let index = 0; index < parts.length; index += 1) {
    const segment = parts[index];
    href += `/${segment}`;

    let label: string;

    if (index === 0) {
      label = tr("navigation.dashboard");
    } else {
      const navItem = findNavItem(href);

      if (navItem) {
        label = tr(navItem.label);
      } else if (segment === "new") {
        label = tr("common.new");
      } else if (segment === "edit") {
        label = tr("common.edit");
      } else if (isDynamicSegment(segment)) {
        label = tr("common.details");
      } else if (SEGMENT_LABELS[segment]) {
        label = tr(SEGMENT_LABELS[segment]);
      } else {
        label = tr(humanizeSegment(segment));
      }
    }

    crumbs.push({
      label,
      href,
      isCurrent: index === parts.length - 1,
    });
  }

  return crumbs;
}
