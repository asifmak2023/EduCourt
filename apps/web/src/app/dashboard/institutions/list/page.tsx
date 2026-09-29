"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
import { Badge } from "@/components/ui";
import type { Institution } from "@/lib/types";

export default function InstitutionsListPage() {
  const { can } = useAuth();

  return (
    <div className="space-y-6">
      <InstitutionsTabs active="institutions" />
      <MasterList<Institution>
        title="Institutions"
        description="Grouping level above campuses, used as a role guardrail."
        endpoint="/v1/institutions"
        searchPlaceholder="Search name or code"
        createHref={
          can("institution.create")
            ? "/dashboard/institutions/list/new"
            : undefined
        }
        createLabel="New institution"
        editHref={(institution) =>
          `/dashboard/institutions/list/${institution.id}`
        }
        columns={[
          { header: "Name", render: (institution) => institution.name },
          { header: "Code", render: (institution) => institution.code ?? "-" },
          {
            header: "Legal name",
            render: (institution) => institution.legal_name ?? "-",
          },
          {
            header: "Email",
            render: (institution) => institution.email ?? "-",
          },
          {
            header: "Campuses",
            align: "right",
            render: (institution) => institution.campuses_count ?? 0,
          },
          {
            header: "Status",
            render: (institution) => (
              <Badge value={institution.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
