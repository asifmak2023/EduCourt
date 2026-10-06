<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->nullable()->constrained('fiscal_years')->nullOnDelete();
            $table->string('category', 32);
            $table->string('voucher_no', 32);
            $table->date('payment_date');
            $table->date('due_date')->nullable();
            $table->string('payee_type', 16)->default('other');
            $table->foreignId('staff_member_id')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->foreignId('payroll_run_id')->nullable()->constrained('payroll_runs')->nullOnDelete();
            $table->foreignId('payslip_id')->nullable()->constrained('payslips')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('payee_name')->nullable();
            $table->text('description')->nullable();
            $table->string('reference_no')->nullable();
            $table->string('bill_no')->nullable();
            $table->date('invoice_date')->nullable();
            $table->unsignedSmallInteger('period_year')->nullable();
            $table->unsignedTinyInteger('period_month')->nullable();
            $table->string('utility_type', 32)->nullable();
            $table->string('consumer_no')->nullable();
            $table->decimal('bill_amount', 15, 2)->default(0);
            $table->decimal('late_fee', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('other_charges', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('method', 32)->nullable();
            $table->string('cheque_no')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('expense_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('payable_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->string('status', 32)->default('draft');
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'voucher_no']);
            $table->unique('payslip_id');
            $table->index(['campus_id', 'status'], 'payment_vouchers_campus_status_idx');
            $table->index(['campus_id', 'payment_date'], 'payment_vouchers_campus_date_idx');
            $table->index(['campus_id', 'due_date'], 'payment_vouchers_campus_due_idx');
            $table->index(['campus_id', 'category'], 'payment_vouchers_campus_category_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_vouchers');
    }
};
