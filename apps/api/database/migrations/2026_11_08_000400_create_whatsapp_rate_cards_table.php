<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only rate card snapshots used to estimate WhatsApp costs.
     *
     * Estimates are forecasts, never billed amounts. Rows are never updated in
     * place so historical estimates stay explainable.
     */
    public function up(): void
    {
        Schema::create('whatsapp_rate_cards', function (Blueprint $table) {
            $table->id();
            $table->string('market', 8);
            $table->string('message_category', 24);
            $table->string('currency', 3);
            $table->decimal('unit_price', 12, 6);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->string('source_note', 191)->nullable();
            $table->timestamps();

            $table->unique(['market', 'message_category', 'effective_from'], 'whatsapp_rate_cards_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_rate_cards');
    }
};
