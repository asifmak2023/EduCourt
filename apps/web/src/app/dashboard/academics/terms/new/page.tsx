"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { TermForm } from "@/components/TermForm";
import { Spinner } from "@/components/ui";

export default function NewTermPage() {
  return (
    <PermissionGate permission="academic.create">
      <Suspense fallback={<Spinner />}>
        <NewTermLoader />
      </Suspense>
    </PermissionGate>
  );
}

function NewTermLoader() {
  const params = useSearchParams();
  const yearId = params.get("academic_year_id") ?? "";

  return <TermForm defaultAcademicYearId={yearId} />;
}
