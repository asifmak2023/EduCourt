<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Meta application identity for WhatsApp Cloud API webhooks.
     *
     * Holds application-level credentials only (app id, app secret, webhook
     * verify token). Business senders (phone number id, WABA id, access token)
     * live in whatsapp_senders: one Meta app can serve many senders.
     */
    public function up(): void
    {
        Schema::create('meta_app_connections', function (Blueprint $table) {
            $table->id();
            $table->string('app_key', 64)->unique();
            $table->string('app_id', 64);
            $table->text('app_secret');
            $table->text('verify_token');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_app_connections');
    }
};
