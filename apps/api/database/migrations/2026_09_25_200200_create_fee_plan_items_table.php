<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_plan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_head_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->boolean('is_optional')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['fee_plan_id', 'fee_head_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_plan_items');
    }
};
