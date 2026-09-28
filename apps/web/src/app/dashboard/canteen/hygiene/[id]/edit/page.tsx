"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import { HYGIENE_STATUS_OPTIONS } from "@/lib/canteenOptions";
import type { CanteenHygieneCheck } from "@/lib/types";

export default function EditCanteenHygieneCheckPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<CanteenHygieneCheck>(
    id ? `/v1/canteen/hygiene-checks/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Hygiene check not found." />;

  return (
    <PermissionGate permission="canteen.edit">
      <div className="space-y-6">
        <CanteenTabs active="hygiene" />
        <MasterForm
          title="Edit hygiene check"
          description={data.area}
          endpoint="/v1/canteen/hygiene-checks"
          recordId={data.id}
          redirectTo="/dashboard/canteen/hygiene"
          initial={{
            area: data.area,
            check_date: data.check_date ?? "",
            status: data.status ?? "",
            score: data.score !== null && data.score !== undefined
              ? String(data.score)
              : "",
            remarks: data.remarks ?? "",
          }}
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
