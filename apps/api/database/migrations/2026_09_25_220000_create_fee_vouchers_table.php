<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_installment_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('sequence');
            $table->string('voucher_no');
            $table->date('due_date');
            $table->decimal('gross_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('status')->default('unpaid');
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'voucher_no']);
            $table->unique(['student_id', 'fee_installment_id']);
            $table->index(['campus_id', 'student_id', 'status'], 'fv_campus_student_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_vouchers');
    }
};
