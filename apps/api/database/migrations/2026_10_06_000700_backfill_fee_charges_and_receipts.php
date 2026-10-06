<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->backfillCharges();
        $this->backfillChargeLines();
        $this->backfillReceipts();
        $this->archiveLegacyPlans();
    }

    public function down(): void
    {
        // Data backfill is not reversed; the new AR tables are dropped by the
        // schema migrations' down() methods.
    }

    private function backfillCharges(): void
    {
        if (DB::table('fee_charges')->where('source', 'legacy')->exists()) {
            return;
        }

        $installmentLabels = DB::table('fee_installments')->pluck('label', 'id');
        $enrollments = [];
        DB::table('student_enrollments')
            ->select('id', 'student_id', 'academic_year_id', 'class_room_id', 'section_id')
            ->orderBy('id')
            ->chunkById(1000, function ($rows) use (&$enrollments) {
                foreach ($rows as $row) {
                    $enrollments[$row->student_id.':'.$row->academic_year_id] = $row;
                }
            });

        DB::table('fee_vouchers')
            ->orderBy('id')
            ->chunkById(500, function ($vouchers) use ($installmentLabels, $enrollments) {
                $now = now();
                $rows = [];

                foreach ($vouchers as $voucher) {
                    $enrollment = $enrollments[$voucher->student_id.':'.$voucher->academic_year_id] ?? null;
                    $dueDate = Carbon::parse($voucher->due_date);

                    $rows[] = [
                        'institution_id' => $voucher->institution_id,
                        'campus_id' => $voucher->campus_id,
                        'academic_year_id' => $voucher->academic_year_id,
                        'student_id' => $voucher->student_id,
                        'enrollment_id' => $enrollment?->id,
                        'class_room_id' => $enrollment?->class_room_id,
                        'section_id' => $enrollment?->section_id,
                        'fee_structure_item_id' => null,
                        'fee_head_id' => null,
                        'voucher_no' => $voucher->voucher_no,
                        'billing_kind' => 'legacy_installment',
                        'exam_term' => null,
                        'period_year' => (int) $dueDate->year,
                        'period_month' => (int) $dueDate->month,
                        'title' => $installmentLabels[$voucher->fee_installment_id] ?? ('Installment '.$voucher->sequence),
                        'amount' => $voucher->amount,
                        'discount_amount' => $voucher->discount_amount,
                        'paid_amount' => $voucher->paid_amount,
                        'due_date' => $voucher->due_date,
                        'status' => $voucher->status,
                        'source' => 'legacy',
                        'notes' => null,
                        'journal_entry_id' => $voucher->journal_entry_id,
                        'created_by' => null,
                        'created_at' => $voucher->created_at ?? $now,
                        'updated_at' => $voucher->updated_at ?? $now,
                        'deleted_at' => $voucher->deleted_at,
                    ];
                }

                DB::table('fee_charges')->insertOrIgnore($rows);
            });
    }

    private function backfillChargeLines(): void
    {
        if (DB::table('fee_charge_lines')->exists()) {
            return;
        }

        $chargeIds = [];
        DB::table('fee_charges')
            ->where('source', 'legacy')
            ->select('id', 'campus_id', 'voucher_no')
            ->orderBy('id')
            ->chunkById(1000, function ($rows) use (&$chargeIds) {
                foreach ($rows as $row) {
                    $chargeIds[$row->campus_id.':'.$row->voucher_no] = $row->id;
                }
            });

        DB::table('fee_voucher_lines')
            ->join('fee_vouchers', 'fee_vouchers.id', '=', 'fee_voucher_lines.fee_voucher_id')
            ->select(
                'fee_voucher_lines.fee_head_id',
                'fee_voucher_lines.amount',
                'fee_voucher_lines.discount_amount',
                'fee_voucher_lines.created_at',
                'fee_vouchers.campus_id',
                'fee_vouchers.voucher_no'
            )
            ->orderBy('fee_voucher_lines.id')
            ->chunk(1000, function ($rows) use ($chargeIds) {
                $insert = [];
                foreach ($rows as $row) {
                    $chargeId = $chargeIds[$row->campus_id.':'.$row->voucher_no] ?? null;
                    if ($chargeId === null) {
                        continue;
                    }
                    $insert[] = [
                        'fee_charge_id' => $chargeId,
                        'fee_head_id' => $row->fee_head_id,
                        'description' => null,
                        'amount' => $row->amount,
                        'discount_amount' => $row->discount_amount,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->created_at,
                    ];
                }
                if ($insert !== []) {
                    DB::table('fee_charge_lines')->insert($insert);
                }
            });
    }

    private function backfillReceipts(): void
    {
        if (DB::table('fee_receipts')->exists()) {
            return;
        }

        $voucherMap = [];
        DB::table('fee_vouchers')
            ->select('id', 'campus_id', 'voucher_no')
            ->orderBy('id')
            ->chunkById(1000, function ($rows) use (&$voucherMap) {
                foreach ($rows as $row) {
                    $voucherMap[$row->id] = $row;
                }
            });

        $chargeByVoucherNo = [];
        DB::table('fee_charges')
            ->where('source', 'legacy')
            ->select('id', 'campus_id', 'voucher_no')
            ->orderBy('id')
            ->chunkById(1000, function ($rows) use (&$chargeByVoucherNo) {
                foreach ($rows as $row) {
                    $chargeByVoucherNo[$row->campus_id.':'.$row->voucher_no] = $row->id;
                }
            });

        DB::table('fee_payments')
            ->orderBy('id')
            ->chunkById(500, function ($payments) use ($voucherMap, $chargeByVoucherNo) {
                $receiptRows = [];
                $allocations = [];

                foreach ($payments as $payment) {
                    $receiptRows[] = [
                        'id' => $payment->id,
                        'institution_id' => $payment->institution_id,
                        'campus_id' => $payment->campus_id,
                        'student_id' => $payment->student_id,
                        'receipt_no' => $payment->receipt_no,
                        'payment_date' => $payment->payment_date,
                        'amount' => $payment->amount,
                        'method' => $payment->method,
                        'reference' => $payment->reference,
                        'notes' => $payment->notes,
                        'status' => $payment->status,
                        'journal_entry_id' => $payment->journal_entry_id,
                        'created_by' => $payment->created_by,
                        'created_at' => $payment->created_at,
                        'updated_at' => $payment->updated_at,
                        'deleted_at' => $payment->deleted_at,
                    ];

                    $voucher = $payment->fee_voucher_id ? ($voucherMap[$payment->fee_voucher_id] ?? null) : null;
                    if ($voucher !== null) {
                        $chargeId = $chargeByVoucherNo[$voucher->campus_id.':'.$voucher->voucher_no] ?? null;
                        if ($chargeId !== null) {
                            $allocations[] = [
                                'fee_receipt_id' => $payment->id,
                                'fee_charge_id' => $chargeId,
                                'amount' => $payment->amount,
                                'created_at' => $payment->created_at,
                                'updated_at' => $payment->updated_at,
                            ];
                        }
                    }
                }

                if ($receiptRows !== []) {
                    DB::table('fee_receipts')->insertOrIgnore($receiptRows);
                }
                if ($allocations !== []) {
                    DB::table('fee_receipt_allocations')->insertOrIgnore($allocations);
                }
            });
    }

    private function archiveLegacyPlans(): void
    {
        DB::table('fee_plans')->where('is_active', true)->update(['is_active' => false]);
    }
};
