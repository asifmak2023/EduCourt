<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Receipt for each offline attendance sync so devices can reconcile and
     * administrators can audit what was uploaded.
     */
    public function up(): void
    {
        Schema::create('attendance_sync_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('client_batch_uuid')->nullable()->unique();
            $table->string('device_id', 100)->nullable();
            $table->unsignedInteger('total_records')->default(0);
            $table->unsignedInteger('applied_count')->default(0);
            $table->unsignedInteger('duplicate_count')->default(0);
            $table->unsignedInteger('conflict_count')->default(0);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->index(['campus_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sync_batches');
    }
};
