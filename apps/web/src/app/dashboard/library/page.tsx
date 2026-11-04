"use client";

import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";
import { Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { LibrarySummary } from "@/lib/types";

export default function LibraryPage() {
  return (
    <PermissionGate permission="library.view">
      <LibraryHome />
    </PermissionGate>
  );
}

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/library/books",
    title: "Books",
    description: "Catalogue titles, copies, shelves and availability.",
    icon: "book",
  },
  {
    href: "/dashboard/library/issues",
    title: "Issue and return",
    description: "Lend copies to students or staff and record returns.",
    icon: "history",
  },
  {
    href: "/dashboard/library/report",
    title: "Summary report",
    description: "Catalogue size, circulation, overdue and fines.",
    icon: "chart",
  },
];

function LibraryHome() {
  const { can } = useAuth();
  const { data, loading } = useResource<LibrarySummary>(
    can("library.export") ? "/v1/library/reports/summary" : null
  );

  return (
    <ModuleHub
      title="Library"
      description="Catalogue, circulation and fines."
      sections={SECTIONS}
      stats={
        loading ? (
          <Spinner />
        ) : data ? (
          <>
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
          </>
        ) : null
      }
    />
  );
}
