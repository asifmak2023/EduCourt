<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-institution messaging policy.
     *
     * Kept separate from senders so policy exists even before an institution
     * configures anything. whatsapp_sender_id is the explicit assignment: when
     * null the institution may not send (there is no implicit fallback).
     */
    public function up(): void
    {
        Schema::create('integration_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('whatsapp_allowed')->default(true);
            $table->boolean('whatsapp_self_service')->default(false);
            $table->foreignId('whatsapp_sender_id')->nullable()
                ->constrained('whatsapp_senders')->nullOnDelete();
            $table->unsignedInteger('monthly_message_limit')->nullable();
            $table->unsignedTinyInteger('warn_at_percent')->default(80);
            $table->string('quota_timezone', 64)->default('Asia/Karachi');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_policies');
    }
};
