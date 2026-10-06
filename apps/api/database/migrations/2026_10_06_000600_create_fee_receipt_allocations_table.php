<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_receipt_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_charge_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2)->default(0);
            $table->timestamps();
            $table->unique(['fee_receipt_id', 'fee_charge_id'], 'fee_receipt_allocations_unique');
            $table->index('fee_charge_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_receipt_allocations');
    }
};
