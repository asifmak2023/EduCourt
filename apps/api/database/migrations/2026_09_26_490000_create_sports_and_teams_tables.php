<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 32);
            $table->string('category', 32)->default('outdoor');
            $table->string('season', 32)->nullable();
            $table->foreignId('coach_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('min_age_years')->nullable();
            $table->unsignedSmallInteger('max_age_years')->nullable();
            $table->decimal('min_attendance_percent', 5, 2)->nullable();
            $table->decimal('budget', 14, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('rules')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'code']);
        });

        Schema::create('sport_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('age_group', 32)->nullable();
            $table->string('gender', 16)->nullable();
            $table->foreignId('coach_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'sport_id']);
        });

        Schema::create('sport_team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('position', 64)->nullable();
            $table->string('jersey_no', 16)->nullable();
            $table->date('joined_on')->nullable();
            $table->string('status', 24)->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['sport_team_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sport_team_members');
        Schema::dropIfExists('sport_teams');
        Schema::dropIfExists('sports');
    }
};
