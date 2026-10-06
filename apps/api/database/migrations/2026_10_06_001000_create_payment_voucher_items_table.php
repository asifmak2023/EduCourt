<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_voucher_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_voucher_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('line_no')->default(1);
            $table->string('kind', 32);
            $table->string('description')->nullable();
            $table->foreignId('payment_category_id')->nullable()->constrained('payment_categories')->nullOnDelete();
            $table->decimal('quantity', 15, 3)->nullable();
            $table->decimal('unit_price', 15, 2)->nullable();
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('other_charges', 15, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('source_ref')->nullable();
            $table->timestamps();

            $table->index('payment_voucher_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_voucher_items');
    }
};
