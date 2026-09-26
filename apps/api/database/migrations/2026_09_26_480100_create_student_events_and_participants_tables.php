<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('type', 64)->nullable();
            $table->text('description')->nullable();
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->string('venue')->nullable();
            $table->decimal('budget', 14, 2)->nullable();
            $table->string('status', 24)->default('planned');
            $table->foreignId('organizer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'starts_on']);
        });

        Schema::create('event_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('role', 64)->nullable();
            $table->string('status', 24)->default('registered');
            $table->string('position')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['student_event_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_participants');
        Schema::dropIfExists('student_events');
    }
};
