<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scholarship_awards', function (Blueprint $table) {
            $table->date('starts_on')->nullable()->after('awarded_on');
            $table->date('ends_on')->nullable()->after('starts_on');
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            DB::statement('
                UPDATE scholarship_awards
                SET starts_on = awarded_on
                WHERE starts_on IS NULL
            ');
            DB::statement('
                UPDATE scholarship_awards
                SET ends_on = COALESCE(
                    (
                        SELECT academic_years.ends_on
                        FROM academic_years
                        WHERE academic_years.id = scholarship_awards.academic_year_id
                    ),
                    awarded_on
                )
                WHERE ends_on IS NULL
            ');

            return;
        }

        DB::statement('
            UPDATE scholarship_awards
            SET starts_on = awarded_on
            WHERE starts_on IS NULL
        ');
        DB::statement('
            UPDATE scholarship_awards AS awards
            LEFT JOIN academic_years AS years ON years.id = awards.academic_year_id
            SET awards.ends_on = COALESCE(years.ends_on, awards.awarded_on)
            WHERE awards.ends_on IS NULL
        ');
    }

    public function down(): void
    {
        Schema::table('scholarship_awards', function (Blueprint $table) {
            $table->dropColumn(['starts_on', 'ends_on']);
        });
    }
};
