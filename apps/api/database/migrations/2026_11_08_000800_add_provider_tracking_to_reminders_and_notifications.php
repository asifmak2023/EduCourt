<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Provider tracking on the two records that can be delivered over WhatsApp.
     */
    public function up(): void
    {
        Schema::table('fee_reminders', function (Blueprint $table) {
            $table->string('provider_message_id', 128)->nullable()->after('failure_reason');
            $table->string('provider_status', 32)->nullable()->after('provider_message_id');
        });

        Schema::table('app_notifications', function (Blueprint $table) {
            $table->string('provider_message_id', 128)->nullable()->after('status');
            $table->string('provider_status', 32)->nullable()->after('provider_message_id');
        });
    }

    public function down(): void
    {
        Schema::table('fee_reminders', function (Blueprint $table) {
            $table->dropColumn(['provider_message_id', 'provider_status']);
        });

        Schema::table('app_notifications', function (Blueprint $table) {
            $table->dropColumn(['provider_message_id', 'provider_status']);
        });
    }
};
