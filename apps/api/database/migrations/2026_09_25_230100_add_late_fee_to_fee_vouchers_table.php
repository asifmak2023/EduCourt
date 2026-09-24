<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_vouchers', function (Blueprint $table) {
            $table->decimal('late_fee_amount', 15, 2)->default(0)->after('paid_amount');
            $table->timestamp('late_fee_applied_at')->nullable()->after('late_fee_amount');
        });
    }

    public function down(): void
    {
        Schema::table('fee_vouchers', function (Blueprint $table) {
            $table->dropColumn(['late_fee_amount', 'late_fee_applied_at']);
        });
    }
};
