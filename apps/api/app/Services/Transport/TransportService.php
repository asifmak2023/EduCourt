<?php

namespace App\Services\Transport;

use App\Enums\TransitStatus;
use App\Models\TransportAllocation;
use App\Models\TransportRoute;
use App\Models\Vehicle;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns transport allocations, route capacity and fleet summaries.
 */
class TransportService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function allocate(TransportRoute $route, array $data): TransportAllocation
    {
        return DB::transaction(function () use ($route, $data) {
            $exists = TransportAllocation::query()
                ->where('student_id', $data['student_id'])
                ->where('status', TransitStatus::Active)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'student_id' => 'The student already has an active transport allocation.',
                ]);
            }

            $stop = null;
            if (! empty($data['transport_route_stop_id'])) {
                $stop = $route->stops()->whereKey($data['transport_route_stop_id'])->first();

                if ($stop === null) {
                    throw ValidationException::withMessages([
                        'transport_route_stop_id' => 'The selected stop does not belong to this route.',
                    ]);
                }
            }

            $fare = $data['fare'] ?? ($stop?->fare ?? $route->fare);

            return $route->allocations()->create($data + [
                'institution_id' => $route->institution_id,
                'campus_id' => $route->campus_id,
                'vehicle_id' => $data['vehicle_id'] ?? $route->vehicle_id,
                'direction' => $data['direction'] ?? 'both',
                'fare' => $fare,
                'status' => 'active',
            ]);
        });
    }

    public function deallocate(TransportAllocation $allocation, ?string $endDate = null): TransportAllocation
    {
        $allocation->forceFill([
            'status' => TransitStatus::Inactive,
            'end_date' => $endDate ?? now()->toDateString(),
        ])->save();

        return $allocation->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $vehicles = Vehicle::query()->get();
        $routes = TransportRoute::query()->withCount('allocations')->get();
        $active = TransportAllocation::query()->where('status', TransitStatus::Active)->get();

        return [
            'vehicles' => $vehicles->count(),
            'vehicle_capacity' => (int) $vehicles->sum('capacity'),
            'routes' => $routes->count(),
            'allocated_students' => $active->count(),
            'monthly_fare' => (float) $active->sum('fare'),
            'routes_detail' => $routes->map(fn (TransportRoute $route) => [
                'id' => $route->id,
                'name' => $route->name,
                'code' => $route->code,
                'stops' => $route->stops()->count(),
                'allocations' => $route->allocations_count,
            ])->values(),
        ];
    }
}
