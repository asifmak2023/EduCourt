<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AcademicYearResource;
use App\Models\AcademicYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AcademicYearController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AcademicYear::query()
            ->with('terms')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->has('is_current'), fn ($q) => $q->where('is_current', $request->boolean('is_current')))
            ->when($request->string('search')->toString() !== '', fn ($q) => $q->where(function ($inner) use ($request) {
                $search = $request->string('search')->toString();
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->orderByDesc('starts_on');

        return AcademicYearResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'code' => [
                'required', 'string', 'max:32',
                Rule::unique('academic_years', 'code')->where('campus_id', $tenant['campus_id']),
            ],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after:starts_on'],
            'status' => ['sometimes', Rule::in(['draft', 'active', 'closed'])],
            'is_current' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $data += $tenant;

        $year = AcademicYear::create($data);

        if ($year->is_current) {
            $this->clearOtherCurrent($year);
        }

        return (new AcademicYearResource($year->load('terms')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(AcademicYear $academicYear): AcademicYearResource
    {
        return new AcademicYearResource($academicYear->load('terms'));
    }

    public function update(Request $request, AcademicYear $academicYear): AcademicYearResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:64'],
            'code' => [
                'sometimes', 'string', 'max:32',
                Rule::unique('academic_years', 'code')
                    ->where('campus_id', $academicYear->campus_id)
                    ->ignore($academicYear->id),
            ],
            'starts_on' => ['sometimes', 'date'],
            'ends_on' => ['sometimes', 'date', 'after:starts_on'],
            'status' => ['sometimes', Rule::in(['draft', 'active', 'closed'])],
            'is_current' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $academicYear->update($data);

        if ($academicYear->is_current) {
            $this->clearOtherCurrent($academicYear);
        }

        return new AcademicYearResource($academicYear->load('terms'));
    }

    public function destroy(AcademicYear $academicYear): JsonResponse
    {
        $academicYear->delete();

        return response()->json(['message' => 'Academic year archived.']);
    }

    private function clearOtherCurrent(AcademicYear $year): void
    {
        AcademicYear::query()
            ->where('campus_id', $year->campus_id)
            ->whereKeyNot($year->id)
            ->where('is_current', true)
            ->update(['is_current' => false]);
    }
}
