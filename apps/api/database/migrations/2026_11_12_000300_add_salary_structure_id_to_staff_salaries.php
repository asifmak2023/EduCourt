<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_salaries', function (Blueprint $table) {
            $table->foreignId('salary_structure_id')
                ->nullable()
                ->after('staff_member_id')
                ->constrained()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('staff_salaries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('salary_structure_id');
        });
    }
};
