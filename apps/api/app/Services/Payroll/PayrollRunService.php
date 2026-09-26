<?php

namespace App\Services\Payroll;

use App\Enums\JournalStatus;
use App\Enums\PaymentMethod;
use App\Enums\PayrollRunStatus;
use App\Enums\SalaryCalculation;
use App\Enums\SalaryComponentType;
use App\Enums\StaffStatus;
use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\PayrollAdjustment;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\StaffMember;
use App\Models\StaffSalary;
use App\Services\Accounting\JournalService;
use App\Services\Approvals\ApprovalService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Builds monthly payroll runs from each staff member's salary structure plus any
 * period adjustments, then posts the approved run to the ledger.
 *
 * Approval:  Dr Salaries and Wages       Cr Accrued Salaries (net)
 *                                        Cr Payroll Deductions Payable
 * Payment:   Dr Accrued Salaries         Cr Cash/Bank
 */
class PayrollRunService
{
    public function __construct(
        private readonly JournalService $journals,
        private readonly ApprovalService $approvals,
    ) {}

    public function generate(PayrollRun $run, ?int $userId): PayrollRun
    {
        if ($run->status !== PayrollRunStatus::Draft) {
            abort(409, 'Only draft payroll runs can be generated.');
        }

        [$periodStart, $periodEnd] = $this->periodBounds($run->period);

        return DB::transaction(function () use ($run, $userId, $periodStart, $periodEnd) {
            $run->payslips()->each(fn (Payslip $slip) => $slip->items()->delete());
            $run->payslips()->delete();

            PayrollAdjustment::query()
                ->where('campus_id', $run->campus_id)
                ->where('period', $run->period)
                ->update(['is_applied' => false]);

            $staff = StaffMember::query()
                ->where('campus_id', $run->campus_id)
                ->whereIn('status', $this->employedStatuses())
                ->whereDate('joining_date', '<=', $periodEnd)
                ->where(fn ($q) => $q->whereNull('leaving_date')->orWhereDate('leaving_date', '>=', $periodStart))
                ->get();

            $totalGross = 0.0;
            $totalDeductions = 0.0;

            foreach ($staff as $member) {
                $salary = StaffSalary::query()
                    ->with(['items.component'])
                    ->where('staff_member_id', $member->id)
                    ->where('is_active', true)
                    ->whereDate('effective_from', '<=', $periodEnd)
                    ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $periodStart))
                    ->orderByDesc('effective_from')
                    ->first();

                if ($salary === null) {
                    continue;
                }

                $payslip = $this->buildPayslip($run, $member, $salary, $periodStart, $periodEnd);

                $totalGross += (float) $payslip->gross;
                $totalDeductions += (float) $payslip->deductions;
            }

            $run->forceFill([
                'total_gross' => round($totalGross, 2),
                'total_deductions' => round($totalDeductions, 2),
                'total_net' => round($totalGross - $totalDeductions, 2),
                'generated_by' => $userId ?? $run->generated_by,
            ])->save();

            return $run->refresh()->load('payslips.staffMember');
        });
    }

    public function approve(PayrollRun $run, ?int $userId): PayrollRun
    {
        if ($run->status !== PayrollRunStatus::Draft) {
            abort(409, 'Only draft payroll runs can be approved.');
        }

        if (! $run->payslips()->exists()) {
            throw ValidationException::withMessages([
                'payslips' => ['Generate the payroll run before approving it.'],
            ]);
        }

        $gross = (float) $run->total_gross;
        $net = (float) $run->total_net;
        $deductions = (float) $run->total_deductions;

        if ($gross <= 0) {
            throw ValidationException::withMessages([
                'total' => ['The payroll total must be greater than zero.'],
            ]);
        }

        $this->approvals->assertMayProceed($run, 'payroll_run', (int) $run->campus_id, $gross);

        [, $periodEnd] = $this->periodBounds($run->period);
        $fiscalYear = $this->fiscalYearFor($periodEnd);

        DB::transaction(function () use ($run, $userId, $gross, $net, $deductions, $fiscalYear, $periodEnd) {
            $entry = JournalEntry::create([
                'institution_id' => $run->institution_id,
                'campus_id' => $run->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $periodEnd,
                'status' => JournalStatus::Draft,
                'memo' => "Payroll for {$run->period}",
                'source_type' => $run->getMorphClass(),
                'source_id' => $run->id,
            ]);

            $entry->lines()->create([
                'chart_of_account_id' => $this->account((int) $run->campus_id, config('finance.accounts.salary_expense'))->id,
                'line_no' => 1,
                'description' => 'Salaries and wages',
                'debit' => $gross,
                'credit' => 0,
            ]);

            $entry->lines()->create([
                'chart_of_account_id' => $this->account((int) $run->campus_id, config('finance.accounts.salary_payable'))->id,
                'line_no' => 2,
                'description' => 'Net salaries payable',
                'debit' => 0,
                'credit' => $net,
            ]);

            if ($deductions > 0) {
                $entry->lines()->create([
                    'chart_of_account_id' => $this->account((int) $run->campus_id, config('finance.accounts.payroll_deductions_payable'))->id,
                    'line_no' => 3,
                    'description' => 'Payroll deductions payable',
                    'debit' => 0,
                    'credit' => $deductions,
                ]);
            }

            $this->journals->post($entry, $userId);

            $run->forceFill([
                'journal_entry_id' => $entry->id,
                'status' => PayrollRunStatus::Approved,
                'approved_by' => $userId,
                'approved_at' => now(),
                'fiscal_year_id' => $fiscalYear->id,
            ])->save();
        });

        return $run->refresh()->load('payslips');
    }

    public function markPaid(PayrollRun $run, PaymentMethod $method, ?int $userId): PayrollRun
    {
        if ($run->status !== PayrollRunStatus::Approved) {
            abort(409, 'Only approved payroll runs can be paid.');
        }

        $net = (float) $run->total_net;

        $fiscalYear = $this->fiscalYearFor(now()->toDateString());

        DB::transaction(function () use ($run, $method, $userId, $net, $fiscalYear) {
            $entry = JournalEntry::create([
                'institution_id' => $run->institution_id,
                'campus_id' => $run->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => now()->toDateString(),
                'status' => JournalStatus::Draft,
                'memo' => "Payroll payment for {$run->period}",
                'source_type' => $run->getMorphClass(),
                'source_id' => $run->id,
            ]);

            $entry->lines()->create([
                'chart_of_account_id' => $this->account((int) $run->campus_id, config('finance.accounts.salary_payable'))->id,
                'line_no' => 1,
                'description' => 'Net salaries payable',
                'debit' => $net,
                'credit' => 0,
            ]);

            $entry->lines()->create([
                'chart_of_account_id' => $this->account((int) $run->campus_id, $this->settlementAccountCode($method))->id,
                'line_no' => 2,
                'description' => 'Salaries paid',
                'debit' => 0,
                'credit' => $net,
            ]);

            $this->journals->post($entry, $userId);

            $run->forceFill([
                'status' => PayrollRunStatus::Paid,
                'payment_method' => $method->value,
                'paid_at' => now(),
            ])->save();
        });

        return $run->refresh();
    }

    private function buildPayslip(PayrollRun $run, StaffMember $member, StaffSalary $salary, string $periodStart, string $periodEnd): Payslip
    {
        $basic = round((float) $salary->basic_salary, 2);

        $payslip = $run->payslips()->create([
            'institution_id' => $run->institution_id,
            'campus_id' => $run->campus_id,
            'staff_member_id' => $member->id,
            'staff_salary_id' => $salary->id,
            'basic' => $basic,
            'working_days' => Carbon::parse($periodStart)->daysInMonth,
        ]);

        $earnings = 0.0;
        $deductions = 0.0;

        foreach ($salary->items as $item) {
            $component = $item->component;

            if ($component === null) {
                continue;
            }

            $amount = (float) ($item->amount
                ?? ($item->percentage !== null
                    ? $basic * (float) $item->percentage / 100
                    : ($component->calculation === SalaryCalculation::PercentageOfBasic
                        ? $basic * (float) $component->default_percentage / 100
                        : (float) $component->default_amount)));

            $amount = round($amount, 2);

            if ($amount <= 0) {
                continue;
            }

            $type = $component->type ?? SalaryComponentType::Earning;

            $payslip->items()->create([
                'label' => $component->name,
                'type' => $type,
                'amount' => $amount,
                'source' => 'component',
                'salary_component_id' => $component->id,
            ]);

            if ($type === SalaryComponentType::Earning) {
                $earnings += $amount;
            } else {
                $deductions += $amount;
            }
        }

        $adjustments = PayrollAdjustment::query()
            ->where('staff_member_id', $member->id)
            ->where('period', $run->period)
            ->where('is_applied', false)
            ->get();

        foreach ($adjustments as $adjustment) {
            $amount = round((float) $adjustment->amount, 2);

            if ($amount <= 0) {
                continue;
            }

            $type = $adjustment->type->isEarning() ? SalaryComponentType::Earning : SalaryComponentType::Deduction;

            $payslip->items()->create([
                'label' => $adjustment->type->label().($adjustment->reason ? " ({$adjustment->reason})" : ''),
                'type' => $type,
                'amount' => $amount,
                'source' => 'adjustment',
                'payroll_adjustment_id' => $adjustment->id,
            ]);

            if ($type === SalaryComponentType::Earning) {
                $earnings += $amount;
            } else {
                $deductions += $amount;
            }

            $adjustment->forceFill(['is_applied' => true])->save();
        }

        $gross = round($basic + $earnings, 2);
        $deductions = round($deductions, 2);

        $payslip->forceFill([
            'gross' => $gross,
            'deductions' => $deductions,
            'net' => round($gross - $deductions, 2),
        ])->save();

        return $payslip;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function periodBounds(string $period): array
    {
        $start = Carbon::createFromFormat('Y-m', $period)->startOfMonth();

        return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
    }

    /**
     * @return array<int, string>
     */
    private function employedStatuses(): array
    {
        return array_values(array_map(
            fn (StaffStatus $status) => $status->value,
            array_filter(StaffStatus::cases(), fn (StaffStatus $status) => $status->isEmployed()),
        ));
    }

    private function account(int $campusId, string $code): ChartOfAccount
    {
        $account = ChartOfAccount::query()
            ->where('campus_id', $campusId)
            ->where('code', $code)
            ->where('is_group', false)
            ->first();

        if ($account === null) {
            throw ValidationException::withMessages([
                'account' => ["Chart of accounts is missing the required account [{$code}]."],
            ]);
        }

        return $account;
    }

    private function fiscalYearFor(string $date): FiscalYear
    {
        $fiscalYear = FiscalYear::query()
            ->whereDate('starts_on', '<=', $date)
            ->whereDate('ends_on', '>=', $date)
            ->orderByDesc('starts_on')
            ->first()
            ?? FiscalYear::query()->where('is_current', true)->first();

        if ($fiscalYear === null) {
            throw ValidationException::withMessages([
                'fiscal_year' => ['No fiscal year covers this date. Create a fiscal year first.'],
            ]);
        }

        return $fiscalYear;
    }

    private function settlementAccountCode(PaymentMethod $method): string
    {
        return $method === PaymentMethod::Cash
            ? config('finance.accounts.cash')
            : config('finance.accounts.bank');
    }
}
