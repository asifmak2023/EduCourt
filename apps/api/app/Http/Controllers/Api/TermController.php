<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TermResource;
use App\Models\AcademicYear;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TermController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Term::query()
            ->with('academicYear')
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->has('is_current'), fn ($q) => $q->where('is_current', $request->boolean('is_current')))
            ->orderBy('academic_year_id')
            ->orderBy('sequence');

        return TermResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id']),
            ],
            'name' => ['required', 'string', 'max:64'],
            'sequence' => ['sometimes', 'integer', 'min:1', 'max:255'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after:starts_on'],
            'is_current' => ['sometimes', 'boolean'],
        ]);

        $data += $tenant;
        $this->assertWithinAcademicYear($data);

        $term = Term::create($data);

        if ($term->is_current) {
            $this->clearOtherCurrent($term);
        }

        return (new TermResource($term->load('academicYear')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Term $term): TermResource
    {
        return new TermResource($term->load('academicYear'));
    }

    public function update(Request $request, Term $term): TermResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:64'],
            'sequence' => ['sometimes', 'integer', 'min:1', 'max:255'],
            'starts_on' => ['sometimes', 'date'],
            'ends_on' => ['sometimes', 'date', 'after:starts_on'],
            'is_current' => ['sometimes', 'boolean'],
        ]);

        $term->update($data);

        if ($term->is_current) {
            $this->clearOtherCurrent($term);
        }

        return new TermResource($term->load('academicYear'));
    }

    public function destroy(Term $term): JsonResponse
    {
        $term->delete();

        return response()->json(['message' => 'Term archived.']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertWithinAcademicYear(array $data): void
    {
        $year = AcademicYear::query()->findOrFail($data['academic_year_id']);

        if ($data['starts_on'] < $year->starts_on->toDateString()
            || $data['ends_on'] > $year->ends_on->toDateString()) {
            throw ValidationException::withMessages([
                'starts_on' => ['The term dates must fall within the academic year.'],
            ]);
        }
    }

    private function clearOtherCurrent(Term $term): void
    {
        Term::query()
            ->where('campus_id', $term->campus_id)
            ->whereKeyNot($term->id)
            ->where('is_current', true)
            ->update(['is_current' => false]);
    }
}
