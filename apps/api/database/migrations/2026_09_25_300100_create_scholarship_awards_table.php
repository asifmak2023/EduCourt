<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scholarship_awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scholarship_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained('academic_years')->nullOnDelete();
            $table->date('awarded_on');
            $table->string('status')->default('active');
            $table->decimal('value_override', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('revoked_on')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['scholarship_id', 'student_id', 'academic_year_id'], 'scholarship_award_unique');
            $table->index(['campus_id', 'student_id', 'status'], 'scholarship_award_student_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarship_awards');
    }
};
