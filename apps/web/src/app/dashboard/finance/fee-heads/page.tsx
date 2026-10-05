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
import type { FeeHead } from "@/lib/types";

export default function FeeHeadsPage() {
  return (
    <PermissionGate permission="fee.view">
      <FeeHeadsTable />
    </PermissionGate>
  );
}

function FeeHeadsTable() {
  const { can } = useAuth();

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<FeeHead>("/v1/fee-heads");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee heads"
        description="Charge categories used to build fee plans."
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
                placeholder="Search name or code"
              />
            </div>
            {can("fee.create") ? (
              <Link
                href="/dashboard/finance/fee-heads/new"
                className={buttonClasses()}
              >
                New fee head
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
          <EmptyState message="No fee heads match your search." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Fee heads" className="min-w-[720px]">
                <Table.Header>
                  <Table.Column isRowHeader>Code</Table.Column>
                  <Table.Column>Name</Table.Column>
                  <Table.Column>Income account</Table.Column>
                  <Table.Column>Sort</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((head) => (
                    <Table.Row key={head.id} id={head.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {head.code ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        {can("fee.edit") ? (
                          <Link
                            href={`/dashboard/finance/fee-heads/${head.id}/edit`}
                            className="hover:underline"
                          >
                            {head.name}
                          </Link>
                        ) : (
                          head.name
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {head.income_account
                          ? `${head.income_account.code} - ${head.income_account.name}`
                          : "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {head.sort_order ?? 0}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={head.is_active === false ? "inactive" : "active"} />
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
