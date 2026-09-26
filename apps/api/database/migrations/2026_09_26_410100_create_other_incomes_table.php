<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('other_incomes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('income_source_id')->constrained()->cascadeOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('receipt_no', 32);
            $table->date('received_on');
            $table->decimal('amount', 14, 2);
            $table->string('method', 24)->default('cash');
            $table->string('payer_name')->nullable();
            $table->string('reference')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'receipt_no']);
            $table->index(['campus_id', 'received_on']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('other_incomes');
    }
};
