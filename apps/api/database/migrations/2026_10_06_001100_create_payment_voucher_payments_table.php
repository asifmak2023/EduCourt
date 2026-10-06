<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_voucher_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_voucher_id')->constrained()->cascadeOnDelete();
            $table->string('reference');
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('method', 32);
            $table->string('cheque_no')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'reference']);
            $table->index('payment_voucher_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_voucher_payments');
    }
};
