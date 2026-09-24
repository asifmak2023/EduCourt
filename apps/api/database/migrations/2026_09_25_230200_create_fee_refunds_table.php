<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('receipt_no');
            $table->date('refund_date');
            $table->decimal('amount', 15, 2);
            $table->string('method');
            $table->string('reason')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->string('status')->default('posted');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'receipt_no']);
            $table->index(['campus_id', 'student_id'], 'fr_campus_student_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_refunds');
    }
};
