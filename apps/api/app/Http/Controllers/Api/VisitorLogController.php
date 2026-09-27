<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\VisitorLogResource;
use App\Models\VisitorLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class VisitorLogController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $visitors = VisitorLog::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($inner) => $inner
                    ->where('name', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('badge_no', 'like', $term));
            })
            ->when($request->filled('date'), fn ($q) => $q->whereDate('in_time', $request->date('date')))
            ->when($request->boolean('inside'), fn ($q) => $q->whereNull('out_time'))
            ->orderByDesc('in_time')
            ->paginate($request->integer('per_page', 50));

        return VisitorLogResource::collection($visitors);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $visitor = VisitorLog::create($data + $tenant + [
            'in_time' => $data['in_time'] ?? now(),
            'created_by' => $request->user()?->id,
        ]);

        return (new VisitorLogResource($visitor))->response()->setStatusCode(201);
    }

    public function show(VisitorLog $visitor): VisitorLogResource
    {
        return new VisitorLogResource($visitor);
    }

    public function update(Request $request, VisitorLog $visitor): VisitorLogResource
    {
        $visitor->update($request->validate($this->rules(false)));

        return new VisitorLogResource($visitor->refresh());
    }

    public function checkout(VisitorLog $visitor): VisitorLogResource
    {
        if ($visitor->out_time !== null) {
            throw ValidationException::withMessages([
                'out_time' => 'This visitor has already checked out.',
            ]);
        }

        $visitor->forceFill(['out_time' => now()])->save();

        return new VisitorLogResource($visitor->refresh());
    }

    public function destroy(VisitorLog $visitor): JsonResponse
    {
        $visitor->delete();

        return response()->json(['message' => 'Visitor log removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'id_type' => ['nullable', 'string', 'max:32'],
            'id_number' => ['nullable', 'string', 'max:64'],
            'purpose' => [$presence, 'string', 'max:255'],
            'person_to_meet' => ['nullable', 'string', 'max:255'],
            'badge_no' => ['nullable', 'string', 'max:32'],
            'in_time' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
