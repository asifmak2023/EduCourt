<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\ClassRoom;
use App\Models\Section;
use Illuminate\Http\JsonResponse;

/**
 * Read-only reference lists used to populate select inputs (admission and
 * student forms). Exposed to admission/student readers so front-office staff
 * can pick a class without holding the academic.structure permission.
 */
class ReferenceDataController extends Controller
{
    use StampsAcademicTenant;

    public function academicOptions(): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $years = AcademicYear::query()
            ->where('campus_id', $tenant['campus_id'])
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->get(['id', 'name', 'code', 'status', 'is_current', 'starts_on', 'ends_on']);

        $classRooms = ClassRoom::query()
            ->where('campus_id', $tenant['campus_id'])
            ->where('is_active', true)
            ->orderBy('sequence')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'stage_id']);

        $sections = Section::query()
            ->where('campus_id', $tenant['campus_id'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'class_room_id', 'name']);

        return response()->json([
            'data' => [
                'academic_years' => $years,
                'class_rooms' => $classRooms,
                'sections' => $sections,
            ],
        ]);
    }
}
