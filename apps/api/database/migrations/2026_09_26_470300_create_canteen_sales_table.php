<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('canteen_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('wallet_id')->nullable();
            $table->string('bill_no');
            $table->string('customer_name')->nullable();
            $table->string('payment_method', 24)->default('cash');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('discount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->decimal('cost_total', 14, 2)->default(0);
            $table->string('status', 24)->default('completed');
            $table->date('sold_on');
            $table->text('notes')->nullable();
            $table->foreignId('served_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'bill_no']);
            $table->index(['campus_id', 'sold_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('canteen_sales');
    }
};
