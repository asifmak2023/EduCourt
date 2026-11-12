<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salary_structures', function (Blueprint $table) {
            $table->unsignedInteger('version')->default(1)->after('name');
            $table->foreignId('superseded_by_id')
                ->nullable()
                ->after('version')
                ->constrained('salary_structures')
                ->nullOnDelete();
            $table->string('increment_type', 16)->nullable()->after('is_active');
            $table->decimal('increment_value', 12, 2)->nullable()->after('increment_type');
            $table->unsignedTinyInteger('increment_every_months')->nullable()->after('increment_value');

            $table->index(['campus_id', 'designation_id', 'version'], 'salary_structures_designation_version_idx');
        });
    }

    public function down(): void
    {
        Schema::table('salary_structures', function (Blueprint $table) {
            $table->dropIndex('salary_structures_designation_version_idx');
            $table->dropConstrainedForeignId('superseded_by_id');
            $table->dropColumn(['version', 'increment_type', 'increment_value', 'increment_every_months']);
        });
    }
};
