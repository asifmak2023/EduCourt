<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sport_training_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_team_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->date('session_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('venue')->nullable();
            $table->text('focus')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'session_date']);
        });

        Schema::create('sport_fixtures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('opponent');
            $table->string('home_away', 8)->default('home');
            $table->string('venue')->nullable();
            $table->date('fixture_date');
            $table->time('start_time')->nullable();
            $table->string('status', 24)->default('scheduled');
            $table->unsignedInteger('our_score')->nullable();
            $table->unsignedInteger('opponent_score')->nullable();
            $table->string('outcome', 8)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'fixture_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sport_fixtures');
        Schema::dropIfExists('sport_training_sessions');
    }
};
