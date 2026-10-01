<?php

namespace Database\Seeders\Uat;

use App\Enums\BackupStatus;
use App\Enums\BackupType;
use App\Enums\ChangeRisk;
use App\Enums\ChangeStatus;
use App\Enums\ItAssetStatus;
use App\Enums\SystemStatus;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\HelpdeskComment;
use App\Models\HelpdeskTicket;
use App\Models\ItAsset;
use App\Models\ItAssetAssignment;
use App\Models\ItBackupLog;
use App\Models\ItChangeRequest;
use App\Models\ItSystem;

/**
 * Seeds the IT operations domain: systems, assets and assignments, backup
 * logs, change requests and the helpdesk (tickets and comments).
 */
class UatSupportSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 10000);

        $this->systems($ctx);
        $assets = $this->assets($ctx);
        $this->assetAssignments($ctx, $assets);
        $this->backups($ctx);
        $this->changeRequests($ctx);
        $this->helpdesk($ctx, $assets);

        $this->command?->info('UAT:   '.$ctx->campusCode().' - IT systems, assets, backups, changes, helpdesk');
    }

    protected function systems(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['Education Management System', 'erp', 'up', 99.95],
            ['Learning Management System', 'lms', 'up', 99.80],
            ['Campus Website', 'website', 'up', 99.99],
            ['Email & Collaboration', 'email', 'degraded', 98.50],
            ['Online Fee Payment Gateway', 'payment', 'up', 99.70],
            ['Library Management System', 'library', 'up', 99.10],
            ['CCTV & Access Control', 'security', 'maintenance', 97.20],
        ];

        foreach ($definitions as $i => [$name, $type, $status, $uptime]) {
            $this->first(ItSystem::class, [
                'campus_id' => $ctx->campus->id,
                'name' => $name,
            ], $tenant + [
                'type' => $type,
                'url' => 'https://'.strtolower(str_replace([' ', '&'], '-', $type)).'.'.$ctx->campusCode().'.educourt.test',
                'owner' => $ctx->role('it_administrator')?->name ?? 'IT Department',
                'status' => SystemStatus::from($status),
                'uptime_percent' => $uptime,
                'last_checked_at' => now()->subMinutes($i * 7),
                'notes' => 'Monitored by the IT department.',
            ]);
        }
    }

    /**
     * @return array<int, ItAsset>
     */
    protected function assets(UatCampusContext $ctx): array
    {
        $tenant = $this->tenant($ctx->campus);
        $categories = ['laptop', 'desktop', 'printer', 'router', 'projector', 'tablet'];
        $brands = ['Dell', 'HP', 'Lenovo', 'Cisco', 'Epson', 'Samsung'];

        $assets = [];
        for ($i = 1; $i <= 24; $i++) {
            $category = $categories[$i % count($categories)];
            $assigned = $i % 3 !== 0;
            $assignee = $assigned
                ? ($ctx->teachers[($i - 1) % max(1, count($ctx->teachers))] ?? $ctx->campusAdmin)
                : null;

            $assets[] = $this->first(ItAsset::class, [
                'campus_id' => $ctx->campus->id,
                'asset_tag' => 'IT-'.$ctx->campusCode().'-'.sprintf('%04d', $i),
            ], $tenant + [
                'name' => ucfirst($category).' '.sprintf('%02d', $i),
                'category' => $category,
                'brand' => $brands[$i % count($brands)],
                'model_no' => strtoupper(substr($category, 0, 3)).'-'.(1000 + $i),
                'serial_no' => 'SN'.$ctx->campusCode().sprintf('%05d', $i),
                'purchase_date' => $this->day('2023-06-01', $i * 21),
                'cost' => 45000 + ($i % 8) * 12000,
                'warranty_until' => $this->day('2023-06-01', $i * 21 + 1095),
                'status' => $assigned ? ItAssetStatus::Assigned : ItAssetStatus::Available,
                'assigned_to' => $assignee?->id,
                'assigned_on' => $assigned ? $this->day('2026-08-15', $i) : null,
                'location' => $this->pick(['Main Block', 'IT Lab', 'Admin Office', 'Library', 'Accounts Office']),
                'vendor' => $this->pick(['Systems Ltd', 'TechMart Pakistan', 'Computer Zone', 'Digital Solutions']),
                'notes' => 'UAT inventory asset.',
            ]);
        }

        return $assets;
    }

    /**
     * @param  array<int, ItAsset>  $assets
     */
    protected function assetAssignments(UatCampusContext $ctx, array $assets): void
    {
        $tenant = $this->tenant($ctx->campus);
        $createdBy = $ctx->role('it_administrator')?->id ?? $ctx->campusAdmin?->id;

        foreach ($assets as $asset) {
            if ($asset->assigned_to === null) {
                continue;
            }

            ItAssetAssignment::firstOrCreate(
                ['it_asset_id' => $asset->id, 'assigned_to' => $asset->assigned_to, 'assigned_on' => $asset->assigned_on],
                $tenant + [
                    'returned_on' => null,
                    'condition' => 'good',
                    'notes' => 'Currently in use.',
                    'created_by' => $createdBy,
                ]
            );
        }
    }

    protected function backups(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['Nightly Database Backup', BackupType::Database, BackupStatus::Success, '2026-09-28', 512.5],
            ['Weekly Files Backup', BackupType::Files, BackupStatus::Success, '2026-09-27', 4096.0],
            ['Configuration Snapshot', BackupType::Config, BackupStatus::Success, '2026-09-25', 12.4],
            ['Monthly Server Image', BackupType::Server, BackupStatus::Partial, '2026-09-20', 20480.0],
            ['Failed Offsite Backup', BackupType::Database, BackupStatus::Failed, '2026-09-18', 0.0],
        ];

        foreach ($definitions as $i => [$name, $type, $status, $date, $size]) {
            $this->first(ItBackupLog::class, [
                'campus_id' => $ctx->campus->id,
                'name' => $name,
                'started_at' => $date.' 02:00:00',
            ], $tenant + [
                'type' => $type,
                'status' => $status,
                'finished_at' => $date.' 02:'.sprintf('%02d', 15 + $i).':00',
                'size_mb' => $size,
                'location' => $i % 2 === 0 ? 'On-site NAS' : 'Cloud Object Storage',
                'notes' => $status === BackupStatus::Failed ? 'Offsite transfer timed out; retry scheduled.' : 'Completed successfully.',
                'checked_by' => $ctx->role('it_administrator')?->id,
            ]);
        }
    }

    protected function changeRequests(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['Upgrade campus firewall firmware', 'network', ChangeRisk::Medium, ChangeStatus::Approved],
            ['Roll out antivirus to all lab machines', 'software', ChangeRisk::Low, ChangeStatus::Implemented],
            ['Replace failed server hard drive', 'hardware', ChangeRisk::High, ChangeStatus::Submitted],
            ['Update data retention policy', 'policy', ChangeRisk::Low, ChangeStatus::Draft],
            ['Migrate email to new provider', 'software', ChangeRisk::High, ChangeStatus::Rejected],
            ['Scheduled network maintenance', 'maintenance', ChangeRisk::Medium, ChangeStatus::Approved],
        ];

        foreach ($definitions as $i => [$title, $type, $risk, $status]) {
            $decided = in_array($status, [ChangeStatus::Approved, ChangeStatus::Rejected, ChangeStatus::Implemented], true);

            $this->first(ItChangeRequest::class, [
                'campus_id' => $ctx->campus->id,
                'title' => $title,
            ], $tenant + [
                'description' => $title.' requested by the IT department.',
                'type' => $type,
                'risk' => $risk,
                'status' => $status,
                'requested_by' => $ctx->role('it_administrator')?->id,
                'approved_by' => $status === ChangeStatus::Rejected ? null : ($decided ? $ctx->campusAdmin?->id : null),
                'planned_on' => $this->day('2026-10-01', $i * 5),
                'implemented_on' => $status === ChangeStatus::Implemented ? $this->day('2026-10-02', $i * 5) : null,
                'rollback_plan' => 'Restore the previous configuration snapshot and verify connectivity.',
                'decision_notes' => $status === ChangeStatus::Rejected ? 'Deferred due to budget constraints.' : null,
                'decided_at' => $decided ? now() : null,
            ]);
        }
    }

    /**
     * @param  array<int, ItAsset>  $assets
     */
    protected function helpdesk(UatCampusContext $ctx, array $assets): void
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['Projector in Room 12 not turning on', 'hardware', TicketPriority::High, TicketStatus::Open],
            ['Cannot log in to the ERP portal', 'access', TicketPriority::Critical, TicketStatus::InProgress],
            ['Wi-Fi dropping in the library', 'network', TicketPriority::Medium, TicketStatus::InProgress],
            ['Printer showing paper jam', 'hardware', TicketPriority::Low, TicketStatus::Resolved],
            ['LMS course content not loading', 'software', TicketPriority::High, TicketStatus::Resolved],
            ['Request new staff email account', 'access', TicketPriority::Medium, TicketStatus::Closed],
            ['Lab computer running very slowly', 'hardware', TicketPriority::Medium, TicketStatus::Open],
            ['Fee payment gateway error', 'software', TicketPriority::Critical, TicketStatus::Closed],
            ['CCTV camera offline in corridor', 'network', TicketPriority::High, TicketStatus::InProgress],
            ['Install licensed software on admin PC', 'software', TicketPriority::Low, TicketStatus::Closed],
        ];

        $reporters = array_values($ctx->users);
        $itAdmin = $ctx->role('it_administrator')?->id;

        foreach ($definitions as $i => [$subject, $category, $priority, $status]) {
            $ticket = $this->first(HelpdeskTicket::class, [
                'campus_id' => $ctx->campus->id,
                'ticket_no' => 'TKT-'.$ctx->campusCode().'-'.sprintf('%04d', $i + 1),
            ], $tenant + [
                'subject' => $subject,
                'description' => $subject.'. Reported by campus staff through the support portal.',
                'category' => $category,
                'priority' => $priority,
                'status' => $status,
                'reported_by' => $reporters === [] ? $ctx->campusAdmin?->id : $reporters[$i % count($reporters)]->id,
                'assigned_to' => in_array($status, [TicketStatus::Open], true) ? null : $itAdmin,
                'it_asset_id' => $category === 'hardware' ? ($assets[$i % max(1, count($assets))]?->id) : null,
                'sla_due_at' => now()->addHours(8)->subHours($i),
                'resolved_at' => in_array($status, [TicketStatus::Resolved, TicketStatus::Closed], true) ? now()->subDays(1) : null,
                'closed_at' => $status === TicketStatus::Closed ? now() : null,
                'resolution' => in_array($status, [TicketStatus::Resolved, TicketStatus::Closed], true) ? 'Issue diagnosed and resolved by the IT team.' : null,
            ]);

            $this->helpdeskComments($ctx, $ticket, $i, $itAdmin);
        }
    }

    protected function helpdeskComments(UatCampusContext $ctx, HelpdeskTicket $ticket, int $index, ?int $itAdmin): void
    {
        $tenant = $this->tenant($ctx->campus);
        $comments = [
            ['Reported the issue to the IT department.', false],
            ['Investigating the reported issue.', true],
            ['Issue has been resolved and verified with the user.', false],
        ];

        $count = 1 + ($index % 3);
        for ($c = 0; $c < $count; $c++) {
            [$body, $internal] = $comments[$c % count($comments)];

            HelpdeskComment::firstOrCreate(
                ['helpdesk_ticket_id' => $ticket->id, 'body' => $body],
                $tenant + [
                    'user_id' => $internal ? $itAdmin : $ticket->reported_by,
                    'is_internal' => $internal,
                ]
            );
        }
    }
}
