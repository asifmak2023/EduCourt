<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\LabBookingResource;
use App\Models\Lab;
use App\Models\LabBooking;
use App\Services\Lab\LabService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class LabBookingController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly LabService $labs) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $bookings = LabBooking::query()
            ->with(['lab', 'classRoom', 'teacher'])
            ->when($request->filled('lab_id'), fn ($q) => $q->where('lab_id', $request->integer('lab_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date'), fn ($q) => $q->whereDate('session_date', $request->date('date')))
            ->orderByDesc('session_date')
            ->orderBy('start_time')
            ->paginate($request->integer('per_page', 50));

        return LabBookingResource::collection($bookings);
    }

    public function store(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate($this->rules());

        $lab = Lab::query()->findOrFail($data['lab_id']);
        $booking = $this->labs->createBooking($lab, $data);

        return (new LabBookingResource($booking->load(['lab', 'classRoom', 'teacher'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(LabBooking $booking): LabBookingResource
    {
        return new LabBookingResource($booking->load(['lab', 'classRoom', 'teacher']));
    }

    public function cancel(LabBooking $booking): LabBookingResource
    {
        $booking->forceFill(['status' => 'cancelled'])->save();

        return new LabBookingResource($booking->refresh()->load(['lab', 'classRoom', 'teacher']));
    }

    public function complete(LabBooking $booking): LabBookingResource
    {
        $booking->forceFill(['status' => 'completed'])->save();

        return new LabBookingResource($booking->refresh()->load(['lab', 'classRoom', 'teacher']));
    }

    public function destroy(LabBooking $booking): JsonResponse
    {
        $booking->delete();

        return response()->json(['message' => 'Lab booking removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'lab_id' => ['required', 'integer', Rule::exists('labs', 'id')],
            'class_room_id' => ['nullable', 'integer', Rule::exists('class_rooms', 'id')],
            'teacher_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'session_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['scheduled', 'completed', 'cancelled'])],
        ];
    }
}
