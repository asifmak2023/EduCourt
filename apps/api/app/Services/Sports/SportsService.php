<?php

namespace App\Services\Sports;

use App\Enums\EquipmentMovementType;
use App\Enums\FixtureOutcome;
use App\Enums\FixtureStatus;
use App\Models\AcademicYear;
use App\Models\Sport;
use App\Models\SportAchievement;
use App\Models\SportEquipment;
use App\Models\SportEquipmentMovement;
use App\Models\SportFixture;
use App\Models\SportTeam;
use App\Models\SportTeamMember;
use App\Models\Student;
use App\Services\Attendance\AttendanceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns sports equipment stock movements and player eligibility checks. Fixture
 * results and achievements are simple records owned by their controllers.
 */
class SportsService
{
    public function __construct(private readonly AttendanceService $attendance) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function recordMovement(SportEquipment $equipment, array $data, ?int $userId): SportEquipmentMovement
    {
        $type = EquipmentMovementType::from($data['type']);
        $quantity = round((float) $data['quantity'], 2);

        return DB::transaction(function () use ($equipment, $type, $quantity, $data, $userId) {
            $equipment = SportEquipment::query()->lockForUpdate()->findOrFail($equipment->id);

            $total = (float) $equipment->quantity;
            $available = (float) $equipment->available_quantity;

            switch ($type) {
                case EquipmentMovementType::Purchase:
                    $total += $quantity;
                    $available += $quantity;
                    break;

                case EquipmentMovementType::Issue:
                    if ($quantity > $available) {
                        throw ValidationException::withMessages([
                            'quantity' => ['Cannot issue more than the available quantity.'],
                        ]);
                    }
                    $available -= $quantity;
                    break;

                case EquipmentMovementType::Return:
                    if ($available + $quantity > $total) {
                        throw ValidationException::withMessages([
                            'quantity' => ['Returned quantity exceeds the total owned.'],
                        ]);
                    }
                    $available += $quantity;
                    break;

                case EquipmentMovementType::Damage:
                    if ($quantity > $total || $quantity > $available) {
                        throw ValidationException::withMessages([
                            'quantity' => ['Damaged quantity exceeds the tracked stock.'],
                        ]);
                    }
                    $total -= $quantity;
                    $available -= $quantity;
                    break;

                case EquipmentMovementType::Adjustment:
                    $available += $quantity;
                    if ($available < 0 || $available > $total) {
                        throw ValidationException::withMessages([
                            'quantity' => ['The adjustment would push available stock outside the owned quantity.'],
                        ]);
                    }
                    break;
            }

            $equipment->forceFill([
                'quantity' => round($total, 2),
                'available_quantity' => round($available, 2),
            ])->save();

            return $equipment->movements()->create([
                'institution_id' => $equipment->institution_id,
                'campus_id' => $equipment->campus_id,
                'type' => $type->value,
                'quantity' => $quantity,
                'balance_after' => round($available, 2),
                'issued_to' => $data['issued_to'] ?? null,
                'movement_date' => $data['movement_date'] ?? now()->toDateString(),
                'remarks' => $data['remarks'] ?? null,
                'created_by' => $userId,
            ]);
        });
    }

    /**
     * Check whether a student meets a sport's age and attendance criteria.
     *
     * @return array<string, mixed>
     */
    public function eligibility(Sport $sport, Student $student): array
    {
        $reasons = [];

        $age = $student->date_of_birth !== null
            ? Carbon::parse($student->date_of_birth)->age
            : null;

        if ($sport->min_age_years !== null && ($age === null || $age < $sport->min_age_years)) {
            $reasons[] = "Minimum age is {$sport->min_age_years} years.";
        }

        if ($sport->max_age_years !== null && ($age === null || $age > $sport->max_age_years)) {
            $reasons[] = "Maximum age is {$sport->max_age_years} years.";
        }

        [$from, $to] = $this->attendanceWindow($sport->campus_id);
        $summary = $this->attendance->studentSummary($student->id, $from, $to);
        $marked = (int) $summary['marked'];
        $present = (int) $summary['present'] + (int) $summary['late'];
        $percent = $marked > 0 ? round(($present / $marked) * 100, 2) : null;

        if ($sport->min_attendance_percent !== null) {
            $threshold = (float) $sport->min_attendance_percent;
            if ($percent === null) {
                $reasons[] = "Attendance data is required (minimum {$threshold}%).";
            } elseif ($percent < $threshold) {
                $reasons[] = "Attendance {$percent}% is below the required {$threshold}%.";
            }
        }

        return [
            'sport_id' => $sport->id,
            'student_id' => $student->id,
            'eligible' => $reasons === [],
            'age' => $age,
            'attendance_percent' => $percent,
            'attendance_window' => ['from' => $from, 'to' => $to],
            'reasons' => $reasons,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function summary(int $campusId, array $filters = []): array
    {
        $sportId = $filters['sport_id'] ?? null;
        $from = $filters['from'] ?? null;
        $to = $filters['to'] ?? null;

        $teams = SportTeam::query()->where('campus_id', $campusId)
            ->when($sportId, fn ($q) => $q->where('sport_id', $sportId))
            ->count();

        $members = SportTeamMember::query()->where('campus_id', $campusId)
            ->where('status', 'active')
            ->when($sportId, fn ($q) => $q->whereHas('team', fn ($t) => $t->where('sport_id', $sportId)))
            ->count();

        $fixtures = SportFixture::query()->where('campus_id', $campusId)
            ->when($sportId, fn ($q) => $q->where('sport_id', $sportId))
            ->when($from, fn ($q) => $q->whereDate('fixture_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('fixture_date', '<=', $to))
            ->get();

        $achievements = SportAchievement::query()->where('campus_id', $campusId)
            ->when($sportId, fn ($q) => $q->where('sport_id', $sportId))
            ->when($from, fn ($q) => $q->whereDate('achieved_on', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('achieved_on', '<=', $to))
            ->count();

        $equipment = SportEquipment::query()->where('campus_id', $campusId)
            ->when($sportId, fn ($q) => $q->where('sport_id', $sportId))
            ->get();

        return [
            'range' => ['from' => $from, 'to' => $to],
            'teams' => $teams,
            'active_members' => $members,
            'fixtures' => [
                'total' => $fixtures->count(),
                'scheduled' => $fixtures->where('status', FixtureStatus::Scheduled)->count(),
                'completed' => $fixtures->where('status', FixtureStatus::Completed)->count(),
                'cancelled' => $fixtures->where('status', FixtureStatus::Cancelled)->count(),
                'wins' => $fixtures->where('outcome', FixtureOutcome::Win)->count(),
                'losses' => $fixtures->where('outcome', FixtureOutcome::Loss)->count(),
                'draws' => $fixtures->where('outcome', FixtureOutcome::Draw)->count(),
            ],
            'achievements' => $achievements,
            'equipment' => [
                'items' => $equipment->count(),
                'total_quantity' => round($equipment->sum(fn ($item) => (float) $item->quantity), 2),
                'out_of_stock' => $equipment->filter(fn ($item) => (float) $item->available_quantity <= 0)->count(),
                'value' => round($equipment->sum(fn ($item) => (float) $item->quantity * (float) $item->unit_cost), 2),
            ],
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function attendanceWindow(int $campusId): array
    {
        $year = AcademicYear::query()
            ->where('campus_id', $campusId)
            ->where('is_current', true)
            ->first();

        if ($year !== null) {
            return [$year->starts_on->toDateString(), $year->ends_on->toDateString()];
        }

        return [now()->startOfYear()->toDateString(), now()->toDateString()];
    }
}
