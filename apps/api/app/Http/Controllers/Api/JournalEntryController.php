<?php

namespace App\Http\Controllers\Api;

use App\Enums\JournalStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\JournalEntryResource;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Services\Accounting\JournalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class JournalEntryController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly JournalService $journals) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $entries = JournalEntry::query()
            ->with('fiscalYear')
            ->when($request->filled('fiscal_year_id'), fn ($q) => $q->where('fiscal_year_id', $request->integer('fiscal_year_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('entry_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('entry_date', '<=', $request->date('to')))
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('reference', 'like', "%{$search}%")
                    ->orWhere('memo', 'like', "%{$search}%");
            }))
            ->orderByDesc('entry_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return JournalEntryResource::collection($entries);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $entry = DB::transaction(function () use ($data, $tenant) {
            $fiscalYear = FiscalYear::query()->findOrFail($data['fiscal_year_id']);

            $entry = JournalEntry::create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $data['reference'] ?? $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $data['entry_date'],
                'status' => JournalStatus::Draft,
                'memo' => $data['memo'] ?? null,
                'source_type' => $data['source_type'] ?? null,
                'source_id' => $data['source_id'] ?? null,
            ]);

            $this->syncLines($entry, $data['lines']);

            return $entry;
        });

        return (new JournalEntryResource($entry->load(['lines.account', 'fiscalYear'])))
            ->response()->setStatusCode(201);
    }

    public function show(JournalEntry $journalEntry): JournalEntryResource
    {
        return new JournalEntryResource($journalEntry->load(['lines.account', 'fiscalYear']));
    }

    public function update(Request $request, JournalEntry $journalEntry): JournalEntryResource
    {
        if (! $journalEntry->isDraft()) {
            abort(409, 'Posted journal entries are immutable; create a reversal instead.');
        }

        $data = $request->validate($this->rules($journalEntry->campus_id, $journalEntry->id));

        DB::transaction(function () use ($journalEntry, $data) {
            $journalEntry->update([
                'fiscal_year_id' => $data['fiscal_year_id'],
                'reference' => $data['reference'] ?? $journalEntry->reference,
                'entry_date' => $data['entry_date'],
                'memo' => $data['memo'] ?? null,
                'source_type' => $data['source_type'] ?? null,
                'source_id' => $data['source_id'] ?? null,
            ]);

            $journalEntry->lines()->delete();
            $this->syncLines($journalEntry, $data['lines']);
        });

        return new JournalEntryResource($journalEntry->refresh()->load(['lines.account', 'fiscalYear']));
    }

    public function destroy(JournalEntry $journalEntry): JsonResponse
    {
        if (! $journalEntry->isDraft()) {
            return response()->json([
                'message' => 'Posted journal entries cannot be deleted; reverse them instead.',
            ], 409);
        }

        $journalEntry->delete();

        return response()->json(['message' => 'Journal entry archived.']);
    }

    public function post(JournalEntry $journalEntry): JournalEntryResource
    {
        $entry = $this->journals->post($journalEntry, request()->user()->id);

        return new JournalEntryResource($entry->load(['lines.account', 'fiscalYear']));
    }

    public function reverse(Request $request, JournalEntry $journalEntry): JournalEntryResource
    {
        $data = $request->validate([
            'memo' => ['nullable', 'string', 'max:2000'],
        ]);

        $reversal = $this->journals->reverse($journalEntry, $request->user()->id, $data['memo'] ?? null);

        return new JournalEntryResource($reversal->load(['lines.account', 'fiscalYear']));
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function syncLines(JournalEntry $entry, array $lines): void
    {
        $debit = 0.0;
        $credit = 0.0;

        foreach (array_values($lines) as $index => $line) {
            $lineDebit = (float) ($line['debit'] ?? 0);
            $lineCredit = (float) ($line['credit'] ?? 0);

            $entry->lines()->create([
                'chart_of_account_id' => $line['chart_of_account_id'],
                'line_no' => $index + 1,
                'description' => $line['description'] ?? null,
                'debit' => $lineDebit,
                'credit' => $lineCredit,
            ]);

            $debit += $lineDebit;
            $credit += $lineCredit;
        }

        $entry->forceFill([
            'total_debit' => $debit,
            'total_credit' => $credit,
        ])->save();
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null): array
    {
        return [
            'fiscal_year_id' => [
                'required', 'integer',
                Rule::exists('fiscal_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'reference' => [
                'nullable', 'string', 'max:64',
                Rule::unique('journal_entries', 'reference')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'entry_date' => ['required', 'date'],
            'memo' => ['nullable', 'string', 'max:2000'],
            'source_type' => ['nullable', 'string', 'max:191'],
            'source_id' => ['nullable', 'integer'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.chart_of_account_id' => [
                'required', 'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('campus_id', $campusId)
                    ->where('is_group', false)
                    ->where('is_active', true)
                    ->whereNull('deleted_at'),
            ],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
