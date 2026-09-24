<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpensePaymentResource;
use App\Models\Expense;
use App\Models\ExpensePayment;
use App\Services\Accounting\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExpensePaymentController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ExpenseService $expenses) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $payments = ExpensePayment::query()
            ->with('expense')
            ->when($request->filled('expense_id'), fn ($q) => $q->where('expense_id', $request->integer('expense_id')))
            ->when($request->filled('method'), fn ($q) => $q->where('method', $request->string('method')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('payment_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('payment_date', '<=', $request->date('to')))
            ->when(! $request->boolean('include_voided'), fn ($q) => $q->whereNull('voided_at'))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return ExpensePaymentResource::collection($payments);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'expense_id' => [
                'required', 'integer',
                Rule::exists('expenses', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'payment_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $expense = Expense::query()->findOrFail($data['expense_id']);

        $payment = ExpensePayment::create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'expense_id' => $expense->id,
            'reference' => $this->expenses->nextPaymentReference($tenant['campus_id']),
            'payment_date' => $data['payment_date'],
            'amount' => $data['amount'],
            'method' => $data['method'],
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $payment = $this->expenses->recordPayment($payment, $request->user()->id);

        return (new ExpensePaymentResource($payment->load('expense')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExpensePayment $expensePayment): ExpensePaymentResource
    {
        return new ExpensePaymentResource($expensePayment->load('expense.lines.category'));
    }

    public function void(Request $request, ExpensePayment $expensePayment): ExpensePaymentResource
    {
        $data = $request->validate([
            'memo' => ['nullable', 'string', 'max:2000'],
        ]);

        $payment = $this->expenses->voidPayment($expensePayment, $request->user()->id, $data['memo'] ?? null);

        return new ExpensePaymentResource($payment->load('expense'));
    }
}
