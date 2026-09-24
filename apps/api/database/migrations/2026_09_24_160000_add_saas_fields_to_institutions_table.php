<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->string('plan')->default('standard')->after('is_active');
            $table->string('status')->default('active')->after('plan');
            $table->timestamp('trial_ends_at')->nullable()->after('status');
            $table->unsignedInteger('max_campuses')->nullable()->after('trial_ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->dropColumn(['plan', 'status', 'trial_ends_at', 'max_campuses']);
        });
    }
};
