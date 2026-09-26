<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('reference_no');
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('raised_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('against')->nullable();
            $table->string('category', 64)->nullable();
            $table->string('subject');
            $table->text('description');
            $table->string('priority', 16)->default('medium');
            $table->string('status', 24)->default('open');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'reference_no']);
            $table->index(['campus_id', 'status']);
        });

        Schema::create('counselling_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('counsellor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('session_date');
            $table->string('type', 32)->default('individual');
            $table->string('status', 24)->default('scheduled');
            $table->text('summary')->nullable();
            $table->text('confidential_notes')->nullable();
            $table->date('follow_up_on')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counselling_sessions');
        Schema::dropIfExists('complaints');
    }
};
