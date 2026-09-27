<?php

namespace App\Services\It;

use App\Enums\BackupStatus;
use App\Enums\ChangeStatus;
use App\Enums\ItAssetStatus;
use App\Enums\SystemStatus;
use App\Enums\TicketStatus;
use App\Models\HelpdeskComment;
use App\Models\HelpdeskTicket;
use App\Models\ItAsset;
use App\Models\ItAssetAssignment;
use App\Models\ItBackupLog;
use App\Models\ItChangeRequest;
use App\Models\ItSystem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns IT helpdesk SLAs, asset assignment history and change-request workflow,
 * plus campus-level IT operational reporting.
 */
class ItService
{
    /**
     * SLA target in hours keyed by ticket priority.
     *
     * @var array<string, int>
     */
    public const SLA_HOURS = [
        'critical' => 4,
        'high' => 8,
        'medium' => 24,
        'low' => 72,
    ];

    /**
     * @param  array<string, mixed>  $data
     * @param  array{institution_id: int, campus_id: int}  $tenant
     */
    public function createTicket(array $data, array $tenant, ?int $userId): HelpdeskTicket
    {
        $priority = $data['priority'] ?? 'medium';
        $raisedAt = isset($data['reported_at']) ? Carbon::parse($data['reported_at']) : now();

        return DB::transaction(function () use ($data, $tenant, $userId, $priority, $raisedAt) {
            $ticket = HelpdeskTicket::create($data + $tenant + [
                'ticket_no' => $this->nextTicketNo($tenant['campus_id']),
                'priority' => $priority,
                'status' => 'open',
                'reported_by' => $data['reported_by'] ?? $userId,
                'sla_due_at' => $raisedAt->copy()->addHours(self::SLA_HOURS[$priority] ?? 24),
            ]);

            return $ticket;
        });
    }

    public function assignTicket(HelpdeskTicket $ticket, int $userId): HelpdeskTicket
    {
        $ticket->forceFill([
            'assigned_to' => $userId,
            'status' => TicketStatus::InProgress,
        ])->save();

        return $ticket->refresh();
    }

    public function addComment(HelpdeskTicket $ticket, array $data, ?int $userId): HelpdeskComment
    {
        return $ticket->comments()->create([
            'institution_id' => $ticket->institution_id,
            'campus_id' => $ticket->campus_id,
            'user_id' => $userId,
            'body' => $data['body'],
            'is_internal' => (bool) ($data['is_internal'] ?? false),
        ]);
    }

    public function resolveTicket(HelpdeskTicket $ticket, string $resolution): HelpdeskTicket
    {
        $ticket->forceFill([
            'resolution' => $resolution,
            'status' => TicketStatus::Resolved,
            'resolved_at' => now(),
        ])->save();

        return $ticket->refresh();
    }

