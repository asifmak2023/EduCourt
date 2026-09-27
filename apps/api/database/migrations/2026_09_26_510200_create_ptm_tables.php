<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ptm_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('event_date');
            $table->string('venue')->nullable();
            $table->string('status', 32)->default('scheduled');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'event_date']);
        });

        Schema::create('ptm_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ptm_event_id')->constrained('ptm_events')->cascadeOnDelete();
            $table->foreignId('teacher_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('capacity')->default(1);
            $table->unsignedInteger('booked')->default(0);
            $table->string('room')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'ptm_event_id']);
        });

        Schema::create('ptm_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ptm_slot_id')->constrained('ptm_slots')->cascadeOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->string('guardian_name');
            $table->string('guardian_phone', 32)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 32)->default('booked');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'ptm_slot_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ptm_bookings');
        Schema::dropIfExists('ptm_slots');
        Schema::dropIfExists('ptm_events');
    }
};
