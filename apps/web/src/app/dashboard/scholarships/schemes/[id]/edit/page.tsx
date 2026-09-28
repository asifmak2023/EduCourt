"use client";

import { useParams } from "next/navigation";
import { useAcademicYears } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Scholarship } from "@/lib/types";

const TYPE_OPTIONS = [
  { value: "merit", label: "Merit" },
  { value: "need_based", label: "Need based" },
  { value: "sports", label: "Sports" },
  { value: "sibling", label: "Sibling" },
  { value: "staff_ward", label: "Staff ward" },
  { value: "other", label: "Other" },
];

export default function EditScholarshipPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Scholarship>(
    id ? `/v1/scholarships/${id}` : null
  );
  const { items: years } = useAcademicYears();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Scholarship not found." />;

  return (
    <PermissionGate permission="scholarship.edit">
      <MasterForm
        title="Edit scholarship"
        description={data.name}
        endpoint="/v1/scholarships"
        recordId={data.id}
        redirectTo="/dashboard/scholarships/schemes"
        initial={{
          name: data.name,
          code: data.code,
          type: data.type ?? "merit",
          discount_type: data.discount_type ?? "percentage",
          value: data.value,
          academic_year_id:
            data.academic_year_id === null ? "" : String(data.academic_year_id),
          sponsor: data.sponsor ?? "",
          description: data.description ?? "",
          is_active: data.is_active,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true, span: 2 },
          { name: "code", label: "Code", type: "text", required: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            required: true,
            options: TYPE_OPTIONS,
          },
          {
            name: "discount_type",
            label: "Discount type",
            type: "select",
            required: true,
            options: [
              { value: "percentage", label: "Percentage" },
              { value: "fixed", label: "Fixed amount" },
            ],
          },
          {
            name: "value",
            label: "Value",
            type: "number",
            required: true,
            min: "0",
            step: "0.01",
          },
          {
            name: "academic_year_id",
            label: "Academic year",
            type: "select",
            placeholder: "Optional",
            options: years.map((year) => ({
              value: String(year.id),
              label: year.name,
            })),
          },
          { name: "sponsor", label: "Sponsor", type: "text" },
          {
            name: "description",
            label: "Description",
            type: "text",
            span: 2,
          },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
