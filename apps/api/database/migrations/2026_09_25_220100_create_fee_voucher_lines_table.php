<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_voucher_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_voucher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_head_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['fee_voucher_id', 'fee_head_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_voucher_lines');
    }
};
