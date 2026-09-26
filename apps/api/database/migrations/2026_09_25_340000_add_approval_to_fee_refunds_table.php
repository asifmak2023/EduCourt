<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_refunds', function (Blueprint $table) {
            $table->string('approval_status')->default('pending')->after('status');
            $table->foreignId('requested_by')->nullable()->after('approval_status')->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->after('requested_by')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('decision_note')->nullable()->after('approved_at');

            $table->index(['campus_id', 'approval_status'], 'fr_campus_approval_idx');
        });
    }

    public function down(): void
    {
        Schema::table('fee_refunds', function (Blueprint $table) {
            $table->dropIndex('fr_campus_approval_idx');
            $table->dropConstrainedForeignId('requested_by');
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn(['approval_status', 'approved_at', 'decision_note']);
        });
    }
};
