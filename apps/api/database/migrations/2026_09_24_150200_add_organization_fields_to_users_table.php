<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('institution_id')->nullable()->after('id')
                ->constrained()->nullOnDelete();
            $table->foreignId('campus_id')->nullable()->after('institution_id')
                ->constrained()->nullOnDelete();
            $table->string('phone')->nullable()->after('email');
            $table->string('employee_code')->nullable()->after('phone');
            $table->string('job_title')->nullable()->after('employee_code');
            $table->boolean('is_active')->default(true)->after('job_title');
            $table->text('two_factor_secret')->nullable()->after('is_active');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
            $table->timestamp('last_login_at')->nullable()->after('two_factor_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('institution_id');
            $table->dropConstrainedForeignId('campus_id');
            $table->dropColumn([
                'phone', 'employee_code', 'job_title', 'is_active',
                'two_factor_secret', 'two_factor_recovery_codes',
                'two_factor_confirmed_at', 'last_login_at',
            ]);
        });
    }
};
