"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { TermForm } from "@/components/TermForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Term } from "@/lib/types";

export default function EditTermPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditTermLoader />
    </PermissionGate>
  );
}

function EditTermLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Term>(
    id ? `/v1/terms/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Term not found." />;

  return <TermForm term={data} />;
}
