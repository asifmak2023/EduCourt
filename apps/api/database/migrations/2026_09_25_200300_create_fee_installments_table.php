<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_plan_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('sequence');
            $table->string('label');
            $table->date('due_date');
            $table->decimal('percentage', 5, 2);
            $table->timestamps();

            $table->unique(['fee_plan_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_installments');
    }
};
