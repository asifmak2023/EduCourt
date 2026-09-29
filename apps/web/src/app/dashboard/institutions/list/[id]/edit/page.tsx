"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Institution } from "@/lib/types";

export default function EditInstitutionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Institution>(
    id ? `/v1/institutions/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Institution not found." />;

  return (
    <PermissionGate permission="institution.edit">
      <div className="space-y-6">
        <InstitutionsTabs active="institutions" />
        <MasterForm
          title="Edit institution"
          description={data.name}
          endpoint="/v1/institutions"
          recordId={data.id}
          redirectTo={`/dashboard/institutions/list/${data.id}`}
          initial={{
            name: data.name,
            code: data.code ?? "",
            legal_name: data.legal_name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            website: data.website ?? "",
            address: data.address ?? "",
            is_active: data.is_active ?? true,
          }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            { name: "legal_name", label: "Legal name", type: "text" },
            { name: "email", label: "Email", type: "text" },
            { name: "phone", label: "Phone", type: "text" },
            { name: "website", label: "Website", type: "text" },
            {
              name: "address",
              label: "Address",
              type: "textarea",
              span: 2,
            },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
