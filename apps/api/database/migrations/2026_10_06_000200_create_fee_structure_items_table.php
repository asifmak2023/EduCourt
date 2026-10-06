<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_structure_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_structure_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_head_id')->nullable()->constrained('fee_heads')->nullOnDelete();
            $table->string('name');
            $table->string('billing_kind', 32);
            $table->string('exam_term', 32)->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->boolean('is_optional')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['fee_structure_id', 'billing_kind'], 'fee_structure_items_structure_kind_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_structure_items');
    }
};
