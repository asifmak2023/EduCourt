<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('application_no');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('gender')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->foreignId('class_room_id')->nullable()->constrained('class_rooms')->nullOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained('academic_years')->nullOnDelete();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->string('guardian_email')->nullable();
            $table->string('guardian_relation')->nullable();
            $table->string('previous_school')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('status')->default('enquiry');
            $table->date('applied_on');
            $table->date('decided_on')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'application_no']);
            $table->index(['campus_id', 'status']);
            $table->index(['campus_id', 'applied_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admissions');
    }
};
