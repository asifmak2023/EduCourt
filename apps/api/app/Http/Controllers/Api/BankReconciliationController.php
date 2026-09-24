<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReconciliationStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\BankReconciliationResource;
use App\Models\BankAccount;
use App\Models\BankReconciliation;
use App\Services\Accounting\BankReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BankReconciliationController extends Controller
{
    use StampsAcademicTenant;

    private const TOLERANCE = 0.005;

    public function __construct(private readonly BankReconciliationService $reconciliations) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $reconciliations = BankReconciliation::query()
            ->with('bankAccount')
            ->when($request->filled('bank_account_id'), fn ($q) => $q->where('bank_account_id', $request->integer('bank_account_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('statement_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return BankReconciliationResource::collection($reconciliations);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'bank_account_id' => [
                'required', 'integer',
                Rule::exists('bank_accounts', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'statement_date' => ['required', 'date'],
            'statement_closing_balance' => ['required', 'numeric'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $account = BankAccount::query()->findOrFail($data['bank_account_id']);
        $book = $this->reconciliations->bookBalance($account, $data['statement_date']);
        $difference = round((float) $data['statement_closing_balance'] - $book['closing_balance'], 2);

        $reconciliation = BankReconciliation::create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'bank_account_id' => $account->id,
            'statement_date' => $data['statement_date'],
            'opening_balance' => $book['opening_balance'],
            'book_balance' => $book['closing_balance'],
            'statement_closing_balance' => $data['statement_closing_balance'],
            'difference' => $difference,
            'status' => ReconciliationStatus::Draft,
            'notes' => $data['notes'] ?? null,
        ]);

        return (new BankReconciliationResource($reconciliation->load('bankAccount')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(BankReconciliation $bankReconciliation): BankReconciliationResource
    {
        return new BankReconciliationResource($bankReconciliation->load('bankAccount'));
    }

    public function update(Request $request, BankReconciliation $bankReconciliation): BankReconciliationResource
    {
        $this->assertDraft($bankReconciliation);

        $data = $request->validate([
            'statement_date' => ['sometimes', 'date'],
            'statement_closing_balance' => ['sometimes', 'numeric'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $statementDate = $data['statement_date'] ?? $bankReconciliation->statement_date->toDateString();
        $statementClosing = $data['statement_closing_balance'] ?? $bankReconciliation->statement_closing_balance;

        $book = $this->reconciliations->bookBalance($bankReconciliation->bankAccount, $statementDate);

        $bankReconciliation->update([
            'statement_date' => $statementDate,
            'opening_balance' => $book['opening_balance'],
            'book_balance' => $book['closing_balance'],
            'statement_closing_balance' => $statementClosing,
            'difference' => round((float) $statementClosing - $book['closing_balance'], 2),
            'notes' => $data['notes'] ?? $bankReconciliation->notes,
        ]);

        return new BankReconciliationResource($bankReconciliation->refresh()->load('bankAccount'));
    }

    public function complete(Request $request, BankReconciliation $bankReconciliation): BankReconciliationResource
    {
        $this->assertDraft($bankReconciliation);

        $bankReconciliation->loadMissing('bankAccount');

        $book = $this->reconciliations->bookBalance(
            $bankReconciliation->bankAccount,
            $bankReconciliation->statement_date->toDateString(),
        );

        $difference = round((float) $bankReconciliation->statement_closing_balance - $book['closing_balance'], 2);

        if (abs($difference) > self::TOLERANCE) {
            throw ValidationException::withMessages([
                'difference' => ["The statement closing balance differs from the book balance by {$difference}; resolve it before completing."],
            ]);
        }

        $bankReconciliation->forceFill([
            'opening_balance' => $book['opening_balance'],
            'book_balance' => $book['closing_balance'],
            'difference' => 0,
            'status' => ReconciliationStatus::Completed,
            'reconciled_by' => $request->user()->id,
            'reconciled_at' => now(),
        ])->save();

        return new BankReconciliationResource($bankReconciliation->refresh()->load('bankAccount'));
    }

    public function destroy(BankReconciliation $bankReconciliation): JsonResponse
    {
        $this->assertDraft($bankReconciliation);

        $bankReconciliation->delete();

        return response()->json(['message' => 'Reconciliation archived.']);
    }

    private function assertDraft(BankReconciliation $reconciliation): void
    {
        if ($reconciliation->status !== ReconciliationStatus::Draft) {
            throw ValidationException::withMessages([
                'status' => ['Only draft reconciliations can be changed.'],
            ]);
        }
    }
}
