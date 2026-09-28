"use client";

import Link from "next/link";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { buttonClasses } from "@/components/Form";
import type { Vendor } from "@/lib/types";

export default function VendorsPage() {
  return (
    <PermissionGate permission="finance.view">
      <VendorsTable />
    </PermissionGate>
  );
}

function VendorsTable() {
  const { can } = useAuth();

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Vendor>("/v1/vendors");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Suppliers and service providers."
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search name, code or phone"
              className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/vendors/new"
                className={buttonClasses()}
              >
                New vendor
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No vendors match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Payable account</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {vendor.code}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {can("finance.edit") ? (
                        <Link
                          href={`/dashboard/finance/vendors/${vendor.id}/edit`}
                          className="hover:underline"
                        >
                          {vendor.name}
                        </Link>
                      ) : (
                        vendor.name
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {vendor.contact_name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {vendor.phone ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {vendor.payable_account
                        ? `${vendor.payable_account.code} - ${vendor.payable_account.name}`
                        : "Default"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={vendor.is_active ? "active" : "inactive"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta ? (
          <Pagination
            page={page}
            lastPage={meta.last_page}
            total={meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
