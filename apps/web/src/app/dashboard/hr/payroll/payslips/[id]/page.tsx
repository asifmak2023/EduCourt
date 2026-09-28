"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Payslip } from "@/lib/types";

export default function PayslipDetailPage() {
  return (
    <PermissionGate permission="payroll.view">
      <PayslipDetailView />
    </PermissionGate>
  );
}

function PayslipDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Payslip>(
    id ? `/v1/payslips/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Payslip not found." />;

  const items = data.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.staff_member?.full_name ?? `Payslip #${data.id}`}
        description={
          data.staff_member
            ? `${data.staff_member.employee_no} · Payslip`
            : "Payslip"
        }
        actions={
          <Link
            href={`/dashboard/hr/payroll/runs/${data.payroll_run_id}`}
            className={buttonClasses("secondary")}
          >
            Back to run
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Gross" value={Number(data.gross)} />
        <Summary label="Deductions" value={Number(data.deductions)} />
        <Summary label="Net" value={Number(data.net)} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem
            label="Basic"
            value={formatCurrency(Number(data.basic))}
          />
          <DataItem
            label="Working days"
            value={data.working_days === null ? "-" : String(data.working_days)}
          />
          <DataItem
            label="Present days"
            value={data.present_days === null ? "-" : String(data.present_days)}
          />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Breakdown ({items.length})
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No breakdown lines." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Label</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-slate-900">{item.label}</td>
                  <td className="px-5 py-3">
                    <Badge value={item.type ?? "unknown"} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {item.source ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900">
                    {formatCurrency(Number(item.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">
        {formatCurrency(value)}
      </p>
    </Card>
  );
}
