"use client";

import { useAuth } from "@/lib/auth";
import { useInstitutions } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
import { Badge } from "@/components/ui";
import type { Campus } from "@/lib/types";

export default function CampusesPage() {
  const { can } = useAuth();
  const { items: institutions } = useInstitutions();

  return (
    <div className="space-y-6">
      <InstitutionsTabs active="campuses" />
      <MasterList<Campus>
        title="Campuses"
        description="Each campus is an isolated tenant boundary."
        endpoint="/v1/campuses"
        searchPlaceholder="Search name or code"
        createHref={
          can("campus.create") ? "/dashboard/institutions/campuses/new" : undefined
        }
        createLabel="New campus"
        editHref={(campus) => `/dashboard/institutions/campuses/${campus.id}`}
        filters={[
          {
            param: "institution_id",
            placeholder: "Institution",
            options: institutions.map((institution) => ({
              value: String(institution.id),
              label: institution.name,
            })),
          },
        ]}
        columns={[
          { header: "Campus", render: (campus) => campus.name },
          { header: "Code", render: (campus) => campus.code ?? "-" },
          { header: "Type", render: (campus) => campus.type ?? "-" },
          {
            header: "Institution",
            render: (campus) => campus.institution?.name ?? "-",
          },
          {
            header: "Status",
            render: (campus) => (
              <Badge value={campus.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
