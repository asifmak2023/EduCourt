<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Institution-owned approved WhatsApp template mappings.
     *
     * Deferred to Phase D but mandatory before proactive (out-of-window)
     * WhatsApp delivery, which requires an approved template.
     */
    public function up(): void
    {
        Schema::create('integration_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('whatsapp_senders')->cascadeOnDelete();
            $table->string('purpose', 32);
            $table->string('name', 64);
            $table->string('language', 8);
            $table->string('approval_status', 16)->default('pending');
            $table->json('parameters')->nullable();
            $table->timestamps();

            $table->unique(['sender_id', 'name', 'language'], 'integration_templates_key');
            $table->index(['institution_id', 'purpose']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_templates');
    }
};
