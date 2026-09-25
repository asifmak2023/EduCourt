<?php

namespace App\Http\Controllers\Api;

use App\Enums\AccountingPeriodStatus;
use App\Enums\JournalStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AccountingPeriodResource;
use App\Models\AccountingPeriod;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountingPeriodController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $periods = AccountingPeriod::query()
            ->with(['fiscalYear', 'closedBy', 'lockedBy'])
            ->when($request->filled('fiscal_year_id'), fn ($q) => $q->where('fiscal_year_id', $request->integer('fiscal_year_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderBy('starts_on')
            ->paginate($request->integer('per_page', 100));

        return AccountingPeriodResource::collection($periods);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules(
            $tenant['campus_id'],
            fiscalYearId: $request->integer('fiscal_year_id') ?: null,
        ));

        $period = AccountingPeriod::create($data + $tenant + [
            'status' => AccountingPeriodStatus::Open,
        ]);

        return (new AccountingPeriodResource($period->load('fiscalYear')))
            ->response()->setStatusCode(201);
    }

    public function generate(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'fiscal_year_id' => [
                'required', 'integer',
                Rule::exists('fiscal_years', 'id')
                    ->where('campus_id', $tenant['campus_id'])
                    ->whereNull('deleted_at'),
            ],
        ]);

        /** @var FiscalYear $fiscalYear */
        $fiscalYear = FiscalYear::query()->findOrFail($data['fiscal_year_id']);

        $created = DB::transaction(function () use ($fiscalYear, $tenant) {
            $periods = [];
            $cursor = CarbonImmutable::parse($fiscalYear->starts_on)->startOfMonth();
            $end = CarbonImmutable::parse($fiscalYear->ends_on);

            while ($cursor->lessThanOrEqualTo($end)) {
                $periodEnd = $cursor->endOfMonth()->min($end);
                $name = $cursor->format('M Y');

                $periods[] = AccountingPeriod::firstOrCreate(
                    ['fiscal_year_id' => $fiscalYear->id, 'name' => $name],
                    $tenant + [
                        'starts_on' => $cursor->toDateString(),
                        'ends_on' => $periodEnd->toDateString(),
                        'status' => AccountingPeriodStatus::Open,
                    ]
                );

                $cursor = $cursor->addMonth()->startOfMonth();
            }

            return collect($periods);
        });

        return response()->json([
            'data' => AccountingPeriodResource::collection(
                AccountingPeriod::query()
                    ->with(['fiscalYear', 'closedBy', 'lockedBy'])
                    ->whereKey($created->pluck('id'))
                    ->orderBy('starts_on')
                    ->get()
            )->resolve(),
            'message' => "{$created->count()} accounting periods generated.",
        ], 201);
    }

    public function show(AccountingPeriod $accountingPeriod): AccountingPeriodResource
    {
        return new AccountingPeriodResource(
            $accountingPeriod->load(['fiscalYear', 'closedBy', 'lockedBy'])
        );
    }

    public function update(Request $request, AccountingPeriod $accountingPeriod): AccountingPeriodResource
    {
        $this->assertOpen($accountingPeriod, 'Only open periods can be changed.');

        $data = $request->validate($this->rules(
            $accountingPeriod->campus_id,
            $accountingPeriod->id,
            $accountingPeriod->fiscal_year_id,
            false,
        ));

        $accountingPeriod->update($data);

        return new AccountingPeriodResource(
            $accountingPeriod->refresh()->load(['fiscalYear', 'closedBy', 'lockedBy'])
        );
    }

    public function destroy(AccountingPeriod $accountingPeriod): JsonResponse
    {
        $this->assertOpen($accountingPeriod, 'Only open periods can be archived.');

        $accountingPeriod->delete();

        return response()->json(['message' => 'Accounting period archived.']);
    }

    public function close(Request $request, AccountingPeriod $accountingPeriod): AccountingPeriodResource
    {
        if ($accountingPeriod->status !== AccountingPeriodStatus::Open) {
            throw ValidationException::withMessages([
                'status' => ['Only open periods can be closed.'],
            ]);
        }

        $drafts = JournalEntry::query()
            ->where('fiscal_year_id', $accountingPeriod->fiscal_year_id)
            ->whereDate('entry_date', '>=', $accountingPeriod->starts_on->toDateString())
            ->whereDate('entry_date', '<=', $accountingPeriod->ends_on->toDateString())
            ->where('status', JournalStatus::Draft->value)
            ->count();

        if ($drafts > 0) {
            throw ValidationException::withMessages([
                'status' => ["{$drafts} draft journal entr(ies) fall in this period; post or remove them first."],
            ]);
        }

        $accountingPeriod->forceFill([
            'status' => AccountingPeriodStatus::Closed,
            'closed_at' => now(),
            'closed_by' => $request->user()->id,
        ])->save();

        return new AccountingPeriodResource(
            $accountingPeriod->refresh()->load(['fiscalYear', 'closedBy', 'lockedBy'])
        );
    }

    public function reopen(Request $request, AccountingPeriod $accountingPeriod): AccountingPeriodResource
    {
        if ($accountingPeriod->status === AccountingPeriodStatus::Locked) {
            throw ValidationException::withMessages([
                'status' => ['Locked periods cannot be reopened.'],
            ]);
        }

        if ($accountingPeriod->status === AccountingPeriodStatus::Open) {
            throw ValidationException::withMessages([
                'status' => ['The period is already open.'],
            ]);
        }

        $accountingPeriod->forceFill([
            'status' => AccountingPeriodStatus::Open,
            'closed_at' => null,
            'closed_by' => null,
        ])->save();

        return new AccountingPeriodResource(
            $accountingPeriod->refresh()->load(['fiscalYear', 'closedBy', 'lockedBy'])
        );
    }

    public function lock(Request $request, AccountingPeriod $accountingPeriod): AccountingPeriodResource
    {
        if ($accountingPeriod->status === AccountingPeriodStatus::Open) {
            throw ValidationException::withMessages([
                'status' => ['Close the period before locking it.'],
            ]);
        }

        if ($accountingPeriod->status === AccountingPeriodStatus::Locked) {
            throw ValidationException::withMessages([
                'status' => ['The period is already locked.'],
            ]);
        }

        $accountingPeriod->forceFill([
            'status' => AccountingPeriodStatus::Locked,
            'locked_at' => now(),
            'locked_by' => $request->user()->id,
        ])->save();

        return new AccountingPeriodResource(
            $accountingPeriod->refresh()->load(['fiscalYear', 'closedBy', 'lockedBy'])
        );
    }

    private function assertOpen(AccountingPeriod $period, string $message): void
    {
        if (! $period->isOpen()) {
            throw ValidationException::withMessages(['status' => [$message]]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, ?int $fiscalYearId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'fiscal_year_id' => [
                $presence, 'integer',
                Rule::exists('fiscal_years', 'id')
                    ->where('campus_id', $campusId)
                    ->whereNull('deleted_at'),
            ],
            'name' => [
                $presence, 'string', 'max:64',
                Rule::unique('accounting_periods', 'name')
                    ->where(fn ($q) => $q->where('fiscal_year_id', $fiscalYearId))
                    ->ignore($ignoreId),
            ],
            'starts_on' => [$presence, 'date'],
            'ends_on' => [$presence, 'date', 'after_or_equal:starts_on'],
        ];
    }
}
