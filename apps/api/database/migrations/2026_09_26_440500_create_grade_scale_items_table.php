<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_scale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_scale_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence')->default(1);
            $table->string('grade', 16);
            $table->decimal('min_percentage', 6, 2);
            $table->decimal('max_percentage', 6, 2);
            $table->decimal('points', 5, 2)->nullable();
            $table->string('remark')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_scale_items');
    }
};
