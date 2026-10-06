<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('enrollment_id')->nullable()->constrained('student_enrollments')->nullOnDelete();
            $table->foreignId('class_room_id')->nullable()->constrained('class_rooms')->nullOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->foreignId('fee_structure_item_id')->nullable()->constrained('fee_structure_items')->nullOnDelete();
            $table->foreignId('fee_head_id')->nullable()->constrained('fee_heads')->nullOnDelete();
            $table->string('voucher_no', 32);
            $table->string('billing_kind', 32);
            $table->string('exam_term', 32)->nullable();
            $table->unsignedSmallInteger('period_year');
            $table->unsignedTinyInteger('period_month')->nullable();
            $table->string('title')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->date('due_date');
            $table->string('status', 32)->default('unpaid');
            $table->string('source', 32)->default('structure');
            $table->text('notes')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['campus_id', 'voucher_no']);
            $table->unique(
                ['campus_id', 'student_id', 'billing_kind', 'exam_term', 'period_year', 'period_month', 'fee_structure_item_id'],
                'fee_charges_dup_guard_unique'
            );
            $table->index(['campus_id', 'student_id', 'status'], 'fee_charges_campus_student_status_idx');
            $table->index(['campus_id', 'status', 'due_date'], 'fee_charges_campus_status_due_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_charges');
    }
};
