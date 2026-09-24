<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class RoomController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $rooms = Room::query()
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return RoomResource::collection($rooms);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $room = Room::create($data);

        return (new RoomResource($room))->response()->setStatusCode(201);
    }

    public function show(Room $room): RoomResource
    {
        return new RoomResource($room);
    }

    public function update(Request $request, Room $room): RoomResource
    {
        $data = $request->validate($this->rules($room->campus_id, $room->id, false));

        $room->update($data);

        return new RoomResource($room);
    }

    public function destroy(Room $room): JsonResponse
    {
        $room->delete();

        return response()->json(['message' => 'Room archived.']);
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
                Rule::unique('rooms', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'block' => ['nullable', 'string', 'max:64'],
            'floor' => ['nullable', 'string', 'max:64'],
            'type' => ['sometimes', Rule::in(['classroom', 'lab', 'library', 'hall', 'other'])],
            'capacity' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
