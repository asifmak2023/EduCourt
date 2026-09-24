<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained()->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('chart_of_account_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['budget_id', 'chart_of_account_id']);
            $table->index(['campus_id', 'chart_of_account_id'], 'bl_campus_account_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_lines');
    }
};
