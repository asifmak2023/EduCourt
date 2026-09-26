<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_papers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->date('exam_date');
            $table->time('starts_at')->nullable();
            $table->time('ends_at')->nullable();
            $table->decimal('max_marks', 6, 2)->default(100);
            $table->decimal('pass_marks', 6, 2)->default(33);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['exam_id', 'class_room_id', 'subject_id'], 'exam_papers_unique_slot');
            $table->index(['campus_id', 'exam_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_papers');
    }
};
