"use client";

import { useJson } from "@/lib/useJson";
import { useTr } from "@/lib/i18n";
import { ChargePrintButton } from "./ChargePrintButton";
import { CollectPaymentButton } from "./CollectPaymentButton";
import { Badge, EmptyState, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FeeCharge } from "@/lib/types";

interface ChargesResponse {
  data: FeeCharge[];
}

export interface StudentFeeVouchersCardProps {
  studentId: number;
  studentName?: string | null;
  admissionNo?: string | null;
}

export function StudentFeeVouchersCard({
  studentId,
  studentName = null,
  admissionNo = null,
}: StudentFeeVouchersCardProps) {
  const tr = useTr();
  const { data, loading } = useJson<ChargesResponse>(
    `/v1/fee-charges?student_id=${studentId}&per_page=10`
  );

  const charges = data?.data ?? [];

  return (
    <section className="rounded-xl border border-border-secondary bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {tr("Fee vouchers")}
          </h2>
          <p className="text-xs text-muted">
            {tr("Generated fee vouchers and their balances.")}
          </p>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : charges.length === 0 ? (
        <EmptyState message="No fee vouchers for this student yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-2 py-2">Voucher</th>
                <th className="px-2 py-2">Fee type</th>
                <th className="px-2 py-2">Due</th>
                <th className="px-2 py-2 text-right">Payable</th>
                <th className="px-2 py-2 text-right">Balance</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={charge.id} className="border-t border-border-secondary">
                  <td className="px-2 py-2">
                    <span className="block font-medium text-foreground">
                      {charge.voucher_no}
                    </span>
                    <span className="block text-xs text-muted">
                      {charge.title ?? charge.billing_kind_label ?? ""}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted">
                    {charge.billing_kind_label ?? charge.billing_kind ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-muted">
                    {formatDate(charge.due_date)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatCurrency(charge.amount)}
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-foreground">
                    {formatCurrency(charge.balance)}
                  </td>
                  <td className="px-2 py-2">
                    <Badge value={charge.status ?? "unpaid"} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <CollectPaymentButton
                        student={{
                          id: studentId,
                          full_name: studentName,
                          admission_no: admissionNo,
                        }}
                        chargeId={charge.id}
                        label="Collect"
                      />
                      <ChargePrintButton chargeId={charge.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
