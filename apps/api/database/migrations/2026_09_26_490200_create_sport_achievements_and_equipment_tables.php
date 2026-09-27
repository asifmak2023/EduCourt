<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sport_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('level', 32)->default('school');
            $table->string('position', 64)->nullable();
            $table->date('achieved_on');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'achieved_on']);
        });

        Schema::create('sport_equipment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('code', 32);
            $table->string('unit', 24)->default('piece');
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('available_quantity', 12, 2)->default(0);
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->string('condition', 32)->default('good');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'code']);
        });

        Schema::create('sport_equipment_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_equipment_id')->constrained('sport_equipment')->cascadeOnDelete();
            $table->string('type', 24);
            $table->decimal('quantity', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->foreignId('issued_to')->nullable()->constrained('users')->nullOnDelete();
            $table->date('movement_date');
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['campus_id', 'movement_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sport_equipment_movements');
        Schema::dropIfExists('sport_equipment');
        Schema::dropIfExists('sport_achievements');
    }
};
