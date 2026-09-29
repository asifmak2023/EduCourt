"use client";

import Link from "next/link";
import { Table } from "@heroui/react";
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
import { TextInput, buttonClasses } from "@/components/Form";
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
            <div className="w-64">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search name, code or phone"
              />
            </div>
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
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Vendors" className="min-w-[860px]">
                <Table.Header>
                  <Table.Column isRowHeader>Code</Table.Column>
                  <Table.Column>Name</Table.Column>
                  <Table.Column>Contact</Table.Column>
                  <Table.Column>Phone</Table.Column>
                  <Table.Column>Payable account</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((vendor) => (
                    <Table.Row key={vendor.id} id={vendor.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {vendor.code}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
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
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {vendor.contact_name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {vendor.phone ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {vendor.payable_account
                          ? `${vendor.payable_account.code} - ${vendor.payable_account.name}`
                          : "Default"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={vendor.is_active ? "active" : "inactive"} />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
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
