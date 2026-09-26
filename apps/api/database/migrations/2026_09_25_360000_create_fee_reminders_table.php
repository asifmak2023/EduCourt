<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained('academic_years')->nullOnDelete();
            $table->foreignId('guardian_id')->nullable()->constrained('guardians')->nullOnDelete();
            $table->string('channel')->default('email');
            $table->string('recipient_name')->nullable();
            $table->string('recipient_email')->nullable();
            $table->string('recipient_phone')->nullable();
            $table->decimal('outstanding', 12, 2)->default(0);
            $table->string('bucket')->default('current');
            $table->date('oldest_due_date')->nullable();
            $table->unsignedInteger('days_overdue')->default(0);
            $table->text('message');
            $table->string('status')->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->string('failure_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'status']);
            $table->index(['student_id', 'status']);
            $table->index(['campus_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_reminders');
    }
};
