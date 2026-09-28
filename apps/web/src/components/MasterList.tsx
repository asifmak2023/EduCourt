"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
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
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder={searchPlaceholder}
                className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.header}
                      className={`px-5 py-3 font-medium ${
                        column.align === "right" ? "text-right" : ""
                      }`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {columns.map((column, index) => (
                      <td
                        key={column.header}
                        className={`px-5 py-3 ${
                          column.align === "right" ? "text-right" : ""
                        }`}
                      >
                        {index === 0 && editHref ? (
                          <Link
                            href={editHref(item)}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {column.render(item)}
                          </Link>
                        ) : (
                          column.render(item)
                        )}
                      </td>
                    ))}
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
