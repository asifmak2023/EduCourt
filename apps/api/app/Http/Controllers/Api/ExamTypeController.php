<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamTypeResource;
use App\Models\ExamType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExamTypeController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $types = ExamType::query()
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return ExamTypeResource::collection($types);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $type = ExamType::create($data + $tenant);

        return (new ExamTypeResource($type))->response()->setStatusCode(201);
    }

    public function show(ExamType $examType): ExamTypeResource
    {
        return new ExamTypeResource($examType);
    }

    public function update(Request $request, ExamType $examType): ExamTypeResource
    {
        $data = $request->validate($this->rules($examType->campus_id, $examType->id, false));

        $examType->update($data);

        return new ExamTypeResource($examType);
    }

    public function destroy(ExamType $examType): JsonResponse
    {
        $examType->delete();

        return response()->json(['message' => 'Exam type removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('exam_types', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'weightage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
        ];
    }
}
