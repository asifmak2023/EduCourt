"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Badge } from "@/components/ui";
import type { CanteenSupplier } from "@/lib/types";

export default function CanteenSuppliersPage() {
  const { can } = useAuth();

  return (
    <div className="space-y-6">
      <CanteenTabs active="suppliers" />
      <MasterList<CanteenSupplier>
        title="Canteen suppliers"
        description="Vendors that supply the canteen."
        endpoint="/v1/canteen/suppliers"
        searchPlaceholder="Search supplier"
        createHref={
          can("canteen.create") ? "/dashboard/canteen/suppliers/new" : undefined
        }
        createLabel="New supplier"
        editHref={(item) => `/dashboard/canteen/suppliers/${item.id}/edit`}
        filters={[
          {
            param: "is_active",
            placeholder: "Status",
            options: [
              { value: "1", label: "Active" },
              { value: "0", label: "Inactive" },
            ],
          },
        ]}
        columns={[
          { header: "Supplier", render: (item) => item.name },
          {
            header: "Contact",
            render: (item) => item.contact_person ?? "-",
          },
          { header: "Phone", render: (item) => item.phone ?? "-" },
          { header: "Email", render: (item) => item.email ?? "-" },
          {
            header: "Status",
            render: (item) => (
              <Badge value={item.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
