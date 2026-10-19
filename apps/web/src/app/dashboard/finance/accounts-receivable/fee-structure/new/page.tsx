"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { FeeStructureForm } from "@/components/FeeStructureForm";
import { Spinner } from "@/components/ui";

export default function NewFeeStructurePage() {
  return (
    <PermissionGate permission="fee.create">
      <Suspense fallback={<Spinner />}>
        <NewFeeStructureLoader />
      </Suspense>
    </PermissionGate>
  );
}

function NewFeeStructureLoader() {
  const params = useSearchParams();

  return (
    <FeeStructureForm
      defaultAcademicYearId={params.get("academic_year_id") ?? ""}
      defaultClassRoomId={params.get("class_room_id") ?? ""}
    />
  );
}
