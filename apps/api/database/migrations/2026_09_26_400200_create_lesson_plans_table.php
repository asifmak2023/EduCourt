<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('term_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('syllabus_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('objectives')->nullable();
            $table->text('content')->nullable();
            $table->text('resources')->nullable();
            $table->text('activities')->nullable();
            $table->text('assessment')->nullable();
            $table->date('planned_from')->nullable();
            $table->date('planned_to')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['class_room_id', 'subject_id', 'academic_year_id'], 'lesson_plans_scope_index');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_plans');
    }
};
