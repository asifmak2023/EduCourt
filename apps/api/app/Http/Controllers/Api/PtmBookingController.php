<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PtmBookingResource;
use App\Models\PtmBooking;
use App\Models\PtmSlot;
use App\Services\Access\TeacherScope;
use App\Services\Ptm\PtmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PtmBookingController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(
        private readonly PtmService $ptm,
        private readonly TeacherScope $teacherScope,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $bookings = PtmBooking::query()
            ->with(['slot', 'student'])
            ->when($request->filled('ptm_slot_id'), fn ($q) => $q->where('ptm_slot_id', $request->integer('ptm_slot_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id');

        $this->teacherScope->applyTo($bookings, $request->user(), 'student_id');

        $bookings = $bookings->paginate($request->integer('per_page', 50));

        return PtmBookingResource::collection($bookings);
    }

    public function store(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate([
            'ptm_slot_id' => ['required', 'integer', Rule::exists('ptm_slots', 'id')],
            'student_id' => ['nullable', 'integer', Rule::exists('students', 'id')],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:32'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! empty($data['student_id'])) {
            abort_unless($this->teacherScope->allowsStudent($request->user(), (int) $data['student_id']), 403, 'This student is outside your assigned classes.');
        }

        $slot = PtmSlot::query()->findOrFail($data['ptm_slot_id']);
        $booking = $this->ptm->createBooking($data, $slot);

        return (new PtmBookingResource($booking->load(['slot', 'student'])))->response()->setStatusCode(201);
    }

    public function show(Request $request, PtmBooking $booking): PtmBookingResource
    {
        $this->guardBooking($request, $booking);

        return new PtmBookingResource($booking->load(['slot', 'student']));
    }

    public function cancel(Request $request, PtmBooking $booking): PtmBookingResource
    {
        $this->guardBooking($request, $booking);

        $booking = $this->ptm->cancelBooking($booking);

        return new PtmBookingResource($booking->load(['slot', 'student']));
    }

    public function mark(Request $request, PtmBooking $booking): PtmBookingResource
    {
        $this->guardBooking($request, $booking);

        $data = $request->validate([
            'status' => ['required', Rule::in(['attended', 'no_show'])],
        ]);

        $booking = $this->ptm->markBooking($booking, $data['status']);

        return new PtmBookingResource($booking->load(['slot', 'student']));
    }

    public function destroy(Request $request, PtmBooking $booking): JsonResponse
    {
        $this->guardBooking($request, $booking);

        $booking->delete();

        return response()->json(['message' => 'PTM booking removed.']);
    }

    private function guardBooking(Request $request, PtmBooking $booking): void
    {
        $user = $request->user();

        if (! $this->teacherScope->isTeacherScoped($user)) {
            return;
        }

        abort_unless(
            $booking->student_id !== null && $this->teacherScope->allowsStudent($user, (int) $booking->student_id),
            403,
            'This booking is outside your assigned classes.',
        );
    }
}
