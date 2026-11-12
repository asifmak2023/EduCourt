<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_structure_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_structure_id')->constrained()->cascadeOnDelete();
            $table->foreignId('salary_component_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->nullable();
            $table->decimal('percentage', 6, 2)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['salary_structure_id', 'salary_component_id'], 'salary_structure_items_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_structure_items');
    }
};
