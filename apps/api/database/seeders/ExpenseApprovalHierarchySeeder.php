<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Models\ApprovalWorkflow;
use App\Models\ApprovalWorkflowStep;
use App\Models\Campus;
use Illuminate\Database\Seeder;

/**
 * Configures the campus expense approval hierarchy:
 *   - up to 1,000          -> Accountant
 *   - above 1,000 to below 100,000 -> Finance Head
 *   - 100,000 and above    -> Institution Head
 *
 * Any other active expense workflow on the campus is deactivated so that a
 * single tier always matches an expense amount.
 */
class ExpenseApprovalHierarchySeeder extends Seeder
{
    /**
     * @var array<int, array{code: string, name: string, min: float, max: float|null, role: string, label: string, description: string}>
     */
    private array $tiers = [
        [
            'code' => 'EXPENSE-ACCOUNTANT',
            'name' => 'Expense Approval - Accountant',
            'min' => 0,
            'max' => 1000,
            'role' => RoleName::Accountant->value,
            'label' => 'Accountant approval',
            'description' => 'Expenses up to 1,000 are approved by the Accountant.',
        ],
        [
            'code' => 'EXPENSE-FINANCE-HEAD',
            'name' => 'Expense Approval - Finance Head',
            'min' => 1000.01,
            'max' => 99999.99,
            'role' => RoleName::FinanceHead->value,
            'label' => 'Finance Head approval',
            'description' => 'Expenses above 1,000 and below 100,000 are approved by the Finance Head.',
        ],
        [
            'code' => 'EXPENSE-INSTITUTION-HEAD',
            'name' => 'Expense Approval - Institution Head',
            'min' => 100000,
            'max' => null,
            'role' => RoleName::InstitutionHead->value,
            'label' => 'Institution Head approval',
            'description' => 'Expenses of 100,000 and above are approved by the Institution Head.',
        ],
    ];

    public function run(): void
    {
        Campus::query()->chunkById(100, function ($campuses): void {
            foreach ($campuses as $campus) {
                $this->seedCampus($campus);
            }
        });
    }

    private function seedCampus(Campus $campus): void
    {
        $codes = array_column($this->tiers, 'code');

        ApprovalWorkflow::query()
            ->where('campus_id', $campus->id)
            ->where('entity_type', 'expense')
            ->whereNotIn('code', $codes)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        foreach ($this->tiers as $tier) {
            $workflow = ApprovalWorkflow::withTrashed()->firstOrNew([
                'campus_id' => $campus->id,
                'code' => $tier['code'],
            ]);

            $workflow->fill([
                'institution_id' => $campus->institution_id,
                'name' => $tier['name'],
                'entity_type' => 'expense',
                'min_amount' => $tier['min'],
                'max_amount' => $tier['max'],
                'is_active' => true,
                'description' => $tier['description'],
            ]);

            if ($workflow->trashed()) {
                $workflow->restore();
            }

            $workflow->save();

            ApprovalWorkflowStep::query()->updateOrCreate(
                ['approval_workflow_id' => $workflow->id, 'sequence' => 1],
                [
                    'label' => $tier['label'],
                    'required_role' => $tier['role'],
                    'required_permission' => null,
                    'approver_user_id' => null,
                ],
            );

            $workflow->steps()->where('sequence', '>', 1)->delete();
        }
    }
}
