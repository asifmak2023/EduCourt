<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_salary_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_salary_id')->constrained()->cascadeOnDelete();
            $table->foreignId('salary_component_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->nullable();
            $table->decimal('percentage', 6, 2)->nullable();
            $table->timestamps();

            $table->unique(['staff_salary_id', 'salary_component_id'], 'staff_salary_items_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_salary_items');
    }
};
