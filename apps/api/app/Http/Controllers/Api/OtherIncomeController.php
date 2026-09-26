<?php

namespace App\Http\Controllers\Api;

use App\Enums\IncomeStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\OtherIncomeResource;
use App\Models\OtherIncome;
use App\Services\Accounting\OtherIncomeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class OtherIncomeController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly OtherIncomeService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $incomes = OtherIncome::query()
            ->with(['source', 'journalEntry'])
            ->when($request->filled('income_source_id'), fn ($q) => $q->where('income_source_id', $request->integer('income_source_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('received_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('received_on', '<=', $request->date('to')))
            ->orderByDesc('received_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return OtherIncomeResource::collection($incomes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'income_source_id' => [
                'required', 'integer',
                Rule::exists('income_sources', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'received_on' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'payer_name' => ['nullable', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ]);

        $income = new OtherIncome($data + $tenant + [
            'receipt_no' => $this->service->nextReceiptNo($tenant['campus_id']),
            'status' => IncomeStatus::Draft,
            'created_by' => $request->user()->id,
        ]);
        $income->save();

        $income = $this->service->post($income, $request->user()->id);

        return (new OtherIncomeResource($income))
            ->response()
            ->setStatusCode(201);
    }

    public function show(OtherIncome $otherIncome): OtherIncomeResource
    {
        return new OtherIncomeResource($otherIncome->load(['source', 'journalEntry']));
    }

    public function void(Request $request, OtherIncome $otherIncome): OtherIncomeResource
    {
        $data = $request->validate([
            'memo' => ['nullable', 'string'],
        ]);

        $income = $this->service->void($otherIncome, $request->user()->id, $data['memo'] ?? null);

        return new OtherIncomeResource($income->load(['source', 'journalEntry']));
    }
}
