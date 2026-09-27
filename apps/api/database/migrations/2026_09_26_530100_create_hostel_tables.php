<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hostels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 32);
            $table->string('type', 16)->default('boys');
            $table->foreignId('warden_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('warden_name')->nullable();
            $table->string('warden_phone', 32)->nullable();
            $table->string('address')->nullable();
            $table->unsignedInteger('capacity')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'code']);
        });

        Schema::create('hostel_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hostel_id')->constrained('hostels')->cascadeOnDelete();
            $table->string('room_no', 32);
            $table->string('floor')->nullable();
            $table->string('type', 16)->default('double');
            $table->unsignedInteger('capacity')->default(1);
            $table->unsignedInteger('occupied')->default(0);
            $table->decimal('monthly_fee', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hostel_id', 'room_no']);
            $table->index(['campus_id', 'hostel_id']);
        });

        Schema::create('hostel_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hostel_id')->constrained('hostels')->cascadeOnDelete();
            $table->foreignId('hostel_room_id')->constrained('hostel_rooms')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('bed_no', 32)->nullable();
            $table->date('allocated_on');
            $table->date('vacated_on')->nullable();
            $table->decimal('monthly_fee', 12, 2)->default(0);
            $table->string('status', 16)->default('allocated');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'student_id']);
            $table->index(['campus_id', 'hostel_room_id']);
        });

        Schema::create('hostel_outpasses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hostel_allocation_id')->nullable()->constrained('hostel_allocations')->nullOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->dateTime('from_datetime');
            $table->dateTime('to_datetime');
            $table->string('reason');
            $table->string('status', 16)->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'status']);
            $table->index(['campus_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hostel_outpasses');
        Schema::dropIfExists('hostel_allocations');
        Schema::dropIfExists('hostel_rooms');
        Schema::dropIfExists('hostels');
    }
};
