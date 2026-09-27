<?php

namespace App\Services\Lab;

use App\Enums\LabEquipmentCondition;
use App\Models\Lab;
use App\Models\LabBooking;
use App\Models\LabEquipment;
use Illuminate\Validation\ValidationException;

/**
 * Handles lab bookings with clash detection and lab inventory summaries.
 */
class LabService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function createBooking(Lab $lab, array $data): LabBooking
    {
        $clash = LabBooking::query()
            ->where('lab_id', $lab->id)
            ->whereDate('session_date', $data['session_date'])
            ->where('status', '!=', 'cancelled')
            ->where('start_time', '<', $data['end_time'])
            ->where('end_time', '>', $data['start_time'])
            ->exists();

        if ($clash) {
            throw ValidationException::withMessages([
                'start_time' => 'The lab is already booked for an overlapping session.',
            ]);
        }

        return $lab->bookings()->create($data + [
            'institution_id' => $lab->institution_id,
            'campus_id' => $lab->campus_id,
            'status' => $data['status'] ?? 'scheduled',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(Lab $lab): array
    {
        $equipment = LabEquipment::query()->where('lab_id', $lab->id)->get();

        return [
            'lab_id' => $lab->id,
            'equipment_count' => $equipment->count(),
            'equipment_quantity' => (int) $equipment->sum('quantity'),
            'by_condition' => $equipment->groupBy(fn (LabEquipment $item) => $item->condition->value)
                ->map->count()
                ->all(),
            'upcoming_sessions' => LabBooking::query()
                ->where('lab_id', $lab->id)
                ->where('status', 'scheduled')
                ->whereDate('session_date', '>=', now()->toDateString())
                ->count(),
            'needs_attention' => $equipment
                ->filter(fn (LabEquipment $item) => $item->condition !== LabEquipmentCondition::Working)
                ->count(),
        ];
    }
}
