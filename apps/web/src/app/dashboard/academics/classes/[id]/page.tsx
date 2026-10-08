"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
} from "@/components/ui";
import type { ClassRoom } from "@/lib/types";

export default function ClassDetailPage() {
  return (
    <PermissionGate permission="academic.view">
      <ClassDetailView />
    </PermissionGate>
  );
}

function ClassDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, loading, error } = useResource<ClassRoom>(
    id ? `/v1/classes/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Class not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.stage?.name ?? "Class details"}
        actions={
          <>
            <Link
              href="/dashboard/academics/classes"
              className={buttonClasses("secondary")}
            >
              All classes
            </Link>
            <Link
              href={`/dashboard/academics/classes/${data.id}/students`}
              className={buttonClasses("primary")}
            >
              View students
            </Link>
            <Link
              href={`/dashboard/academics/classes/${data.id}/edit`}
              className={buttonClasses("secondary")}
            >
              Edit
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
      </div>

      <SectionCard title="Class details">
        <DataList>
          <DataItem label="Name" value={data.name} />
          <DataItem label="Code" value={data.code} />
          <DataItem label="Stage" value={data.stage?.name ?? "-"} />
          <DataItem
            label="Capacity"
            value={data.capacity !== null ? String(data.capacity) : "-"}
          />
          <DataItem label="Homeroom" value={data.room ?? "-"} />
        </DataList>
      </SectionCard>

      {data.sections && data.sections.length > 0 ? (
        <SectionCard title="Sections">
          <ul className="divide-y divide-border">
            {data.sections.map((section) => (
              <li
                key={section.id}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0 text-sm"
              >
                <span className="font-medium text-foreground">
                  {section.name}
                </span>
                <Badge
                  value={section.is_active ? "active" : "inactive"}
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Class Roster
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Browse and manage students enrolled in this class.
            </p>
          </div>
          <Link
            href={`/dashboard/academics/classes/${data.id}/students`}
            className={buttonClasses("primary")}
          >
            Open class roster
          </Link>
        </div>
      </Card>
    </div>
  );
}
