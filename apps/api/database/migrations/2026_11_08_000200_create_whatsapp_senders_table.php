<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * WhatsApp business senders.
     *
     * A sender is either platform-owned (owner_institution_id = NULL) or
     * institution-owned. Credential management is independent (managed_by).
     * Institutions use a sender only through an explicit assignment in
     * integration_policies.whatsapp_sender_id.
     *
     * Uniqueness uses a stored generated column because MySQL 8 has no partial
     * indexes: soft-deleted rows collapse to NULL, so a fresh row may be
     * created after a delete without colliding.
     */
    public function up(): void
    {
        Schema::create('whatsapp_senders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_institution_id')->nullable()
                ->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('meta_app_connection_id')->nullable()
                ->constrained('meta_app_connections')->nullOnDelete();
            $table->string('managed_by', 16)->default('institution');
            $table->string('label', 100);
            $table->string('connection_mode', 24)->default('disabled');
            $table->string('phone_number_id', 64)->nullable();
            $table->string('business_account_id', 64)->nullable();
            $table->string('display_phone_number', 32)->nullable();
            $table->text('access_token')->nullable();
            $table->string('token_expiry_mode', 16)->default('unknown');
            $table->timestamp('token_expires_at')->nullable();
            $table->string('default_country_code', 4)->default('92');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_verified_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->string('active_unique', 96)->nullable()->storedAs(
                'CASE WHEN deleted_at IS NULL '.
                "THEN CONCAT(COALESCE(owner_institution_id, 0), ':', connection_mode, ':', COALESCE(phone_number_id, '')) ".
                'ELSE NULL END'
            );

            $table->unique('active_unique');
            $table->index(['owner_institution_id', 'is_active']);
            $table->index('phone_number_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_senders');
    }
};
