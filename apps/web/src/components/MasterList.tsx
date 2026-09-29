"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";

export interface MasterListColumn<T> {
  header: string;
  align?: "left" | "right";
  render: (item: T) => ReactNode;
}

export interface MasterListFilter {
  param: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

export function MasterList<T extends { id: number }>({
  title,
  description,
  endpoint,
  columns,
  filters = [],
  searchable = true,
  searchPlaceholder = "Search",
  createHref,
  createPermission,
  createLabel = "New",
  editHref,
}: {
  title: string;
  description?: string;
  endpoint: string;
  columns: MasterListColumn<T>[];
  filters?: MasterListFilter[];
  searchable?: boolean;
  searchPlaceholder?: string;
  createHref?: string;
  createPermission?: string;
  createLabel?: string;
  editHref?: (item: T) => string;
}) {
  const { can } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const params: Record<string, string | number> = {};
  for (const filter of filters) {
    const value = filterValues[filter.param];
    if (value) params[filter.param] = value;
  }

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<T>(endpoint, params);

  const canCreate = createHref && (!createPermission || can(createPermission));

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {searchable ? (
              <div className="w-56">
                <TextInput
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                  placeholder={searchPlaceholder}
                />
              </div>
            ) : null}
            {canCreate ? (
              <Link href={createHref} className={buttonClasses()}>
                {createLabel}
              </Link>
            ) : null}
          </>
        }
      />

      {filters.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <div key={filter.param} className="w-52">
              <Select
                value={filterValues[filter.param] ?? ""}
                onChange={(event) => {
                  setPage(1);
                  setFilterValues((current) => ({
                    ...current,
                    [filter.param]: event.target.value,
                  }));
                }}
              >
                <option value="">{filter.placeholder}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No records match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label={title} className="min-w-[720px]">
                <Table.Header>
                  {columns.map((column, index) => (
                    <Table.Column
                      key={column.header}
                      isRowHeader={index === 0}
                      className={column.align === "right" ? "text-right" : undefined}
                    >
                      {column.header}
                    </Table.Column>
                  ))}
                </Table.Header>
                <Table.Body>
                  {items.map((item) => (
                    <Table.Row key={item.id} id={item.id}>
                      {columns.map((column, index) => (
                        <Table.Cell
                          key={column.header}
                          className={
                            column.align === "right" ? "text-right" : undefined
                          }
                        >
                          {index === 0 && editHref ? (
                            <Link
                              href={editHref(item)}
                              className="font-medium text-foreground hover:underline"
                            >
                              {column.render(item)}
                            </Link>
                          ) : (
                            column.render(item)
                          )}
                        </Table.Cell>
                      ))}
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
