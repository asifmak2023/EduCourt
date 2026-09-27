<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('helpdesk_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('ticket_no', 64);
            $table->string('subject');
            $table->text('description');
            $table->string('category', 48)->default('other');
            $table->string('priority', 16)->default('medium');
            $table->string('status', 24)->default('open');
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('it_asset_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('sla_due_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('resolution')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'ticket_no']);
            $table->index(['campus_id', 'status']);
            $table->index(['campus_id', 'sla_due_at']);
        });

        Schema::create('helpdesk_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('helpdesk_ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->boolean('is_internal')->default(false);
            $table->timestamps();

            $table->index(['campus_id', 'helpdesk_ticket_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('helpdesk_comments');
        Schema::dropIfExists('helpdesk_tickets');
    }
};
