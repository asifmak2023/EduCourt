<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SubjectResource;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SubjectController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $subjects = Subject::query()
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return SubjectResource::collection($subjects);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $subject = Subject::create($data);

        return (new SubjectResource($subject))->response()->setStatusCode(201);
    }

    public function show(Subject $subject): SubjectResource
    {
        return new SubjectResource($subject->load('classSubjects'));
    }

    public function update(Request $request, Subject $subject): SubjectResource
    {
        $data = $request->validate($this->rules($subject->campus_id, $subject->id, false));

        $subject->update($data);

        return new SubjectResource($subject);
    }

    public function destroy(Subject $subject): JsonResponse
    {
        $subject->delete();

        return response()->json(['message' => 'Subject archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:128'],
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('subjects', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'type' => ['sometimes', Rule::in(['core', 'elective', 'optional'])],
            'credit_hours' => ['nullable', 'numeric', 'min:0', 'max:99.9'],
            'weekly_periods' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
