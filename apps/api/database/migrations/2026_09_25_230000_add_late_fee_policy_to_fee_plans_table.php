<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_plans', function (Blueprint $table) {
            $table->string('late_fee_type')->default('none')->after('is_active');
            $table->decimal('late_fee_amount', 15, 2)->default(0)->after('late_fee_type');
            $table->unsignedSmallInteger('late_fee_grace_days')->default(0)->after('late_fee_amount');
        });
    }

    public function down(): void
    {
        Schema::table('fee_plans', function (Blueprint $table) {
            $table->dropColumn(['late_fee_type', 'late_fee_amount', 'late_fee_grace_days']);
        });
    }
};