    public function closeTicket(HelpdeskTicket $ticket): HelpdeskTicket
    {
        $ticket->forceFill([
            'status' => TicketStatus::Closed,
            'closed_at' => now(),
        ])->save();

        return $ticket->refresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function assignAsset(ItAsset $asset, array $data, ?int $userId): ItAssetAssignment
    {
        return DB::transaction(function () use ($asset, $data, $userId) {
            $asset = ItAsset::query()->lockForUpdate()->findOrFail($asset->id);

            if ($asset->status === ItAssetStatus::Retired) {
                throw ValidationException::withMessages(['status' => ['A retired asset cannot be assigned.']]);
            }

            if ($asset->assignments()->whereNull('returned_on')->exists()) {
                throw ValidationException::withMessages(['status' => ['This asset is already assigned. Return it first.']]);
            }

            $assignment = $asset->assignments()->create([
                'institution_id' => $asset->institution_id,
                'campus_id' => $asset->campus_id,
                'assigned_to' => $data['assigned_to'],
                'assigned_on' => $data['assigned_on'] ?? now()->toDateString(),
                'condition' => $data['condition'] ?? 'good',
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            $asset->forceFill([
                'status' => ItAssetStatus::Assigned,
                'assigned_to' => $data['assigned_to'],
                'assigned_on' => $assignment->assigned_on,
            ])->save();

            return $assignment;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function returnAsset(ItAsset $asset, array $data): ItAsset
    {
        return DB::transaction(function () use ($asset, $data) {
            $asset = ItAsset::query()->lockForUpdate()->findOrFail($asset->id);

            $assignment = $asset->assignments()->whereNull('returned_on')->latest('id')->first();

            if ($assignment === null) {
                throw ValidationException::withMessages(['status' => ['This asset is not currently assigned.']]);
            }

            $assignment->forceFill([
                'returned_on' => $data['returned_on'] ?? now()->toDateString(),
                'condition' => $data['condition'] ?? $assignment->condition,
                'notes' => $data['notes'] ?? $assignment->notes,
            ])->save();

            $asset->forceFill([
                'status' => $data['status'] ?? ItAssetStatus::Available->value,
                'assigned_to' => null,
                'assigned_on' => null,
            ])->save();

            return $asset->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function decideChange(ItChangeRequest $change, array $data, ?int $userId): ItChangeRequest
    {
        $status = ChangeStatus::from($data['status']);

        $change->forceFill([
            'status' => $status,
            'decision_notes' => $data['decision_notes'] ?? $change->decision_notes,
            'approved_by' => in_array($status, [ChangeStatus::Approved, ChangeStatus::Rejected], true)
                ? $userId
                : $change->approved_by,
            'decided_at' => now(),
            'implemented_on' => $status === ChangeStatus::Implemented
                ? ($data['implemented_on'] ?? now()->toDateString())
                : $change->implemented_on,
        ])->save();

        return $change->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(int $campusId): array
    {
        $assets = ItAsset::query()->where('campus_id', $campusId)->get();

        $tickets = HelpdeskTicket::query()->where('campus_id', $campusId)->get();

        $resolved = $tickets->filter(fn (HelpdeskTicket $t) => $t->resolved_at !== null);
        $avgHours = $resolved->isEmpty()
            ? null
            : round($resolved->avg(
                fn (HelpdeskTicket $t) => $t->created_at->diffInMinutes($t->resolved_at) / 60
            ), 2);

        $changes = ItChangeRequest::query()->where('campus_id', $campusId)->get();

        $backups = ItBackupLog::query()->where('campus_id', $campusId)->get();
        $lastBackup = $backups->sortByDesc('started_at')->first();

        $systems = ItSystem::query()->where('campus_id', $campusId)->get();

        return [
            'assets' => [
                'total' => $assets->count(),
                'available' => $assets->where('status', ItAssetStatus::Available)->count(),
                'assigned' => $assets->where('status', ItAssetStatus::Assigned)->count(),
                'in_repair' => $assets->where('status', ItAssetStatus::Repair)->count(),
                'retired' => $assets->where('status', ItAssetStatus::Retired)->count(),
                'warranty_expiring_soon' => $assets->filter(fn (ItAsset $a) => $a->warranty_until !== null
                    && $a->warranty_until->isFuture()
                    && $a->warranty_until->lte(now()->addDays(30)))->count(),
                'total_value' => round($assets->sum(fn (ItAsset $a) => (float) $a->cost), 2),
            ],
            'tickets' => [
                'total' => $tickets->count(),
                'open' => $tickets->where('status', TicketStatus::Open)->count(),
                'in_progress' => $tickets->where('status', TicketStatus::InProgress)->count(),
                'resolved' => $tickets->where('status', TicketStatus::Resolved)->count(),
                'closed' => $tickets->where('status', TicketStatus::Closed)->count(),
                'overdue' => $tickets->filter(fn (HelpdeskTicket $t) => $t->isOverdue())->count(),
                'avg_resolution_hours' => $avgHours,
            ],
            'changes' => [
                'total' => $changes->count(),
                'pending' => $changes->where('status', ChangeStatus::Submitted)->count(),
                'approved' => $changes->where('status', ChangeStatus::Approved)->count(),
                'implemented' => $changes->where('status', ChangeStatus::Implemented)->count(),
            ],
            'backups' => [
                'total' => $backups->count(),
                'failed' => $backups->where('status', BackupStatus::Failed)->count(),
                'last_success_at' => $backups
                    ->where('status', BackupStatus::Success)
                    ->sortByDesc('started_at')
                    ->first()?->started_at,
                'last_status' => $lastBackup?->status?->value,
            ],
            'systems' => [
                'total' => $systems->count(),
                'up' => $systems->where('status', SystemStatus::Up)->count(),
                'degraded' => $systems->where('status', SystemStatus::Degraded)->count(),
                'down' => $systems->where('status', SystemStatus::Down)->count(),
                'maintenance' => $systems->where('status', SystemStatus::Maintenance)->count(),
            ],
        ];
    }

    private function nextTicketNo(int $campusId): string
    {
        $sequence = HelpdeskTicket::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $ticketNo = sprintf('TKT-%06d', $sequence);
            $sequence++;
        } while (HelpdeskTicket::withTrashed()->where('campus_id', $campusId)->where('ticket_no', $ticketNo)->exists());

        return $ticketNo;
    }
}
