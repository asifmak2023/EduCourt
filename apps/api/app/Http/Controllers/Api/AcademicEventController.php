<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AcademicEventResource;
use App\Models\AcademicEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AcademicEventController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $events = AcademicEvent::query()
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('term_id'), fn ($q) => $q->where('term_id', $request->integer('term_id')))
            ->when($request->filled('from'), fn ($q) => $q->where('starts_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->where('starts_on', '<=', $request->date('to')))
            ->orderBy('starts_on')
            ->paginate($request->integer('per_page', 25));

        return AcademicEventResource::collection($events);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;
        $data['created_by'] = $request->user()->id;

        $event = AcademicEvent::create($data);

        return (new AcademicEventResource($event))->response()->setStatusCode(201);
    }

    public function show(AcademicEvent $academicEvent): AcademicEventResource
    {
        return new AcademicEventResource($academicEvent);
    }

    public function update(Request $request, AcademicEvent $academicEvent): AcademicEventResource
    {
        $data = $request->validate($this->rules($academicEvent->campus_id, false));

        $academicEvent->update($data);

        return new AcademicEventResource($academicEvent);
    }

    public function destroy(AcademicEvent $academicEvent): JsonResponse
    {
        $academicEvent->delete();

        return response()->json(['message' => 'Event archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'title' => [$presence, 'string', 'max:200'],
            'type' => ['sometimes', Rule::in(['holiday', 'exam', 'event', 'meeting'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'starts_on' => [$presence, 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'is_all_day' => ['sometimes', 'boolean'],
            'academic_year_id' => [
                'nullable', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId),
            ],
            'term_id' => [
                'nullable', 'integer',
                Rule::exists('terms', 'id')->where('campus_id', $campusId),
            ],
        ];
    }
}
