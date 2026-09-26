<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Enums\TaxReturnStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TaxReturnDocumentResource;
use App\Http\Resources\TaxReturnResource;
use App\Models\TaxReturn;
use App\Models\TaxReturnDocument;
use App\Models\TaxRule;
use App\Services\Accounting\TaxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TaxReturnController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly TaxService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $returns = TaxReturn::query()
            ->with(['rule', 'documents'])
            ->when($request->filled('tax_rule_id'), fn ($q) => $q->where('tax_rule_id', $request->integer('tax_rule_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->boolean('overdue'), fn ($q) => $q
                ->where('status', '!=', TaxReturnStatus::Paid->value)
                ->whereDate('due_date', '<', now()->toDateString()))
            ->orderByDesc('due_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return TaxReturnResource::collection($returns);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'tax_rule_id' => [
                'required', 'integer',
                Rule::exists('tax_rules', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'due_date' => ['required', 'date'],
            'taxable_amount' => ['required', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string'],
        ]);

        $rule = TaxRule::query()->findOrFail($data['tax_rule_id']);

        if (! array_key_exists('tax_amount', $data) || $data['tax_amount'] === null) {
            $data['tax_amount'] = round((float) $data['taxable_amount'] * ((float) $rule->rate / 100), 2);
        }

        $return = TaxReturn::create($data + $tenant + ['status' => TaxReturnStatus::Pending]);

        return (new TaxReturnResource($return->load(['rule', 'documents'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(TaxReturn $taxReturn): TaxReturnResource
    {
        return new TaxReturnResource($taxReturn->load(['rule', 'documents', 'journalEntry']));
    }

    public function update(Request $request, TaxReturn $taxReturn): TaxReturnResource
    {
        if ($taxReturn->status === TaxReturnStatus::Paid) {
            abort(409, 'Paid tax returns cannot be edited.');
        }

        $data = $request->validate([
            'period_start' => ['sometimes', 'date'],
            'period_end' => ['sometimes', 'date', 'after_or_equal:period_start'],
            'due_date' => ['sometimes', 'date'],
            'taxable_amount' => ['sometimes', 'numeric', 'min:0'],
            'tax_amount' => ['sometimes', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string'],
        ]);

        $taxReturn->update($data);

        return new TaxReturnResource($taxReturn->load(['rule', 'documents']));
    }

    public function destroy(TaxReturn $taxReturn): JsonResponse
    {
        if ($taxReturn->status === TaxReturnStatus::Paid) {
            abort(409, 'Paid tax returns cannot be deleted.');
        }

        $taxReturn->delete();

        return response()->json(['message' => 'Tax return removed.']);
    }

    public function file(Request $request, TaxReturn $taxReturn): TaxReturnResource
    {
        $data = $request->validate(['reference' => ['nullable', 'string', 'max:255']]);

        $taxReturn = $this->service->file($taxReturn, $data['reference'] ?? null, $request->user()->id);

        return new TaxReturnResource($taxReturn->load(['rule', 'documents']));
    }

    public function pay(Request $request, TaxReturn $taxReturn): TaxReturnResource
    {
        $data = $request->validate([
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'paid_on' => ['required', 'date'],
            'memo' => ['nullable', 'string'],
        ]);

        $taxReturn = $this->service->pay(
            $taxReturn,
            PaymentMethod::from($data['method']),
            $data['paid_on'],
            $request->user()->id,
            $data['memo'] ?? null,
        );

        return new TaxReturnResource($taxReturn->load(['rule', 'documents', 'journalEntry']));
    }

    public function addDocument(Request $request, TaxReturn $taxReturn): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'file_path' => ['nullable', 'string', 'max:2048'],
            'is_required' => ['sometimes', 'boolean'],
        ]);

        $document = $taxReturn->documents()->create([
            'name' => $data['name'],
            'file_path' => $data['file_path'] ?? null,
            'is_required' => $data['is_required'] ?? true,
            'uploaded_by' => ! empty($data['file_path']) ? $request->user()->id : null,
            'uploaded_at' => ! empty($data['file_path']) ? now() : null,
        ]);

        return (new TaxReturnDocumentResource($document))->response()->setStatusCode(201);
    }

    public function deleteDocument(TaxReturn $taxReturn, TaxReturnDocument $document): JsonResponse
    {
        if ($document->tax_return_id !== $taxReturn->id) {
            abort(404);
        }

        $document->delete();

        return response()->json(['message' => 'Document removed.']);
    }
}
