"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useUsers } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { StudentClub } from "@/lib/types";

export default function EditClubPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<StudentClub>(
    id ? `/v1/student-affairs/clubs/${id}` : null
  );
  const { items: users } = useUsers();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Club not found." />;

  const stringValue = (value: string | number | null) =>
    value === null || value === undefined ? "" : String(value);

  return (
    <PermissionGate permission="student_affairs.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="clubs" />
        <MasterForm
          title="Edit club"
          description={data.name}
          endpoint="/v1/student-affairs/clubs"
          recordId={data.id}
          redirectTo="/dashboard/student-affairs/clubs"
          initial={{
            name: data.name,
            code: data.code,
            category: data.category ?? "",
            patron_user_id: stringValue(data.patron_user_id),
            description: data.description ?? "",
            is_active: data.is_active,
          }}
          fields={[
            { name: "name", label: "Name", required: true, span: 2 },
            { name: "code", label: "Code", required: true },
            { name: "category", label: "Category" },
            {
              name: "patron_user_id",
              label: "Patron",
              type: "select",
              placeholder: "No patron",
              options: users.map((user) => ({
                value: String(user.id),
                label: user.name,
              })),
            },
            { name: "description", label: "Description", span: 2 },
            { name: "is_active", label: "Active", type: "checkbox", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
