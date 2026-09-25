<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('substitute_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('timetable_slot_id')->constrained()->cascadeOnDelete();
            $table->foreignId('substitute_user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->string('status')->default('scheduled');
            $table->text('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['timetable_slot_id', 'date']);
            $table->index(['campus_id', 'date', 'status'], 'substitute_campus_date_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('substitute_assignments');
    }
};
