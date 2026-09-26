<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('type', 64);
            $table->string('title');
            $table->string('serial_no')->nullable();
            $table->date('issued_on')->nullable();
            $table->string('status', 24)->default('pending');
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'status']);
        });

        Schema::create('welfare_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('type', 24)->default('welfare');
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('recorded_on');
            $table->string('status', 24)->default('open');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('follow_up')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'recorded_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('welfare_records');
        Schema::dropIfExists('student_certificates');
    }
};
