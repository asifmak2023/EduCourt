<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Guardian WhatsApp consent, scoped by business identity and message
     * category. A phone number alone is not consent: rows without evidence stay
     * pending and are blocked from proactive messaging.
     */
    public function up(): void
    {
        Schema::create('whatsapp_consents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('business_account_id', 64);
            $table->string('phone', 32);
            $table->string('message_category', 24);
            $table->string('status', 16)->default('pending');
            $table->string('source', 48)->nullable();
            $table->string('consent_version', 16)->nullable();
            $table->string('evidence_ref', 191)->nullable();
            $table->timestamp('opted_in_at')->nullable();
            $table->timestamp('opted_out_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['institution_id', 'business_account_id', 'phone', 'message_category'],
                'whatsapp_consents_key'
            );
            $table->index(['institution_id', 'phone']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_consents');
    }
};
