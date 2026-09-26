<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CanteenHygieneCheckResource;
use App\Models\CanteenHygieneCheck;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CanteenHygieneCheckController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $checks = CanteenHygieneCheck::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('check_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('check_date', '<=', $request->date('to')))
            ->orderByDesc('check_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return CanteenHygieneCheckResource::collection($checks);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());

        $check = CanteenHygieneCheck::create($data + $this->academicTenantAttributes() + [
            'checked_by' => $request->user()?->id,
        ]);

        return (new CanteenHygieneCheckResource($check))->response()->setStatusCode(201);
    }

    public function show(CanteenHygieneCheck $hygieneCheck): CanteenHygieneCheckResource
    {
        return new CanteenHygieneCheckResource($hygieneCheck);
    }

    public function update(Request $request, CanteenHygieneCheck $hygieneCheck): CanteenHygieneCheckResource
    {
        $hygieneCheck->update($request->validate($this->rules(false)));

        return new CanteenHygieneCheckResource($hygieneCheck);
    }

    public function destroy(CanteenHygieneCheck $hygieneCheck): JsonResponse
    {
        $hygieneCheck->delete();

        return response()->json(['message' => 'Hygiene check removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'check_date' => [$presence, 'date'],
            'area' => [$presence, 'string', 'max:128'],
            'status' => ['sometimes', Rule::in(['pass', 'needs_attention', 'fail'])],
            'score' => ['nullable', 'integer', 'between:0,100'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
