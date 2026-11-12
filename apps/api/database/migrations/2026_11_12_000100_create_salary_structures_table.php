<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('designation_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('basic_salary', 12, 2)->default(0);
            $table->string('currency', 3)->default('PKR');
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'designation_id'], 'salary_structures_campus_designation_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_structures');
    }
};
