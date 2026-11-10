<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Campus-owned WhatsApp senders.
     *
     * A sender may now be owned by an institution (campus NULL) or by a single
     * campus (owner_campus_id set). Each campus keeps its own number and
     * credentials; the institution sender remains available as an explicit
     * fallback only when a campus has no sender of its own.
     *
     * Uniqueness is re-derived so two campuses of the same institution can hold
     * distinct numbers, while an institution-level sender and a campus sender
     * never collide.
     */
    public function up(): void
    {
        Schema::table('whatsapp_senders', function (Blueprint $table) {
            $table->dropUnique(['active_unique']);
            $table->dropColumn('active_unique');
        });

        Schema::table('whatsapp_senders', function (Blueprint $table) {
            // MySQL 8 rejects SET NULL / CASCADE on a column that feeds a
            // stored generated column, so this FK is RESTRICT (same as the
            // institution FK). Campuses are soft-deleted in practice.
            $table->foreignId('owner_campus_id')->nullable()->after('owner_institution_id')
                ->constrained('campuses');

            $table->string('active_unique', 128)->nullable()->storedAs(
                'CASE WHEN deleted_at IS NULL '.
                "THEN CONCAT(COALESCE(owner_institution_id, 0), ':', COALESCE(owner_campus_id, 0), ':', connection_mode, ':', COALESCE(phone_number_id, '')) ".
                'ELSE NULL END'
            );

            $table->unique('active_unique');
            $table->index(['owner_campus_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_senders', function (Blueprint $table) {
            $table->dropUnique(['active_unique']);
            $table->dropColumn('active_unique');
            $table->dropConstrainedForeignId('owner_campus_id');
        });

        Schema::table('whatsapp_senders', function (Blueprint $table) {
            $table->string('active_unique', 96)->nullable()->storedAs(
                'CASE WHEN deleted_at IS NULL '.
                "THEN CONCAT(COALESCE(owner_institution_id, 0), ':', connection_mode, ':', COALESCE(phone_number_id, '')) ".
                'ELSE NULL END'
            );

            $table->unique('active_unique');
        });
    }
};
