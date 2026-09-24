<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Academic structure limits
    |--------------------------------------------------------------------------
    |
    | Guards applied when assigning teaching workload. These are soft workflow
    | limits, enforced in the API so a teacher is not over-allocated.
    |
    */

    'max_teacher_weekly_periods' => (int) env('ACADEMIC_MAX_TEACHER_WEEKLY_PERIODS', 40),
];
