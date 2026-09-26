<?php

namespace App\Services\Accounting;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use Illuminate\Support\Collection;

/**
 * Seeds a standard school/college chart of accounts for a campus. Group accounts
 * (is_group = true) are structural headings; only leaf accounts are postable.
 */
class DefaultChartOfAccounts
{
    /**
     * @return Collection<string, ChartOfAccount>
     */
    public function seed(Campus $campus): Collection
    {
        $tenant = [
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
        ];

        /** @var Collection<string, ChartOfAccount> $accounts */
        $accounts = collect();

        foreach ($this->definition() as $code => $node) {
            $parent = $node['parent'] !== null ? $accounts->get($node['parent']) : null;

            $account = ChartOfAccount::firstOrCreate(
                ['campus_id' => $campus->id, 'code' => $code],
                $tenant + [
                    'parent_id' => $parent?->id,
                    'name' => $node['name'],
                    'account_type' => $node['type'],
                    'normal_balance' => ($node['normal'] ?? $node['type']->normalBalance())->value,
                    'is_group' => $node['group'],
                    'is_active' => true,
                ]
            );

            $accounts->put($code, $account);
        }

        return $accounts;
    }

    /**
     * @return array<string, array{name: string, type: AccountType, group: bool, parent: ?string, normal?: NormalBalance}>
     */
    private function definition(): array
    {
        return [
            '1000' => ['name' => 'Cash and Bank', 'type' => AccountType::Asset, 'group' => true, 'parent' => null],
            '1010' => ['name' => 'Cash in Hand', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1000'],
            '1020' => ['name' => 'Bank Account', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1000'],

            '1100' => ['name' => 'Receivables', 'type' => AccountType::Asset, 'group' => true, 'parent' => null],
            '1110' => ['name' => 'Student Fee Receivable', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1100'],
            '1120' => ['name' => 'Staff Advances', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1100'],

            '1200' => ['name' => 'Prepaid Expenses', 'type' => AccountType::Asset, 'group' => false, 'parent' => null],

            '1300' => ['name' => 'Fixed Assets', 'type' => AccountType::Asset, 'group' => true, 'parent' => null],
            '1310' => ['name' => 'Furniture and Fixtures', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1300'],
            '1320' => ['name' => 'Office and IT Equipment', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1300'],
            '1330' => ['name' => 'Vehicles', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1300'],
            '1340' => ['name' => 'Buildings and Land', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1300'],
            '1350' => ['name' => 'Accumulated Depreciation', 'type' => AccountType::Asset, 'group' => false, 'parent' => '1300', 'normal' => NormalBalance::Credit],

            '2000' => ['name' => 'Payables', 'type' => AccountType::Liability, 'group' => true, 'parent' => null],
            '2010' => ['name' => 'Vendor Payable', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2000'],
            '2020' => ['name' => 'Accrued Salaries', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2000'],
            '2030' => ['name' => 'Fees Received in Advance', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2000'],

            '2100' => ['name' => 'Long-term Liabilities', 'type' => AccountType::Liability, 'group' => true, 'parent' => null],
            '2110' => ['name' => 'Bank Loan', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2100'],
            '2120' => ['name' => 'Mortgage Payable', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2100'],
            '2130' => ['name' => 'Other Liabilities', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2100'],
            '2140' => ['name' => 'Tax Payable', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2100'],
            '2150' => ['name' => 'Withholding Tax Payable', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2100'],
            '2160' => ['name' => 'Payroll Deductions Payable', 'type' => AccountType::Liability, 'group' => false, 'parent' => '2100'],

            '3000' => ['name' => 'Fund Balance', 'type' => AccountType::Equity, 'group' => true, 'parent' => null],
            '3010' => ['name' => 'Capital / Endowment', 'type' => AccountType::Equity, 'group' => false, 'parent' => '3000'],
            '3020' => ['name' => 'Retained Surplus', 'type' => AccountType::Equity, 'group' => false, 'parent' => '3000'],

            '4000' => ['name' => 'Revenue', 'type' => AccountType::Income, 'group' => true, 'parent' => null],
            '4010' => ['name' => 'Tuition Fee Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4020' => ['name' => 'Admission Fee Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4030' => ['name' => 'Transport Fee Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4040' => ['name' => 'Other Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4050' => ['name' => 'Late Fee Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4060' => ['name' => 'Donation Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4070' => ['name' => 'Sales Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4080' => ['name' => 'Commission Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],
            '4090' => ['name' => 'Exam Fee Income', 'type' => AccountType::Income, 'group' => false, 'parent' => '4000'],

            '5000' => ['name' => 'Operating Expenses', 'type' => AccountType::Expense, 'group' => true, 'parent' => null],
            '5010' => ['name' => 'Salaries and Wages', 'type' => AccountType::Expense, 'group' => false, 'parent' => '5000'],
            '5020' => ['name' => 'Utilities', 'type' => AccountType::Expense, 'group' => false, 'parent' => '5000'],
            '5030' => ['name' => 'Teaching Supplies', 'type' => AccountType::Expense, 'group' => false, 'parent' => '5000'],
            '5040' => ['name' => 'Repairs and Maintenance', 'type' => AccountType::Expense, 'group' => false, 'parent' => '5000'],
            '5050' => ['name' => 'Marketing and Promotion', 'type' => AccountType::Expense, 'group' => false, 'parent' => '5000'],
        ];
    }
}
