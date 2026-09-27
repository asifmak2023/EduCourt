<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\HostelRoomResource;
use App\Models\Hostel;
use App\Models\HostelRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class HostelRoomController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request, Hostel $hostel): AnonymousResourceCollection
    {
        $rooms = HostelRoom::query()
            ->where('hostel_id', $hostel->id)
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->boolean('available'), fn ($q) => $q->whereColumn('occupied', '<', 'capacity'))
            ->orderBy('room_no')
            ->paginate($request->integer('per_page', 50));

        return HostelRoomResource::collection($rooms);
    }

    public function store(Request $request, Hostel $hostel): JsonResponse
    {
        $data = $request->validate($this->rules());

        $room = $hostel->rooms()->create($data + [
            'institution_id' => $hostel->institution_id,
            'campus_id' => $hostel->campus_id,
        ]);

        return (new HostelRoomResource($room))->response()->setStatusCode(201);
    }

    public function show(HostelRoom $room): HostelRoomResource
    {
        return new HostelRoomResource($room);
    }

    public function update(Request $request, HostelRoom $room): HostelRoomResource
    {
        $data = $request->validate($this->rules(false));

        if (isset($data['capacity']) && $data['capacity'] < $room->occupied) {
            abort(422, 'Capacity cannot be lower than the current occupancy.');
        }

        $room->update($data);

        return new HostelRoomResource($room->refresh());
    }

    public function destroy(HostelRoom $room): JsonResponse
    {
        if ($room->occupied > 0) {
            abort(422, 'Vacate the room before deleting it.');
        }

        $room->delete();

        return response()->json(['message' => 'Hostel room removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'room_no' => [$presence, 'string', 'max:32'],
            'floor' => ['nullable', 'string', 'max:32'],
            'type' => ['sometimes', Rule::in(['single', 'double', 'triple', 'dorm'])],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'monthly_fee' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
