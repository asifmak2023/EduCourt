<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_marks', function (Blueprint $table) {
            $table->decimal('original_marks_obtained', 8, 2)->nullable()->after('marks_obtained');
            $table->decimal('moderated_marks_obtained', 8, 2)->nullable()->after('original_marks_obtained');
            $table->string('moderation_source', 32)->nullable()->after('moderated_marks_obtained');
        });
    }

    public function down(): void
    {
        Schema::table('exam_marks', function (Blueprint $table) {
            $table->dropColumn(['original_marks_obtained', 'moderated_marks_obtained', 'moderation_source']);
        });
    }
};
