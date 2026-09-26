<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('employee_no', 32);
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('gender', 16)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('cnic', 32)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 32)->nullable();
            $table->string('employment_type', 32)->default('permanent');
            $table->string('status', 32)->default('active');
            $table->date('joining_date');
            $table->date('leaving_date')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('bank_account_no', 64)->nullable();
            $table->string('tax_number', 32)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'employee_no']);
            $table->unique('user_id');
            $table->index(['campus_id', 'status']);
            $table->index(['campus_id', 'department_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_members');
    }
};
