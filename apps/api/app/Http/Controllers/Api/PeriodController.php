<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PeriodResource;
use App\Models\Period;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PeriodController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $periods = Period::query()
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sequence')
            ->paginate($request->integer('per_page', 50));

        return PeriodResource::collection($periods);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $period = Period::create($data);

        return (new PeriodResource($period))->response()->setStatusCode(201);
    }

    public function show(Period $period): PeriodResource
    {
        return new PeriodResource($period);
    }

    public function update(Request $request, Period $period): PeriodResource
    {
        $data = $request->validate($this->rules($period->campus_id, $period->id, false));

        $period->update($data);

        return new PeriodResource($period);
    }

    public function destroy(Period $period): JsonResponse
    {
        $period->delete();

        return response()->json(['message' => 'Period archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:64'],
            'sequence' => [
                $presence, 'integer', 'min:1', 'max:255',
                Rule::unique('periods', 'sequence')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'starts_at' => [$presence, 'date_format:H:i'],
            'ends_at' => [$presence, 'date_format:H:i', 'after:starts_at'],
            'is_break' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
