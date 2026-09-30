"use client";

import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import {
  CIRCULAR_AUDIENCE_OPTIONS,
  CIRCULAR_STATUS_OPTIONS,
} from "@/lib/circularOptions";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Circular } from "@/lib/types";

export default function CircularsPage() {
  return (
    <MasterList<Circular>
      title="Circulars"
      description="Notices and circulars with a draft, publish and archive lifecycle."
      endpoint="/v1/circulars"
      searchable={false}
      createHref="/dashboard/circulars/new"
      createPermission="circular.create"
      createLabel="New circular"
      editHref={(circular) => `/dashboard/circulars/${circular.id}`}
      filters={[
        {
          param: "status",
          placeholder: "All statuses",
          options: CIRCULAR_STATUS_OPTIONS,
        },
        {
          param: "audience",
          placeholder: "All audiences",
          options: CIRCULAR_AUDIENCE_OPTIONS,
        },
      ]}
      columns={[
        { header: "Title", render: (circular) => circular.title },
        {
          header: "Audience",
          render: (circular) => <Badge value={circular.audience ?? "all"} />,
        },
        {
          header: "Class",
          render: (circular) => circular.class_room?.name ?? "-",
        },
        {
          header: "Section",
          render: (circular) => circular.section?.name ?? "-",
        },
        {
          header: "Published",
          render: (circular) => formatDateTime(circular.published_at),
        },
        { header: "Expires", render: (circular) => formatDate(circular.expires_on) },
        {
          header: "Status",
          render: (circular) => (
            <Badge value={circular.status ?? "draft"} />
          ),
        },
      ]}
    />
  );
}
