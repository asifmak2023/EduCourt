<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('receipt_no', 32);
            $table->date('payment_date');
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('method', 32);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 32)->default('posted');
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['campus_id', 'receipt_no']);
            $table->index(['campus_id', 'student_id'], 'fee_receipts_campus_student_idx');
            $table->index(['campus_id', 'payment_date'], 'fee_receipts_campus_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_receipts');
    }
};
