<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Provider events (inbound messages and delivery receipts).
     *
     * integration_id plus contact_wa_id make the WhatsApp 24-hour customer
     * service window specific to the sender AND recipient, so two institutions
     * never share a window for the same guardian phone number. Message bodies
     * are not retained; only the metadata needed for windows and receipts.
     */
    public function up(): void
    {
        Schema::create('whatsapp_message_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_id')->constrained('whatsapp_senders')->cascadeOnDelete();
            $table->foreignId('institution_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('contact_wa_id', 32);
            $table->string('provider_message_id', 128)->nullable();
            $table->string('direction', 8);
            $table->string('event', 32);
            $table->json('event_meta')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->unique(
                ['integration_id', 'provider_message_id', 'event', 'occurred_at'],
                'whatsapp_message_events_key'
            );
            $table->index(['integration_id', 'contact_wa_id', 'direction', 'occurred_at'], 'wa_events_window_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_message_events');
    }
};
