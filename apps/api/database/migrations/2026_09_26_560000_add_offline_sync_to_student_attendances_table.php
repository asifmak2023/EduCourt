<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Offline capture metadata so mobile attendance records can be synced
     * idempotently and conflicts with online edits can be resolved.
     */
    public function up(): void
    {
        Schema::table('student_attendances', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique()->after('marked_by');
            $table->string('source', 16)->default('online')->after('client_uuid');
            $table->string('device_id', 100)->nullable()->after('source');
            $table->timestamp('captured_at')->nullable()->after('device_id');
            $table->timestamp('synced_at')->nullable()->after('captured_at');
        });
    }

    public function down(): void
    {
        Schema::table('student_attendances', function (Blueprint $table) {
            $table->dropUnique(['client_uuid']);
            $table->dropColumn(['client_uuid', 'source', 'device_id', 'captured_at', 'synced_at']);
        });
    }
};
