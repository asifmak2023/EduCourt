<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-campus messaging policy.
     *
     * The institution policy remains the tenant-wide kill-switch and master
     * quota. A campus policy adds a campus-level sender assignment, an optional
     * per-campus monthly cap and a self-service toggle for that campus admin.
     *
     * Sending resolution for a campus context is:
     *   1. institution policy allowed (kill-switch)
     *   2. campus whatsapp_sender_id (explicit campus sender) when assigned+ready
     *   3. institution whatsapp_sender_id (explicit institution fallback)
     *   4. otherwise fail closed
     */
    public function up(): void
    {
        Schema::create('campus_integration_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('whatsapp_enabled')->default(true);
            $table->boolean('whatsapp_self_service')->default(false);
            $table->foreignId('whatsapp_sender_id')->nullable()
                ->constrained('whatsapp_senders')->nullOnDelete();
            $table->unsignedInteger('monthly_message_limit')->nullable();
            $table->timestamps();

            $table->index(['institution_id', 'campus_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campus_integration_policies');
    }
};
