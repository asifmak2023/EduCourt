"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader, Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { LibrarySummary } from "@/lib/types";

export default function LibraryPage() {
  return (
    <PermissionGate permission="library.view">
      <LibraryHome />
    </PermissionGate>
  );
}

const SECTIONS = [
  {
    href: "/dashboard/library/books",
    title: "Books",
    description: "Catalogue titles, copies, shelves and availability.",
  },
  {
    href: "/dashboard/library/issues",
    title: "Issue and return",
    description: "Lend copies to students or staff and record returns.",
  },
  {
    href: "/dashboard/library/report",
    title: "Summary report",
    description: "Catalogue size, circulation, overdue and fines.",
  },
];

function LibraryHome() {
  const { can } = useAuth();
  const { data, loading } = useResource<LibrarySummary>(
    can("library.export") ? "/v1/library/reports/summary" : null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Catalogue, circulation and fines."
      />

      {loading ? (
        <Spinner />
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Titles" value={formatNumber(data.titles)} />
          <StatCard
            label="Copies"
            value={formatNumber(data.copies)}
            hint={`${formatNumber(data.available)} available`}
          />
          <StatCard
            label="On loan"
            value={formatNumber(data.issued)}
            tone={data.issued > 0 ? "default" : "positive"}
          />
          <StatCard
            label="Overdue"
            value={formatNumber(data.overdue)}
            tone={data.overdue > 0 ? "danger" : "positive"}
          />
          <StatCard label="Lost" value={formatNumber(data.lost)} />
          <StatCard
            label="Fines collected"
            value={formatCurrency(data.fines_collected)}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full p-5 transition hover:border-slate-400">
              <p className="text-sm font-semibold text-slate-900">
                {section.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {section.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
