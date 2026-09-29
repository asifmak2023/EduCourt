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
import type { ExpenseCategory } from "@/lib/types";

export default function ExpenseCategoriesPage() {
  return (
    <PermissionGate permission="finance.view">
      <CategoriesTable />
    </PermissionGate>
  );
}

function CategoriesTable() {
  const { can } = useAuth();

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<ExpenseCategory>("/v1/expense-categories");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense categories"
        description="Map expense lines to ledger accounts."
        actions={
          <>
            <div className="w-60">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search code or name"
              />
            </div>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/expense-categories/new"
                className={buttonClasses()}
              >
                New category
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
          <EmptyState message="No expense categories match your search." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Expense categories"
                className="min-w-[760px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Code</Table.Column>
                  <Table.Column>Name</Table.Column>
                  <Table.Column>Expense account</Table.Column>
                  <Table.Column className="text-right">Sort</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((category) => (
                    <Table.Row key={category.id} id={category.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {category.code}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        {can("finance.edit") ? (
                          <Link
                            href={`/dashboard/finance/expense-categories/${category.id}/edit`}
                            className="hover:underline"
                          >
                            {category.name}
                          </Link>
                        ) : (
                          category.name
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {category.expense_account
                          ? `${category.expense_account.code} - ${category.expense_account.name}`
                          : "Not set"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {category.sort_order}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={category.is_active ? "active" : "inactive"} />
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
