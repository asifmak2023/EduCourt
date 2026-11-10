<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Messaging audiences: campus "groups" and "broadcast lists".
     *
     * The Meta Cloud API has no native groups or broadcast lists, so EduCourt
     * models them as audiences that resolve to individual recipients and fan
     * out through the existing per-recipient delivery engine (consent, quota and
     * template rules still apply to every message).
     *
     * A campus may own audiences; institution-wide audiences use campus_id NULL
     * and are visible to every campus for reporting.
     */
    public function up(): void
    {
        Schema::create('messaging_audiences', function (Blueprint $table) {
            $table->id();
            // These FKs feed the stored generated uniqueness column below, so
            // MySQL 8 rejects CASCADE/SET NULL on them (error 1901). Institutions
            // and campuses are soft-deleted in practice; a hard delete must be a
            // deliberate, reviewed act, hence RESTRICT.
            $table->foreignId('institution_id')->constrained();
            $table->foreignId('campus_id')->nullable()->constrained();
            $table->string('kind', 16)->default('broadcast');
            $table->string('name', 120);
            $table->string('description', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Soft-deleted audiences collapse to NULL so a name can be reused
            // after deletion; the campus id is coalesced so institution-wide and
            // campus audiences never collide on the same name.
            $table->string('active_unique', 191)->nullable()->storedAs(
                'CASE WHEN deleted_at IS NULL '.
                "THEN CONCAT(COALESCE(institution_id, 0), ':', COALESCE(campus_id, 0), ':', kind, ':', name) ".
                'ELSE NULL END'
            );

            $table->unique('active_unique');
            $table->index(['institution_id', 'campus_id', 'kind']);
        });

        Schema::create('messaging_audience_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audience_id')->constrained('messaging_audiences')->cascadeOnDelete();
            $table->string('member_type', 16);
            $table->unsignedBigInteger('member_id')->nullable();
            $table->string('display_name', 120)->nullable();
            $table->string('phone', 32)->nullable();
            $table->timestamps();

            $table->unique(['audience_id', 'member_type', 'member_id'], 'messaging_member_unique');
            $table->index(['audience_id', 'phone']);
        });

        Schema::create('messaging_audience_segments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audience_id')->constrained('messaging_audiences')->cascadeOnDelete();
            $table->string('segment_type', 16);
            $table->unsignedBigInteger('segment_ref')->nullable();
            $table->string('segment_value', 64)->nullable();
            $table->timestamps();

            $table->index(['audience_id', 'segment_type']);
        });

        Schema::create('messaging_broadcasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('audience_id')->nullable()->constrained('messaging_audiences')->nullOnDelete();
            $table->string('title', 160);
            $table->text('body');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('recipients_total')->default(0);
            $table->unsignedInteger('recipients_sent')->default(0);
            $table->unsignedInteger('recipients_failed')->default(0);
            $table->string('status', 16)->default('queued');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['institution_id', 'campus_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messaging_broadcasts');
        Schema::dropIfExists('messaging_audience_segments');
        Schema::dropIfExists('messaging_audience_members');
        Schema::dropIfExists('messaging_audiences');
    }
};
