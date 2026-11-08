<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Quota lifecycle and cost accounting for outbound WhatsApp messages.
     *
     * quota_status tracks EduCourt's own allowance (reserved/consumed/released).
     * estimated_cost is a rate-card forecast; billed_cost only ever comes from a
     * provider billing import. delivery_intent_key stays stable across retries
     * while attempt_number increments, so a timeout-and-retry cannot count twice
     * or send twice under the same logical intent.
     */
    public function up(): void
    {
        Schema::create('whatsapp_usage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->nullable()->constrained('whatsapp_senders')->nullOnDelete();
            $table->foreignId('reminder_id')->nullable()->constrained('fee_reminders')->nullOnDelete();
            $table->foreignId('notification_id')->nullable()->constrained('app_notifications')->nullOnDelete();
            $table->string('delivery_intent_key', 96);
            $table->unsignedInteger('attempt_number')->default(1);
            $table->string('idempotency_key', 128)->unique();
            $table->string('provider_message_id', 128)->nullable();
            $table->string('message_category', 24)->default('utility');
            $table->string('quota_status', 16)->default('reserved');
            $table->string('delivery_status', 32)->default('queued');
            $table->string('recipient', 32);
            $table->foreignId('rate_card_id')->nullable()->constrained('whatsapp_rate_cards')->nullOnDelete();
            $table->decimal('estimated_cost', 12, 6)->nullable();
            $table->string('estimated_currency', 3)->nullable();
            $table->decimal('billed_cost', 12, 6)->nullable();
            $table->string('billed_currency', 3)->nullable();
            $table->string('period', 7);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index(['institution_id', 'period', 'quota_status'], 'whatsapp_usage_quota_idx');
            $table->index('delivery_intent_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_usage');
    }
};
