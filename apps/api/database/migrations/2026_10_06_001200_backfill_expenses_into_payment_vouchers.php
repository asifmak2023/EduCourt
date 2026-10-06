<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Seed default payment categories and backfill the legacy Expenses ledger
     * into the new Accounts Payable tables. Non-destructive: no journal entries
     * are created or re-posted; existing journal_entry_id values are carried
     * over. Idempotent and safe to re-run.
     */
    public function up(): void
    {
        $now = now();

        $this->seedCategories($now);
        $this->backfillVouchers($now);
        $this->backfillPayments($now);
    }

    public function down(): void
    {
        $legacyIds = DB::table('payment_vouchers')->where('category', 'legacy')->pluck('id');

        if ($legacyIds->isNotEmpty()) {
            DB::table('payment_voucher_payments')->whereIn('payment_voucher_id', $legacyIds)->delete();
            DB::table('payment_voucher_items')->whereIn('payment_voucher_id', $legacyIds)->delete();
            DB::table('payment_vouchers')->whereIn('id', $legacyIds)->delete();
        }
    }

    private function seedCategories($now): void
    {
        $defaults = [
            ['code' => 'REP', 'name' => 'Repair & Maintenance', 'account' => '5040'],
            ['code' => 'TRA', 'name' => 'Transport Expense', 'account' => null],
            ['code' => 'PRO', 'name' => 'Professional Fee', 'account' => null],
            ['code' => 'SEC', 'name' => 'Security Services', 'account' => null],
            ['code' => 'RENT', 'name' => 'Rent', 'account' => null],
            ['code' => 'STA', 'name' => 'Stationery', 'account' => '5030'],
            ['code' => 'MISC', 'name' => 'Miscellaneous Expense', 'account' => null],
        ];

        foreach (DB::table('campuses')->select('id', 'institution_id')->get() as $campus) {
            foreach ($defaults as $sort => $default) {
                if (DB::table('payment_categories')
                    ->where('campus_id', $campus->id)
                    ->where('code', $default['code'])
                    ->exists()) {
                    continue;
                }

                $accountId = $default['account'] === null
                    ? null
                    : DB::table('chart_of_accounts')
                        ->where('campus_id', $campus->id)
                        ->where('code', $default['account'])
                        ->where('is_group', false)
                        ->value('id');

                DB::table('payment_categories')->insert([
                    'institution_id' => $campus->institution_id,
                    'campus_id' => $campus->id,
                    'expense_account_id' => $accountId,
                    'code' => $default['code'],
                    'name' => $default['name'],
                    'sort_order' => $sort,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    private function backfillVouchers($now): void
    {
        $statusMap = [
            'draft' => 'draft',
            'approved' => 'approved',
            'partial' => 'partial',
            'paid' => 'paid',
            'void' => 'cancelled',
        ];

        foreach (DB::table('expenses')->orderBy('id')->get() as $expense) {
            $existing = DB::table('payment_vouchers')
                ->where('campus_id', $expense->campus_id)
                ->where('voucher_no', $expense->reference)
                ->value('id');

            if ($existing !== null) {
                continue;
            }

            $voucherId = DB::table('payment_vouchers')->insertGetId([
                'institution_id' => $expense->institution_id,
                'campus_id' => $expense->campus_id,
                'fiscal_year_id' => $expense->fiscal_year_id,
                'category' => 'legacy',
                'voucher_no' => $expense->reference,
                'payment_date' => $expense->expense_date,
                'due_date' => null,
                'payee_type' => $expense->vendor_id !== null ? 'vendor' : 'other',
                'vendor_id' => $expense->vendor_id,
                'payee_name' => $expense->payee_name,
                'description' => $expense->memo,
                'bill_no' => $expense->bill_no,
                'bill_amount' => $expense->total,
                'subtotal' => $expense->total,
                'total_amount' => $expense->total,
                'paid_amount' => $expense->paid_amount,
                'status' => $statusMap[$expense->status] ?? 'draft',
                'journal_entry_id' => $expense->journal_entry_id,
                'created_by' => $expense->created_by,
                'approved_by' => $expense->approved_by,
                'approved_at' => $expense->approved_at,
                'created_at' => $expense->created_at ?? $now,
                'updated_at' => $expense->updated_at ?? $now,
            ]);

            $lineNo = 1;
            foreach (DB::table('expense_lines')->where('expense_id', $expense->id)->orderBy('id')->get() as $line) {
                DB::table('payment_voucher_items')->insert([
                    'payment_voucher_id' => $voucherId,
                    'line_no' => $lineNo++,
                    'kind' => 'purchase_item',
                    'description' => $line->description,
                    'payment_category_id' => null,
                    'amount' => $line->amount,
                    'created_at' => $line->created_at ?? $now,
                    'updated_at' => $line->updated_at ?? $now,
                ]);
            }
        }
    }

    private function backfillPayments($now): void
    {
        foreach (DB::table('expense_payments')->orderBy('id')->get() as $payment) {
            $exists = DB::table('payment_voucher_payments')
                ->where('campus_id', $payment->campus_id)
                ->where('reference', $payment->reference)
                ->exists();

            if ($exists) {
                continue;
            }

            $expenseReference = DB::table('expenses')->where('id', $payment->expense_id)->value('reference');

            if ($expenseReference === null) {
                continue;
            }

            $voucherId = DB::table('payment_vouchers')
                ->where('campus_id', $payment->campus_id)
                ->where('voucher_no', $expenseReference)
                ->value('id');

            if ($voucherId === null) {
                continue;
            }

            DB::table('payment_voucher_payments')->insert([
                'institution_id' => $payment->institution_id,
                'campus_id' => $payment->campus_id,
                'payment_voucher_id' => $voucherId,
                'reference' => $payment->reference,
                'payment_date' => $payment->payment_date,
                'amount' => $payment->amount,
                'method' => $payment->method,
                'journal_entry_id' => $payment->journal_entry_id,
                'notes' => $payment->notes,
                'created_by' => $payment->created_by,
                'voided_at' => $payment->voided_at,
                'created_at' => $payment->created_at ?? $now,
                'updated_at' => $payment->updated_at ?? $now,
            ]);
        }
    }
};
