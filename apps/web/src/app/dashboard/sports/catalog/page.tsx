"use client";

import { SportsTabs } from "@/components/SportsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { SPORT_CATEGORY_OPTIONS } from "@/lib/sportsOptions";
import type { Sport } from "@/lib/types";

export default function SportsCatalogPage() {
  return (
    <div className="space-y-6">
      <SportsTabs active="catalog" />
      <MasterList<Sport>
        title="Sports"
        description="The catalogue of sports offered on campus."
        endpoint="/v1/sports"
        searchable={false}
        createHref="/dashboard/sports/catalog/new"
        createPermission="sports.create"
        createLabel="New sport"
        editHref={(sport) => `/dashboard/sports/catalog/${sport.id}/edit`}
        filters={[
          {
            param: "category",
            placeholder: "All categories",
            options: SPORT_CATEGORY_OPTIONS,
          },
          {
            param: "is_active",
            placeholder: "All states",
            options: [
              { value: "1", label: "Active" },
              { value: "0", label: "Inactive" },
            ],
          },
        ]}
        columns={[
          { header: "Sport", render: (sport) => sport.name },
          { header: "Code", render: (sport) => sport.code },
          { header: "Category", render: (sport) => sport.category ?? "-" },
          { header: "Season", render: (sport) => sport.season ?? "-" },
          {
            header: "Coach",
            render: (sport) => sport.coach?.name ?? "-",
          },
          {
            header: "Teams",
            align: "right",
            render: (sport) => sport.teams_count ?? 0,
          },
          {
            header: "Status",
            render: (sport) => (
              <Badge value={sport.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
