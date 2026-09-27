<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CircularResource;
use App\Models\Circular;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class CircularController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $circulars = Circular::query()
            ->with(['classRoom', 'section', 'createdBy'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('audience'), fn ($q) => $q->where('audience', $request->string('audience')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->boolean('published'), fn ($q) => $q->whereNotNull('published_at'))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return CircularResource::collection($circulars);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $circular = Circular::create($data + $tenant + [
            'status' => 'draft',
            'created_by' => $request->user()?->id,
        ]);

        return (new CircularResource($circular->load(['classRoom', 'section', 'createdBy'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Circular $circular): CircularResource
    {
        return new CircularResource($circular->load(['classRoom', 'section', 'createdBy']));
    }

    public function update(Request $request, Circular $circular): CircularResource
    {
        $circular->update($request->validate($this->rules($circular->campus_id, false)));

        return new CircularResource($circular->refresh()->load(['classRoom', 'section', 'createdBy']));
    }

    public function publish(Circular $circular): CircularResource
    {
        $circular->forceFill([
            'status' => 'published',
            'published_at' => $circular->published_at ?? now(),
        ])->save();

        return new CircularResource($circular->refresh()->load(['classRoom', 'section', 'createdBy']));
    }

    public function archive(Circular $circular): CircularResource
    {
        if ($circular->published_at === null) {
            throw ValidationException::withMessages([
                'status' => 'Only published circulars can be archived.',
            ]);
        }

        $circular->forceFill(['status' => 'archived'])->save();

        return new CircularResource($circular->refresh()->load(['classRoom', 'section', 'createdBy']));
    }

    public function destroy(Circular $circular): JsonResponse
    {
        $circular->delete();

        return response()->json(['message' => 'Circular removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'title' => [$presence, 'string', 'max:255'],
            'body' => [$presence, 'string'],
            'audience' => ['sometimes', 'in:all,students,parents,staff,class'],
            'class_room_id' => ['nullable', 'integer', 'exists:class_rooms,id'],
            'section_id' => ['nullable', 'integer', 'exists:sections,id'],            'expires_on' => ['nullable', 'date'],
            'attachment_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
