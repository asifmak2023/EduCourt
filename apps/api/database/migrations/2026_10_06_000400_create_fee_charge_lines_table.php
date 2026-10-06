<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_charge_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_charge_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_head_id')->nullable()->constrained('fee_heads')->nullOnDelete();
            $table->string('description')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->timestamps();
            $table->index('fee_charge_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_charge_lines');
    }
};
