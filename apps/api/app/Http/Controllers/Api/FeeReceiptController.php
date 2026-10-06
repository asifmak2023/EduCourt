<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeReceiptResource;
use App\Models\FeeCharge;
use App\Models\FeeReceipt;
use App\Models\Student;
use App\Services\Fees\FeeCounterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FeeReceiptController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly FeeCounterService $counter) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $receipts = FeeReceipt::query()
            ->with(['student', 'allocations.charge.lines.feeHead'])
            ->when($search !== '', fn ($q) => $q->where('receipt_no', 'like', "%{$search}%"))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('payment_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('payment_date', '<=', $request->date('to')))
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeeReceiptResource::collection($receipts);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'fee_charge_id' => [
                'nullable', 'integer',
                Rule::exists('fee_charges', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'academic_year_id' => ['nullable', 'integer'],
            'payment_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $student = Student::query()->findOrFail($data['student_id']);

        if (! empty($data['fee_charge_id'])) {
            $charge = FeeCharge::query()->findOrFail($data['fee_charge_id']);

            if ($charge->student_id !== $student->id) {
                throw ValidationException::withMessages([
                    'fee_charge_id' => ['The voucher does not belong to the selected student.'],
                ]);
            }
        }

        $result = $this->counter->receivePayment($student, $data, $request->user()->id);
        $receipt = $result['receipt'];

        return (new FeeReceiptResource($receipt->load([
            'student', 'allocations.charge.lines.feeHead',
            'campus.institution', 'institution',
        ])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(FeeReceipt $feeReceipt): FeeReceiptResource
    {
        return new FeeReceiptResource($feeReceipt->load([
            'student', 'allocations.charge.lines.feeHead', 'allocations.charge.classRoom', 'allocations.charge.section',
            'campus.institution', 'institution',
        ]));
    }
}
