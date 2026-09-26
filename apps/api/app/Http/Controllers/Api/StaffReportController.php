<?php

namespace App\Http\Controllers\Api;

use App\Enums\StaffStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Designation;
use App\Models\StaffMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffReportController extends Controller
{
    use StampsAcademicTenant;

    public function headcount(Request $request): JsonResponse
    {
        $asOn = $request->date('as_on')?->toDateString() ?? now()->toDateString();

        $employed = StaffMember::query()
            ->whereIn('status', array_map(fn (StaffStatus $s) => $s->value, array_filter(
                StaffStatus::cases(),
                fn (StaffStatus $s) => $s->isEmployed(),
            )))
            ->whereDate('joining_date', '<=', $asOn)
            ->where(fn ($q) => $q->whereNull('leaving_date')->orWhereDate('leaving_date', '>=', $asOn));

        $byDepartment = (clone $employed)
            ->select('department_id', DB::raw('count(*) as total'))
            ->groupBy('department_id')
            ->pluck('total', 'department_id');

        $byDesignation = (clone $employed)
            ->select('designation_id', DB::raw('count(*) as total'))
            ->groupBy('designation_id')
            ->pluck('total', 'designation_id');

        $departments = Department::query()->pluck('name', 'id');
        $designations = Designation::query()->pluck('name', 'id');

        return response()->json([
            'data' => [
                'as_on' => $asOn,
                'total' => (int) (clone $employed)->count(),
                'by_department' => $byDepartment->map(fn ($count, $id) => [
                    'department_id' => (int) $id,
                    'department' => $departments[$id] ?? 'Unassigned',
                    'total' => (int) $count,
                ])->values(),
                'by_designation' => $byDesignation->map(fn ($count, $id) => [
                    'designation_id' => (int) $id,
                    'designation' => $designations[$id] ?? 'Unassigned',
                    'total' => (int) $count,
                ])->values(),
                'by_status' => (clone $employed)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->pluck('total', 'status')
                    ->map(fn ($count, $status) => [
                        'status' => $status,
                        'total' => (int) $count,
                    ])->values(),
                'by_employment_type' => (clone $employed)
                    ->select('employment_type', DB::raw('count(*) as total'))
                    ->groupBy('employment_type')
                    ->pluck('total', 'employment_type')
                    ->map(fn ($count, $type) => [
                        'employment_type' => $type,
                        'total' => (int) $count,
                    ])->values(),
            ],
        ]);
    }

    public function joinersLeavers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $base = StaffMember::query();

        $joiners = (clone $base)
            ->whereDate('joining_date', '>=', $data['from'])
            ->whereDate('joining_date', '<=', $data['to'])
            ->with(['department', 'designation'])
            ->orderBy('joining_date')
            ->get();

        $leavers = (clone $base)
            ->whereNotNull('leaving_date')
            ->whereDate('leaving_date', '>=', $data['from'])
            ->whereDate('leaving_date', '<=', $data['to'])
            ->with(['department', 'designation'])
            ->orderBy('leaving_date')
            ->get();

        $summarise = fn ($members) => $members->map(fn (StaffMember $m) => [
            'id' => $m->id,
            'employee_no' => $m->employee_no,
            'name' => $m->fullName(),
            'department' => $m->department?->name,
            'designation' => $m->designation?->name,
            'date' => ($m->leaving_date ?? $m->joining_date)?->toDateString(),
        ])->values();

        return response()->json([
            'data' => [
                'from' => $data['from'],
                'to' => $data['to'],
                'joiners' => $summarise($joiners),
                'leavers' => $summarise($leavers),
            ],
        ]);
    }
}
