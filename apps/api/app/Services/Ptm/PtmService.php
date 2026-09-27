<?php

namespace App\Services\Ptm;

use App\Enums\PtmBookingStatus;
use App\Models\PtmBooking;
use App\Models\PtmEvent;
use App\Models\PtmSlot;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Manages parent-teacher meeting slots, bookings and attendance outcomes.
 */
class PtmService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function createBooking(array $data, PtmSlot $slot): PtmBooking
    {
        if ($slot->event?->status?->value === 'cancelled') {
            throw ValidationException::withMessages([
                'ptm_slot_id' => 'The selected event has been cancelled.',
            ]);
        }

        return DB::transaction(function () use ($data, $slot) {
            $locked = PtmSlot::query()->whereKey($slot->id)->lockForUpdate()->firstOrFail();

            if ($locked->booked >= $locked->capacity) {
                throw ValidationException::withMessages([
                    'ptm_slot_id' => 'The selected slot is fully booked.',
                ]);
            }

            $booking = $locked->bookings()->create($data + [
                'institution_id' => $locked->institution_id,
                'campus_id' => $locked->campus_id,
                'status' => 'booked',
            ]);

            $locked->increment('booked');

            return $booking;
        });
    }

    public function cancelBooking(PtmBooking $booking): PtmBooking
    {
        return DB::transaction(function () use ($booking) {
            if ($booking->status !== PtmBookingStatus::Booked) {
                throw ValidationException::withMessages([
                    'status' => 'Only booked appointments can be cancelled.',
                ]);
            }

            $booking->forceFill(['status' => PtmBookingStatus::Cancelled])->save();

            PtmSlot::query()->whereKey($booking->ptm_slot_id)->where('booked', '>', 0)->decrement('booked');

            return $booking->refresh();
        });
    }

    public function markBooking(PtmBooking $booking, string $status): PtmBooking
    {
        $allowed = [PtmBookingStatus::Attended->value, PtmBookingStatus::NoShow->value];

        if (! in_array($status, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => 'Status must be attended or no_show.',
            ]);
        }

        $booking->forceFill(['status' => $status])->save();

        return $booking->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(PtmEvent $event): array
    {
        $slots = PtmSlot::query()->where('ptm_event_id', $event->id)->get();
        $bookings = PtmBooking::query()->whereIn('ptm_slot_id', $slots->pluck('id'));

        $byStatus = (clone $bookings)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return [
            'event_id' => $event->id,
            'slots' => $slots->count(),
            'capacity' => (int) $slots->sum('capacity'),
            'booked' => (int) $slots->sum('booked'),
            'bookings' => (clone $bookings)->count(),
            'by_status' => $byStatus,
        ];
    }
}
