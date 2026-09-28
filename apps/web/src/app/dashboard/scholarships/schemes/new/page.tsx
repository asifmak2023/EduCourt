"use client";

import { useAcademicYears } from "@/lib/useLookups";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { Spinner } from "@/components/ui";

const TYPE_OPTIONS = [
  { value: "merit", label: "Merit" },
  { value: "need_based", label: "Need based" },
  { value: "sports", label: "Sports" },
  { value: "sibling", label: "Sibling" },
  { value: "staff_ward", label: "Staff ward" },
  { value: "other", label: "Other" },
];

export default function NewScholarshipPage() {
  const { items: years, loading } = useAcademicYears();

  if (loading) return <Spinner />;

  return (
    <PermissionGate permission="scholarship.create">
      <MasterForm
        title="New scholarship"
        description="Define a fee concession scheme."
        endpoint="/v1/scholarships"
        redirectTo="/dashboard/scholarships/schemes"
        initial={{ type: "merit", discount_type: "percentage", is_active: true }}
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
