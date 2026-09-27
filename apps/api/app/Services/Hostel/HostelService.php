<?php

namespace App\Services\Hostel;

use App\Enums\HostelAllocationStatus;
use App\Enums\OutpassStatus;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelOutpass;
use App\Models\HostelRoom;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns hostel allocations, occupancy tracking and outpass workflow.
 */
class HostelService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function allocate(HostelRoom $room, array $data): HostelAllocation
    {
        return DB::transaction(function () use ($room, $data) {
            $locked = HostelRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();

            if ($locked->occupied >= $locked->capacity) {
                throw ValidationException::withMessages([
                    'hostel_room_id' => 'The selected room is full.',
                ]);
            }

            $allocation = $locked->allocations()->create($data + [
                'institution_id' => $locked->institution_id,
                'campus_id' => $locked->campus_id,
                'hostel_id' => $locked->hostel_id,
                'allocated_on' => $data['allocated_on'] ?? now()->toDateString(),
                'monthly_fee' => $data['monthly_fee'] ?? $locked->monthly_fee,
                'status' => 'allocated',
            ]);

            $locked->increment('occupied');

            return $allocation;
        });
    }

    public function vacate(HostelAllocation $allocation, ?string $date = null): HostelAllocation
    {
        return DB::transaction(function () use ($allocation, $date) {
            if ($allocation->status === HostelAllocationStatus::Vacated) {
                throw ValidationException::withMessages([
                    'status' => 'This allocation has already been vacated.',
                ]);
            }

            $allocation->forceFill([
                'status' => HostelAllocationStatus::Vacated,
                'vacated_on' => $date ?? now()->toDateString(),
            ])->save();

            HostelRoom::query()
                ->whereKey($allocation->hostel_room_id)
                ->where('occupied', '>', 0)
                ->decrement('occupied');

            return $allocation->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function requestOutpass(array $data): HostelOutpass
    {
        return HostelOutpass::create($data + ['status' => 'pending']);
    }

    public function decideOutpass(HostelOutpass $outpass, string $status, ?int $userId): HostelOutpass
    {
        if (! in_array($status, [OutpassStatus::Approved->value, OutpassStatus::Rejected->value], true)) {
            throw ValidationException::withMessages([
                'status' => 'Status must be approved or rejected.',
            ]);
        }

        if ($outpass->status !== OutpassStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => 'Only pending outpasses can be decided.',
            ]);
        }

        $outpass->forceFill([
            'status' => $status,
            'approved_by' => $userId,
            'approved_at' => now(),
        ])->save();

        return $outpass->refresh();
    }

    public function markReturned(HostelOutpass $outpass): HostelOutpass
    {
        if ($outpass->status !== OutpassStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => 'Only approved outpasses can be marked returned.',
            ]);
        }

        $outpass->forceFill(['status' => OutpassStatus::Returned])->save();

        return $outpass->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(Hostel $hostel): array
    {
        $rooms = HostelRoom::query()->where('hostel_id', $hostel->id)->get();

        return [
            'hostel_id' => $hostel->id,
            'rooms' => $rooms->count(),
            'capacity' => (int) $rooms->sum('capacity'),
            'occupied' => (int) $rooms->sum('occupied'),
            'available' => (int) $rooms->sum(fn (HostelRoom $room) => $room->availableBeds()),
            'by_type' => $rooms->groupBy(fn (HostelRoom $room) => $room->type->value)->map->count()->all(),
            'pending_outpasses' => HostelOutpass::query()
                ->where('campus_id', $hostel->campus_id)
                ->where('status', OutpassStatus::Pending)
                ->count(),
        ];
    }
}
