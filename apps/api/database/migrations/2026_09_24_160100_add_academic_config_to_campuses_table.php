<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Campus-level academic configuration so the platform can be moulded to a
     * school term system or a college/university semester and credit system.
     */
    public function up(): void
    {
        Schema::table('campuses', function (Blueprint $table) {
            $table->string('academic_model')->default('school')->after('type');
            $table->string('term_system')->default('terms')->after('academic_model');
            $table->string('grading_system')->default('percentage')->after('term_system');
            $table->boolean('credit_hours_enabled')->default(false)->after('grading_system');
        });
    }

    public function down(): void
    {
        Schema::table('campuses', function (Blueprint $table) {
            $table->dropColumn([
                'academic_model', 'term_system', 'grading_system', 'credit_hours_enabled',
            ]);
        });
    }
};
