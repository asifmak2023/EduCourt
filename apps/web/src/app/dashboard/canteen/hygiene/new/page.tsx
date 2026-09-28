"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { HYGIENE_STATUS_OPTIONS } from "@/lib/canteenOptions";

export default function NewCanteenHygieneCheckPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <PermissionGate permission="canteen.create">
      <div className="space-y-6">
        <CanteenTabs active="hygiene" />
        <MasterForm
          title="New hygiene check"
          description="Record an inspection of the canteen."
          endpoint="/v1/canteen/hygiene-checks"
          redirectTo="/dashboard/canteen/hygiene"
          initial={{ check_date: today, status: "pass" }}
          fields={[
            { name: "area", label: "Area", type: "text", required: true },
            {
              name: "check_date",
              label: "Check date",
              type: "date",
              required: true,
            },
            {
              name: "status",
              label: "Status",
              type: "select",
              required: true,
              options: HYGIENE_STATUS_OPTIONS,
            },
            {
              name: "score",
              label: "Score",
              type: "number",
              min: "0",
              step: "1",
            },
            { name: "remarks", label: "Remarks", type: "text", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
