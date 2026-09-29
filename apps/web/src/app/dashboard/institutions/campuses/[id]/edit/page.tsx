"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Campus } from "@/lib/types";

const CAMPUS_TYPE_OPTIONS = [
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
];

export default function EditCampusPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Campus>(
    id ? `/v1/campuses/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Campus not found." />;

  return (
    <PermissionGate permission="campus.edit">
      <div className="space-y-6">
        <InstitutionsTabs active="campuses" />
        <MasterForm
          title="Edit campus"
          description={data.name}
          endpoint="/v1/campuses"
          recordId={data.id}
          redirectTo={`/dashboard/institutions/campuses/${data.id}`}
          initial={{
            name: data.name,
            code: data.code ?? "",
            type: data.type ?? "school",
            email: data.email ?? "",
            phone: data.phone ?? "",
            whatsapp: data.whatsapp ?? "",
            website: data.website ?? "",
            address: data.address ?? "",
            is_active: data.is_active ?? true,
          }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            {
              name: "type",
              label: "Type",
              type: "select",
              required: true,
              options: CAMPUS_TYPE_OPTIONS,
            },
            { name: "email", label: "Email", type: "text" },
            { name: "phone", label: "Phone", type: "text" },
            { name: "whatsapp", label: "WhatsApp", type: "text" },
            { name: "website", label: "Website", type: "text" },
            { name: "address", label: "Address", type: "textarea", span: 2 },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
