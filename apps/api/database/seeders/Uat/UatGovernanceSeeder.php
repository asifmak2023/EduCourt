<?php

namespace Database\Seeders\Uat;

use App\Enums\ApprovalActionType;
use App\Enums\ApprovalStatus;
use App\Enums\RoleName;
use App\Models\ApprovalRequest;
use App\Models\ApprovalRequestAction;
use App\Models\ApprovalWorkflow;
use App\Models\ApprovalWorkflowStep;
use App\Models\Expense;
use App\Models\SsoIdentity;
use App\Models\SsoProvider;

/**
 * Seeds the governance domains: approval workflows, their steps, sample
 * approval requests and actions, plus SSO providers and linked identities.
 */
class UatGovernanceSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 12000);

        $workflows = $this->workflows($ctx);
        $this->steps($ctx, $workflows);
        $this->requests($ctx, $workflows);
        $this->sso($ctx);

        $this->command?->info('UAT:   '.$ctx->campusCode().' - approval workflows and SSO');
    }

    /**
     * @return array<string, ApprovalWorkflow>
     */
    protected function workflows(UatCampusContext $ctx): array
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['EXPENSE-APPROVAL', 'Expense Approval', 'expense', 0, 100000, 'Two-step approval for campus expenses.'],
            ['PURCHASE-APPROVAL', 'Purchase Approval', 'purchase_order', 50000, 1000000, 'Approval for large purchase orders.'],
            ['LEAVE-APPROVAL', 'Staff Leave Approval', 'leave', 0, null, 'Approval for staff leave requests.'],
        ];

        $workflows = [];
        foreach ($definitions as [$code, $name, $entityType, $min, $max, $description]) {
            $workflows[$code] = $this->first(ApprovalWorkflow::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'entity_type' => $entityType,
                'min_amount' => $min,
                'max_amount' => $max,
                'is_active' => true,
                'description' => $description,
            ]);
        }

        return $workflows;
    }

    /**
     * @param  array<string, ApprovalWorkflow>  $workflows
     */
    protected function steps(UatCampusContext $ctx, array $workflows): void
    {
        $definitions = [
            'EXPENSE-APPROVAL' => [
                [1, 'Finance Head Review', RoleName::FinanceHead->value],
                [2, 'Campus Admin Approval', RoleName::CampusAdmin->value],
            ],
            'PURCHASE-APPROVAL' => [
                [1, 'Store Incharge Review', RoleName::StoreIncharge->value],
                [2, 'Finance Head Approval', RoleName::FinanceHead->value],
                [3, 'Principal Approval', RoleName::Principal->value],
            ],
            'LEAVE-APPROVAL' => [
                [1, 'HR Officer Review', RoleName::HrOfficer->value],
                [2, 'Principal Approval', RoleName::Principal->value],
            ],
        ];

        foreach ($definitions as $code => $steps) {
            $workflow = $workflows[$code];
            foreach ($steps as [$sequence, $label, $role]) {
                ApprovalWorkflowStep::firstOrCreate(
                    ['approval_workflow_id' => $workflow->id, 'sequence' => $sequence],
                    [
                        'label' => $label,
                        'required_role' => $role,
                        'required_permission' => null,
                        'approver_user_id' => null,
                    ]
                );
            }
        }
    }

    /**
     * @param  array<string, ApprovalWorkflow>  $workflows
     */
    protected function requests(UatCampusContext $ctx, array $workflows): void
    {
        $expenses = Expense::query()
            ->where('campus_id', $ctx->campus->id)
            ->orderBy('id')
            ->limit(6)
            ->get();

        if ($expenses->isEmpty()) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $statuses = [
            ApprovalStatus::Pending,
            ApprovalStatus::Approved,
            ApprovalStatus::Rejected,
            ApprovalStatus::Cancelled,
            ApprovalStatus::Approved,
            ApprovalStatus::Pending,
        ];

        foreach ($expenses as $i => $expense) {
            $status = $statuses[$i % count($statuses)];
            $requestedBy = $ctx->role('accountant')?->id ?? $ctx->role('finance_head')?->id;
            $decided = in_array($status, [ApprovalStatus::Approved, ApprovalStatus::Rejected], true);

            $request = ApprovalRequest::firstOrCreate(
                [
                    'approval_workflow_id' => $workflows['EXPENSE-APPROVAL']->id,
                    'approvable_type' => $expense->getMorphClass(),
                    'approvable_id' => $expense->id,
                ],
                $tenant + [
                    'amount' => $expense->total,
                    'requested_by' => $requestedBy,
                    'decided_by' => $decided ? $ctx->role('principal')?->id : null,
                    'status' => $status,
                    'current_sequence' => $decided ? 2 : 1,
                    'notes' => 'Approval request raised for expense '.$expense->reference.'.',
                    'decided_at' => $decided ? now() : null,
                ]
            );

            $this->actions($ctx, $request, $status, $i);
        }
    }

    protected function actions(UatCampusContext $ctx, ApprovalRequest $request, ApprovalStatus $status, int $index): void
    {
        if ($status === ApprovalStatus::Pending) {
            return;
        }

        $action = $status === ApprovalStatus::Rejected
            ? ApprovalActionType::Rejected
            : ApprovalActionType::Approved;

        ApprovalRequestAction::firstOrCreate(
            ['approval_request_id' => $request->id, 'sequence' => 1],
            [
                'user_id' => $ctx->role('finance_head')?->id ?? $ctx->campusAdmin?->id,
                'action' => $action,
                'comment' => $action === ApprovalActionType::Rejected ? 'Budget not available this quarter.' : 'Reviewed and recommended.',
                'acted_at' => now()->subDays(2),
            ]
        );

        if ($status === ApprovalStatus::Approved) {
            ApprovalRequestAction::firstOrCreate(
                ['approval_request_id' => $request->id, 'sequence' => 2],
                [
                    'user_id' => $ctx->role('principal')?->id ?? $ctx->campusAdmin?->id,
                    'action' => ApprovalActionType::Approved,
                    'comment' => 'Final approval granted.',
                    'acted_at' => now()->subDays(1),
                ]
            );
        }
    }

    protected function sso(UatCampusContext $ctx): void
    {
        $provider = SsoProvider::firstOrCreate(
            ['institution_id' => $ctx->institution->id, 'provider' => 'microsoft'],
            [
                'name' => $ctx->institution->name.' Microsoft Entra ID',
                'client_id' => 'uat-'.strtolower($ctx->institution->code).'-client',
                'client_secret' => 'uat-secret-'.strtolower($ctx->institution->code),
                'authorize_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
                'token_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                'userinfo_url' => 'https://graph.microsoft.com/oidc/userinfo',
                'logout_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
                'redirect_uri' => 'https://educourt.test/auth/sso/microsoft/callback',
                'scopes' => 'openid profile email',
                'is_active' => true,
                'jit_provisioning' => true,
                'default_role' => RoleName::Teacher->value,
            ]
        );

        $identities = array_filter([
            $ctx->campusAdmin,
            $ctx->teacher(0),
            $ctx->teacher(1),
        ]);

        foreach ($identities as $user) {
            SsoIdentity::firstOrCreate(
                ['user_id' => $user->id, 'sso_provider_id' => $provider->id],
                [
                    'subject' => 'uat|'.$ctx->campusCode().'|'.$user->id,
                    'email' => $user->email,
                    'last_login_at' => now()->subDays($user->id % 7),
                ]
            );
        }
    }
}
