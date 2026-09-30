<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Attendance rows recorded without an explicit class (for example from the
     * single-record endpoint) were left with a null class_room_id, which the
     * attendance reports rendered as "Class #null". Backfill the class, section
     * and academic year from each student's current active enrollment.
     */
    public function up(): void
    {
        DB::table('student_attendances')
            ->whereNull('class_room_id')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $enrollment = DB::table('student_enrollments')
                        ->where('student_id', $row->student_id)
                        ->where('status', 'active')
                        ->whereNull('deleted_at')
                        ->orderByDesc('starts_on')
                        ->orderByDesc('id')
                        ->first();

                    if ($enrollment === null) {
                        continue;
                    }

                    DB::table('student_attendances')->where('id', $row->id)->update([
                        'class_room_id' => $enrollment->class_room_id,
                        'section_id' => $row->section_id ?? $enrollment->section_id,
                        'academic_year_id' => $row->academic_year_id ?? $enrollment->academic_year_id,
                    ]);
                }
            });
    }

    public function down(): void
    {
        //
    }
};
