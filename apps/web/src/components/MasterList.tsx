"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { Table } from "@heroui/react";
import { currentAcademicYearId } from "@/lib/academicYear";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { Pagination } from "@/components/Pagination";
import { SearchableSelect, Select, TextInput, buttonClasses } from "@/components/Form";
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
  footer?: (helpers: {
    items: T[];
    summary: Record<string, string | number> | null;
  }) => ReactNode;
}

export interface MasterListFilter {
  param: string;
  placeholder: string;
  type?: "select" | "date" | "search" | "searchable";
  label?: string;
  group?: string;
  options?: { value: string; label: string; is_current?: boolean }[];
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
  defaultFilters,
  rowActions,
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
  defaultFilters?: Record<string, string>;
  rowActions?: (item: T, helpers: { reload: () => void }) => ReactNode;
}) {
  const { can } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    () => ({ ...defaultFilters })
  );

  const yearFilter = filters.find(
    (filter) => filter.param === "academic_year_id"
  );
  const yearOptions = yearFilter?.options ?? [];
  const defaultYearId =
    yearOptions.length > 0
      ? currentAcademicYearId(
          yearOptions.map((option) => ({
            id: option.value,
            is_current: option.is_current,
          }))
        )
      : "";

  const effectiveFilterValues: Record<string, string> = { ...filterValues };
  if (defaultYearId && !effectiveFilterValues.academic_year_id) {
    effectiveFilterValues.academic_year_id = defaultYearId;
  }

  const params: Record<string, string | number> = {};
  for (const filter of filters) {
    const value = effectiveFilterValues[filter.param];
    if (value) params[filter.param] = value;
  }

  const {
    items,
    meta,
    summary,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    reload,
  } = useList<T>(endpoint, params);

  const hasFooter = columns.some((column) => column.footer);

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
        <div className="flex flex-wrap items-end gap-3">
          {groupFilters(filters).map((group) =>
            group.label ? (
              <div
                key={group.key}
                className="rounded-xl border border-border-secondary px-3 py-2"
              >
                <p className="mb-1 text-xs font-medium text-muted">{group.label}</p>
                <div className="flex flex-wrap gap-3">
                  {group.items.map((filter) => (
                    <FilterControl
                      key={filter.param}
                      filter={filter}
                      value={effectiveFilterValues[filter.param] ?? ""}
                      onChange={(next) => {
                        setPage(1);
                        setFilterValues((current) => ({
                          ...current,
                          [filter.param]: next,
                        }));
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <FilterControl
                key={group.key}
                filter={group.items[0]}
                value={effectiveFilterValues[group.items[0].param] ?? ""}
                onChange={(next) => {
                  setPage(1);
                  setFilterValues((current) => ({
                    ...current,
                    [group.items[0].param]: next,
                  }));
                }}
              />
            )
          )}
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
                  {rowActions ? (
                    <Table.Column key="actions" className="text-right">
                      Actions
                    </Table.Column>
                  ) : null}
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
                      {rowActions ? (
                        <Table.Cell key="actions" className="text-right">
                          {rowActions(item, { reload })}
                        </Table.Cell>
                      ) : null}
                    </Table.Row>
                  ))}
                </Table.Body>
                {hasFooter ? (
                  <Table.Footer>
                    <Table.Row id="list-total">
                      {columns.map((column) => (
                        <Table.Cell
                          key={column.header}
                          className={
                            column.align === "right"
                              ? "text-right font-semibold"
                              : "font-semibold"
                          }
                        >
                          {column.footer
                            ? column.footer({ items, summary: summary ?? null })
                            : null}
                        </Table.Cell>
                      ))}
                      {rowActions ? <Table.Cell /> : null}
                    </Table.Row>
                  </Table.Footer>
                ) : null}
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

function groupFilters(filters: MasterListFilter[]) {
  const groups: { key: string; label?: string; items: MasterListFilter[] }[] = [];

  for (const filter of filters) {
    if (filter.group) {
      const existing = groups.find((group) => group.label === filter.group);
      if (existing) {
        existing.items.push(filter);
      } else {
        groups.push({
          key: `group-${filter.group}`,
          label: filter.group,
          items: [filter],
        });
      }
    } else {
      groups.push({ key: filter.param, items: [filter] });
    }
  }

  return groups;
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: MasterListFilter;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-52">
      {filter.label ? (
        <label
          htmlFor={`filter-${filter.param}`}
          className="mb-1 block text-xs font-medium text-muted"
        >
          {filter.label}
        </label>
      ) : null}
      {filter.type === "date" ? (
        <TextInput
          id={`filter-${filter.param}`}
          type="date"
          value={value}
          aria-label={filter.label ?? filter.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : filter.type === "search" ? (
        <TextInput
          id={`filter-${filter.param}`}
          type="search"
          value={value}
          placeholder={filter.placeholder}
          aria-label={filter.label ?? filter.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : filter.type === "searchable" ? (
        <SearchableSelect
          id={`filter-${filter.param}`}
          value={value}
          placeholder={filter.placeholder}
          aria-label={filter.label ?? filter.placeholder}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{filter.placeholder}</option>
          {(filter.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SearchableSelect>
      ) : (
        <Select
          id={`filter-${filter.param}`}
          value={value}
          aria-label={filter.label ?? filter.placeholder}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{filter.placeholder}</option>
          {(filter.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
