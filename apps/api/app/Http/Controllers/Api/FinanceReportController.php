<?php

namespace App\Http\Controllers\Api;

use App\Enums\AccountType;
use App\Enums\ExpenseStatus;
use App\Enums\JournalStatus;
use App\Enums\NormalBalance;
use App\Http\Controllers\Controller;
use App\Http\Resources\BankAccountResource;
use App\Models\Asset;
use App\Models\BankAccount;
use App\Models\Budget;
use App\Models\ChartOfAccount;
use App\Models\Expense;
use App\Models\JournalLine;
use App\Models\Liability;
use App\Services\Accounting\BankReconciliationService;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinanceReportController extends Controller
{
    public function __construct(private readonly BankReconciliationService $bankBook) {}

    public function trialBalance(Request $request): JsonResponse
    {
        $rows = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.chart_of_account_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->when($request->filled('fiscal_year_id'), fn ($q) => $q->where('journal_entries.fiscal_year_id', $request->integer('fiscal_year_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('journal_entries.entry_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('journal_entries.entry_date', '<=', $request->date('to')))
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.code', 'chart_of_accounts.name', 'chart_of_accounts.account_type', 'chart_of_accounts.normal_balance')
            ->orderBy('chart_of_accounts.code')
            ->get([
                'chart_of_accounts.id',
                'chart_of_accounts.code',
                'chart_of_accounts.name',
                'chart_of_accounts.account_type',
                'chart_of_accounts.normal_balance',
                DB::raw('SUM(journal_lines.debit) as total_debit'),
                DB::raw('SUM(journal_lines.credit) as total_credit'),
            ]);

        $accounts = $rows->map(function ($row) {
            $debit = (float) $row->total_debit;
            $credit = (float) $row->total_credit;
            $normal = NormalBalance::from($row->normal_balance);
            $balance = $normal === NormalBalance::Debit ? $debit - $credit : $credit - $debit;

            return [
                'chart_of_account_id' => $row->id,
                'code' => $row->code,
                'name' => $row->name,
                'account_type' => $row->account_type,
                'normal_balance' => $row->normal_balance,
                'total_debit' => number_format($debit, 2, '.', ''),
                'total_credit' => number_format($credit, 2, '.', ''),
                'balance' => number_format($balance, 2, '.', ''),
            ];
        });

        return response()->json([
            'data' => $accounts,
            'totals' => [
                'total_debit' => number_format($accounts->sum(fn ($a) => (float) $a['total_debit']), 2, '.', ''),
                'total_credit' => number_format($accounts->sum(fn ($a) => (float) $a['total_credit']), 2, '.', ''),
            ],
        ]);
    }

    public function accountLedger(Request $request, ChartOfAccount $chartOfAccount): JsonResponse
    {
        $lines = JournalLine::query()
            ->with('entry')
            ->where('journal_lines.chart_of_account_id', $chartOfAccount->id)
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->when($request->filled('fiscal_year_id'), fn ($q) => $q->where('journal_entries.fiscal_year_id', $request->integer('fiscal_year_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('journal_entries.entry_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('journal_entries.entry_date', '<=', $request->date('to')))
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_entries.id')
            ->select('journal_lines.*')
            ->get();

        $balance = 0.0;
        $sign = $chartOfAccount->normal_balance === NormalBalance::Debit ? 1 : -1;

        $entries = $lines->map(function (JournalLine $line) use (&$balance, $sign) {
            $balance += $sign * ((float) $line->debit - (float) $line->credit);

            return [
                'journal_entry_id' => $line->journal_entry_id,
                'reference' => $line->entry->reference,
                'entry_date' => $line->entry->entry_date?->toDateString(),
                'description' => $line->description ?? $line->entry->memo,
                'debit' => (string) $line->debit,
                'credit' => (string) $line->credit,
                'running_balance' => number_format($balance, 2, '.', ''),
            ];
        });

        return response()->json([
            'account' => [
                'id' => $chartOfAccount->id,
                'code' => $chartOfAccount->code,
                'name' => $chartOfAccount->name,
                'account_type' => $chartOfAccount->account_type?->value,
                'normal_balance' => $chartOfAccount->normal_balance?->value,
            ],
            'data' => $entries,
            'closing_balance' => number_format($balance, 2, '.', ''),
        ]);
    }

    public function budgetVsActual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'budget_id' => ['required', 'integer', 'exists:budgets,id'],
        ]);

        $budget = Budget::query()
            ->with(['fiscalYear', 'lines.chartOfAccount'])
            ->findOrFail($data['budget_id']);

        $accountIds = $budget->lines->pluck('chart_of_account_id');

        $actuals = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->where('journal_entries.campus_id', $budget->campus_id)
            ->whereDate('journal_entries.entry_date', '>=', $budget->starts_on->toDateString())
            ->whereDate('journal_entries.entry_date', '<=', $budget->ends_on->toDateString())
            ->whereIn('journal_lines.chart_of_account_id', $accountIds)
            ->groupBy('journal_lines.chart_of_account_id')
            ->get([
                'journal_lines.chart_of_account_id',
                DB::raw('SUM(journal_lines.debit) as total_debit'),
                DB::raw('SUM(journal_lines.credit) as total_credit'),
            ])
            ->keyBy('chart_of_account_id');

        $rows = $budget->lines
            ->map(function ($line) use ($actuals) {
                $account = $line->chartOfAccount;
                $movement = $actuals->get($line->chart_of_account_id);
                $debit = (float) ($movement->total_debit ?? 0);
                $credit = (float) ($movement->total_credit ?? 0);

                $normal = $account?->normal_balance ?? NormalBalance::Debit;
                $actual = $normal === NormalBalance::Debit ? $debit - $credit : $credit - $debit;

                $budgetAmount = (float) $line->amount;
                $variance = $actual - $budgetAmount;
                $favorable = $normal === NormalBalance::Debit ? $actual <= $budgetAmount : $actual >= $budgetAmount;

                return [
                    'chart_of_account_id' => $line->chart_of_account_id,
                    'code' => $account?->code,
                    'name' => $account?->name,
                    'account_type' => $account?->account_type?->value,
                    'normal_balance' => $normal->value,
                    'budget' => number_format($budgetAmount, 2, '.', ''),
                    'actual' => number_format($actual, 2, '.', ''),
                    'variance' => number_format($variance, 2, '.', ''),
                    'utilization' => $budgetAmount > 0 ? round($actual / $budgetAmount * 100, 2) : null,
                    'favorable' => $favorable,
                ];
            })
            ->sortBy('code')
            ->values();

        $totalBudget = $budget->lines->sum(fn ($line) => (float) $line->amount);
        $totalActual = $rows->sum(fn (array $row) => (float) $row['actual']);

        return response()->json([
            'budget' => [
                'id' => $budget->id,
                'name' => $budget->name,
                'period_type' => $budget->period_type?->value,
                'starts_on' => $budget->starts_on?->toDateString(),
                'ends_on' => $budget->ends_on?->toDateString(),
                'status' => $budget->status?->value,
                'fiscal_year' => $budget->fiscalYear?->name,
            ],
            'data' => $rows,
            'totals' => [
                'budget' => number_format($totalBudget, 2, '.', ''),
                'actual' => number_format($totalActual, 2, '.', ''),
                'variance' => number_format($totalActual - $totalBudget, 2, '.', ''),
            ],
        ]);
    }

    public function payables(Request $request): JsonResponse
    {
        $asOf = $request->date('as_of') ?? now();
        $asOfStart = $asOf->copy()->startOfDay();

        $expenses = Expense::query()
            ->with('vendor')
            ->whereIn('status', [ExpenseStatus::Approved->value, ExpenseStatus::Partial->value])
            ->orderBy('expense_date')
            ->get();

        $buckets = [
            'current' => 0.0,
            'days_1_30' => 0.0,
            'days_31_60' => 0.0,
            'days_61_90' => 0.0,
            'days_90_plus' => 0.0,
        ];

        $rows = [];
        $vendors = [];

        foreach ($expenses as $expense) {
            $outstanding = round((float) $expense->total - (float) $expense->paid_amount, 2);

            if ($outstanding <= 0) {
                continue;
            }

            $age = (int) $expense->expense_date->startOfDay()->diffInDays($asOfStart, false);

            $bucket = match (true) {
                $age <= 0 => 'current',
                $age <= 30 => 'days_1_30',
                $age <= 60 => 'days_31_60',
                $age <= 90 => 'days_61_90',
                default => 'days_90_plus',
            };

            $buckets[$bucket] += $outstanding;
            $payee = $expense->vendor?->name ?? $expense->payee_name ?? 'Unassigned';
            $vendors[$payee] = true;

            $rows[] = [
                'expense_id' => $expense->id,
                'reference' => $expense->reference,
                'bill_no' => $expense->bill_no,
                'vendor' => $payee,
                'expense_date' => $expense->expense_date?->toDateString(),
                'total' => $expense->total,
                'paid_amount' => $expense->paid_amount,
                'outstanding' => number_format($outstanding, 2, '.', ''),
                'age_days' => $age,
                'bucket' => $bucket,
                'status' => $expense->status?->value,
            ];
        }

        return response()->json([
            'as_of' => $asOf->toDateString(),
            'data' => $rows,
            'summary' => [
                'vendors' => count($vendors),
                'expenses' => count($rows),
                'outstanding' => number_format(array_sum($buckets), 2, '.', ''),
                'buckets' => array_map(fn (float $value) => number_format($value, 2, '.', ''), $buckets),
            ],
        ]);
    }

    public function expenseSummary(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $byCategory = $this->expenseBaseQuery($filters)
            ->join('expense_lines', 'expenses.id', '=', 'expense_lines.expense_id')
            ->join('expense_categories', 'expense_categories.id', '=', 'expense_lines.expense_category_id')
            ->groupBy('expense_categories.id', 'expense_categories.code', 'expense_categories.name')
            ->orderByDesc(DB::raw('SUM(expense_lines.amount)'))
            ->get([
                'expense_categories.id as category_id',
                'expense_categories.code',
                'expense_categories.name',
                DB::raw('SUM(expense_lines.amount) as total'),
                DB::raw('COUNT(DISTINCT expenses.id) as expenses'),
            ])
            ->map(fn ($row) => [
                'category_id' => $row->category_id,
                'code' => $row->code,
                'name' => $row->name,
                'total' => number_format((float) $row->total, 2, '.', ''),
                'expenses' => (int) $row->expenses,
            ]);

        $byVendor = $this->expenseBaseQuery($filters)
            ->leftJoin('vendors', 'vendors.id', '=', 'expenses.vendor_id')
            ->groupBy('vendors.id', 'vendors.name')
            ->orderByDesc(DB::raw('SUM(expenses.total)'))
            ->get([
                'vendors.id as vendor_id',
                'vendors.name',
                DB::raw('SUM(expenses.total) as total'),
                DB::raw('COUNT(expenses.id) as expenses'),
            ])
            ->map(fn ($row) => [
                'vendor_id' => $row->vendor_id,
                'name' => $row->name ?? 'Unassigned',
                'total' => number_format((float) $row->total, 2, '.', ''),
                'expenses' => (int) $row->expenses,
            ]);

        $total = (float) $this->expenseBaseQuery($filters)->sum('total');
        $count = $this->expenseBaseQuery($filters)->count();

        return response()->json([
            'from' => $filters['from'] ?? null,
            'to' => $filters['to'] ?? null,
            'by_category' => $byCategory,
            'by_vendor' => $byVendor,
            'totals' => [
                'expenses' => $count,
                'amount' => number_format($total, 2, '.', ''),
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function expenseBaseQuery(array $filters): Builder
    {
        return Expense::query()
            ->whereIn('status', [
                ExpenseStatus::Approved->value,
                ExpenseStatus::Partial->value,
                ExpenseStatus::Paid->value,
            ])
            ->when(! empty($filters['from']), fn ($q) => $q->whereDate('expense_date', '>=', $filters['from']))
            ->when(! empty($filters['to']), fn ($q) => $q->whereDate('expense_date', '<=', $filters['to']));
    }

    public function cashBook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bank_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $to = $data['to'] ?? now()->toDateString();

        if (! empty($data['bank_account_id'])) {
            $account = BankAccount::query()->with('chartOfAccount')->findOrFail($data['bank_account_id']);
            $from = $data['from'] ?? now()->startOfMonth()->toDateString();
            $statement = $this->bankBook->statement($account, $from, $to);

            return response()->json([
                'account' => BankAccountResource::make($account),
                'from' => $from,
                'to' => $to,
                'opening_balance' => number_format($statement['opening_balance'], 2, '.', ''),
                'closing_balance' => number_format($statement['closing_balance'], 2, '.', ''),
                'data' => $statement['lines'],
            ]);
        }

        $accounts = BankAccount::query()
            ->with('chartOfAccount')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $rows = $accounts->map(function (BankAccount $account) use ($to) {
            $balance = $this->bankBook->bookBalance($account, $to);

            return [
                'bank_account_id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type?->value,
                'currency' => $account->currency,
                'opening_balance' => number_format($balance['opening_balance'], 2, '.', ''),
                'debit' => number_format($balance['debit'], 2, '.', ''),
                'credit' => number_format($balance['credit'], 2, '.', ''),
                'closing_balance' => number_format($balance['closing_balance'], 2, '.', ''),
            ];
        });

        return response()->json([
            'as_of' => $to,
            'data' => $rows->values(),
            'totals' => [
                'accounts' => $rows->count(),
                'closing_balance' => number_format($rows->sum(fn (array $row) => (float) $row['closing_balance']), 2, '.', ''),
            ],
        ]);
    }

    public function assetRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'as_of' => ['nullable', 'date'],
            'status' => ['nullable', 'string'],
            'category' => ['nullable', 'string'],
        ]);

        $asOf = isset($data['as_of']) ? CarbonImmutable::parse($data['as_of']) : CarbonImmutable::now();

        $assets = Asset::query()
            ->with('chartOfAccount')
            ->when(! empty($data['status']), fn ($q) => $q->where('status', $data['status']))
            ->when(! empty($data['category']), fn ($q) => $q->where('category', $data['category']))
            ->orderBy('code')
            ->get();

        $rows = $assets->map(fn (Asset $asset) => [
            'id' => $asset->id,
            'code' => $asset->code,
            'name' => $asset->name,
            'category' => $asset->category,
            'status' => $asset->status?->value,
            'acquisition_date' => $asset->acquisition_date?->toDateString(),
            'acquisition_cost' => number_format((float) $asset->acquisition_cost, 2, '.', ''),
            'salvage_value' => number_format((float) $asset->salvage_value, 2, '.', ''),
            'monthly_depreciation' => number_format($asset->monthlyDepreciation(), 2, '.', ''),
            'accumulated_depreciation' => number_format($asset->accumulatedDepreciation($asOf), 2, '.', ''),
            'book_value' => number_format($asset->bookValue($asOf), 2, '.', ''),
            'chart_of_account_id' => $asset->chart_of_account_id,
        ])->values();

        $byCategory = $rows
            ->groupBy(fn (array $row) => $row['category'] ?? 'Uncategorised')
            ->map(fn (Collection $group, string $category) => [
                'category' => $category,
                'assets' => $group->count(),
                'cost' => number_format($group->sum(fn (array $row) => (float) $row['acquisition_cost']), 2, '.', ''),
                'accumulated_depreciation' => number_format($group->sum(fn (array $row) => (float) $row['accumulated_depreciation']), 2, '.', ''),
                'book_value' => number_format($group->sum(fn (array $row) => (float) $row['book_value']), 2, '.', ''),
            ])
            ->values();

        return response()->json([
            'as_of' => $asOf->toDateString(),
            'data' => $rows,
            'by_category' => $byCategory,
            'totals' => [
                'assets' => $rows->count(),
                'cost' => number_format($rows->sum(fn (array $row) => (float) $row['acquisition_cost']), 2, '.', ''),
                'accumulated_depreciation' => number_format($rows->sum(fn (array $row) => (float) $row['accumulated_depreciation']), 2, '.', ''),
                'book_value' => number_format($rows->sum(fn (array $row) => (float) $row['book_value']), 2, '.', ''),
            ],
        ]);
    }

    public function liabilityRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string'],
            'type' => ['nullable', 'string'],
        ]);

        $liabilities = Liability::query()
            ->with('chartOfAccount')
            ->when(! empty($data['status']), fn ($q) => $q->where('status', $data['status']))
            ->when(! empty($data['type']), fn ($q) => $q->where('type', $data['type']))
            ->orderBy('code')
            ->get();

        $rows = $liabilities->map(fn (Liability $liability) => [
            'id' => $liability->id,
            'code' => $liability->code,
            'name' => $liability->name,
            'type' => $liability->type?->value,
            'lender' => $liability->lender,
            'principal_amount' => number_format((float) $liability->principal_amount, 2, '.', ''),
            'interest_rate' => $liability->interest_rate,
            'starts_on' => $liability->starts_on?->toDateString(),
            'matures_on' => $liability->matures_on?->toDateString(),
            'installment_amount' => $liability->installment_amount,
            'outstanding_amount' => number_format((float) $liability->outstanding_amount, 2, '.', ''),
            'status' => $liability->status?->value,
            'chart_of_account_id' => $liability->chart_of_account_id,
        ])->values();

        $byType = $rows
            ->groupBy(fn (array $row) => $row['type'] ?? 'other')
            ->map(fn (Collection $group, string $type) => [
                'type' => $type,
                'liabilities' => $group->count(),
                'principal' => number_format($group->sum(fn (array $row) => (float) $row['principal_amount']), 2, '.', ''),
                'outstanding' => number_format($group->sum(fn (array $row) => (float) $row['outstanding_amount']), 2, '.', ''),
            ])
            ->values();

        return response()->json([
            'data' => $rows,
            'by_type' => $byType,
            'totals' => [
                'liabilities' => $rows->count(),
                'principal' => number_format($rows->sum(fn (array $row) => (float) $row['principal_amount']), 2, '.', ''),
                'outstanding' => number_format($rows->sum(fn (array $row) => (float) $row['outstanding_amount']), 2, '.', ''),
            ],
        ]);
    }

    public function surplusDeficit(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'fiscal_year_id' => ['nullable', 'integer', 'exists:fiscal_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $income = $this->accountBalances([AccountType::Income], $filters);
        $expense = $this->accountBalances([AccountType::Expense], $filters);

        $incomeTotal = $income->sum(fn (array $row) => (float) $row['balance']);
        $expenseTotal = $expense->sum(fn (array $row) => (float) $row['balance']);
        $net = $incomeTotal - $expenseTotal;

        return response()->json([
            'from' => $filters['from'] ?? null,
            'to' => $filters['to'] ?? null,
            'income' => $income,
            'expense' => $expense,
            'totals' => [
                'income' => number_format($incomeTotal, 2, '.', ''),
                'expense' => number_format($expenseTotal, 2, '.', ''),
                'net' => number_format($net, 2, '.', ''),
                'result' => $net >= 0 ? 'surplus' : 'deficit',
            ],
        ]);
    }

    public function consolidatedStatement(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'fiscal_year_id' => ['nullable', 'integer', 'exists:fiscal_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $income = $this->accountBalances([AccountType::Income], $filters);
        $expense = $this->accountBalances([AccountType::Expense], $filters);
        $assets = $this->accountBalances([AccountType::Asset], $filters);
        $liabilities = $this->accountBalances([AccountType::Liability], $filters);
        $equity = $this->accountBalances([AccountType::Equity], $filters);

        $sum = fn (Collection $rows) => $rows->sum(fn (array $row) => (float) $row['balance']);

        $incomeTotal = $sum($income);
        $expenseTotal = $sum($expense);
        $net = $incomeTotal - $expenseTotal;
        $totalAssets = $sum($assets);
        $totalLiabilities = $sum($liabilities);
        $totalEquity = $sum($equity);
        $funded = $totalLiabilities + $totalEquity + $net;

        return response()->json([
            'from' => $filters['from'] ?? null,
            'to' => $filters['to'] ?? null,
            'income_statement' => [
                'income' => $income,
                'expense' => $expense,
                'totals' => [
                    'income' => number_format($incomeTotal, 2, '.', ''),
                    'expense' => number_format($expenseTotal, 2, '.', ''),
                    'net' => number_format($net, 2, '.', ''),
                    'result' => $net >= 0 ? 'surplus' : 'deficit',
                ],
            ],
            'balance_sheet' => [
                'assets' => $assets,
                'liabilities' => $liabilities,
                'equity' => $equity,
                'totals' => [
                    'assets' => number_format($totalAssets, 2, '.', ''),
                    'liabilities' => number_format($totalLiabilities, 2, '.', ''),
                    'equity' => number_format($totalEquity, 2, '.', ''),
                    'current_result' => number_format($net, 2, '.', ''),
                    'liabilities_and_equity' => number_format($funded, 2, '.', ''),
                    'balanced' => abs($totalAssets - $funded) <= 0.005,
                ],
            ],
        ]);
    }

    /**
     * @param  array<int, AccountType>  $types
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    private function accountBalances(array $types, array $filters): Collection
    {
        $query = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.chart_of_account_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->whereIn('chart_of_accounts.account_type', array_map(fn (AccountType $type) => $type->value, $types))
            ->when(! empty($filters['fiscal_year_id']), fn ($q) => $q->where('journal_entries.fiscal_year_id', $filters['fiscal_year_id']))
            ->when(! empty($filters['from']), fn ($q) => $q->whereDate('journal_entries.entry_date', '>=', $filters['from']))
            ->when(! empty($filters['to']), fn ($q) => $q->whereDate('journal_entries.entry_date', '<=', $filters['to']));

        $this->applyCampusScope($query);

        return $query
            ->groupBy(
                'chart_of_accounts.id',
                'chart_of_accounts.code',
                'chart_of_accounts.name',
                'chart_of_accounts.account_type',
                'chart_of_accounts.normal_balance',
            )
            ->orderBy('chart_of_accounts.code')
            ->get([
                'chart_of_accounts.id',
                'chart_of_accounts.code',
                'chart_of_accounts.name',
                'chart_of_accounts.account_type',
                'chart_of_accounts.normal_balance',
                DB::raw('SUM(journal_lines.debit) as total_debit'),
                DB::raw('SUM(journal_lines.credit) as total_credit'),
            ])
            ->map(function ($row) {
                $debit = (float) $row->total_debit;
                $credit = (float) $row->total_credit;
                $normal = NormalBalance::from($row->normal_balance);
                $balance = $normal === NormalBalance::Debit ? $debit - $credit : $credit - $debit;

                return [
                    'chart_of_account_id' => $row->id,
                    'code' => $row->code,
                    'name' => $row->name,
                    'account_type' => $row->account_type,
                    'normal_balance' => $row->normal_balance,
                    'total_debit' => number_format($debit, 2, '.', ''),
                    'total_credit' => number_format($credit, 2, '.', ''),
                    'balance' => number_format($balance, 2, '.', ''),
                ];
            });
    }

    private function applyCampusScope(Builder $query, string $column = 'journal_entries.campus_id'): void
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);

        if ($context->shouldEnforceCampus()) {
            $query->where($column, $context->campusId());
        }
    }
}
