<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FiscalYearResource;
use App\Models\FiscalYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class FiscalYearController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $years = FiscalYear::query()
            ->when($request->has('is_current'), fn ($q) => $q->where('is_current', $request->boolean('is_current')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('starts_on')
            ->paginate($request->integer('per_page', 25));

        return FiscalYearResource::collection($years);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'code' => [
                'required', 'string', 'max:32',
                Rule::unique('fiscal_years', 'code')->where('campus_id', $tenant['campus_id']),
            ],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after:starts_on'],
            'status' => ['sometimes', Rule::in(['open', 'closed'])],
            'is_current' => ['sometimes', 'boolean'],
        ]);

        $data += $tenant;

        $year = FiscalYear::create($data);

        if ($year->is_current) {
            $this->clearOtherCurrent($year);
        }

        return (new FiscalYearResource($year))->response()->setStatusCode(201);
    }

    public function show(FiscalYear $fiscalYear): FiscalYearResource
    {
        return new FiscalYearResource($fiscalYear);
    }

    public function update(Request $request, FiscalYear $fiscalYear): FiscalYearResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:64'],
            'code' => [
                'sometimes', 'string', 'max:32',
                Rule::unique('fiscal_years', 'code')
                    ->where('campus_id', $fiscalYear->campus_id)
                    ->ignore($fiscalYear->id),
            ],
            'starts_on' => ['sometimes', 'date'],
            'ends_on' => ['sometimes', 'date', 'after:starts_on'],
            'status' => ['sometimes', Rule::in(['open', 'closed'])],
            'is_current' => ['sometimes', 'boolean'],
        ]);

        $fiscalYear->update($data);

        if ($fiscalYear->is_current) {
            $this->clearOtherCurrent($fiscalYear);
        }

        return new FiscalYearResource($fiscalYear);
    }

    public function destroy(FiscalYear $fiscalYear): JsonResponse
    {
        if ($fiscalYear->journalEntries()->exists()) {
            return response()->json([
                'message' => 'Fiscal year has journal entries and cannot be archived.',
            ], 409);
        }

        $fiscalYear->delete();

        return response()->json(['message' => 'Fiscal year archived.']);
    }

    private function clearOtherCurrent(FiscalYear $year): void
    {
        FiscalYear::query()
            ->where('campus_id', $year->campus_id)
            ->whereKeyNot($year->id)
            ->where('is_current', true)
            ->update(['is_current' => false]);
    }
}
