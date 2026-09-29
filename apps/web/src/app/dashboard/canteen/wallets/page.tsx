"use client";

import Link from "next/link";
import { useState } from "react";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { StudentWallet } from "@/lib/types";

export default function CanteenWalletsPage() {
  const { can } = useAuth();
  const [active, setActive] = useState("");
  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<StudentWallet>("/v1/canteen/wallets", {
      ...(active ? { is_active: active } : {}),
    });

  return (
    <div className="space-y-6">
      <CanteenTabs active="wallets" />

      <PageHeader
        title="Student wallets"
        description="Prepaid canteen balances tied to a student."
        actions={
          can("canteen.create") ? (
            <Link
              href="/dashboard/canteen/wallets/new"
              className={buttonClasses()}
            >
              Open wallet
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-72">
          <TextInput
            placeholder="Search student name or admission no."
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
        </div>
        <div className="w-40">
          <Select
            value={active}
            onChange={(event) => {
              setPage(1);
              setActive(event.target.value);
            }}
          >
            <option value="">All wallets</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No wallets found." />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Wallets">
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column className="text-right">Balance</Table.Column>
                  <Table.Column className="text-right">Daily limit</Table.Column>
                  <Table.Column className="text-right">Low threshold</Table.Column>
                  <Table.Column>Active</Table.Column>
                </Table.Header>
                <Table.Body>
                {items.map((wallet) => (
                  <Table.Row key={wallet.id} className="hover:bg-surface-secondary" id={wallet.id}>
                    <Table.Cell><Link
                        href={`/dashboard/canteen/wallets/${wallet.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {wallet.student?.full_name ?? `Student #${wallet.student_id}`}
                      </Link>
                      {wallet.student?.admission_no ? (
                        <span className="ml-2 text-xs text-muted">
                          {wallet.student.admission_no}
                        </span>
                      ) : null}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatCurrency(wallet.balance)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{wallet.daily_limit
                        ? formatCurrency(wallet.daily_limit)
                        : "-"}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{wallet.low_balance_threshold
                        ? formatCurrency(wallet.low_balance_threshold)
                        : "-"}</Table.Cell>
                    <Table.Cell><Badge value={wallet.is_active ? "active" : "inactive"} /></Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
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
