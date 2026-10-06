<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeChargeResource;
use App\Http\Resources\FeeReceiptResource;
use App\Models\Student;
use App\Services\Fees\FeeCounterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeeCounterController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly FeeCounterService $counter) {}

    public function students(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'academic_year_id' => ['nullable', 'integer'],
            'class_room_id' => ['nullable', 'integer'],
            'section_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $students = $this->counter->searchStudents($data, $request->integer('per_page', 25));

        return response()->json([
            'data' => $students->items(),
            'meta' => [
                'current_page' => $students->currentPage(),
                'last_page' => $students->lastPage(),
                'per_page' => $students->perPage(),
                'total' => $students->total(),
            ],
        ]);
    }

    public function studentDues(Request $request, Student $student): JsonResponse
    {
        $this->academicTenantAttributes();

        $academicYearId = $request->filled('academic_year_id') ? $request->integer('academic_year_id') : null;

        return response()->json(['data' => $this->counter->dues($student, $academicYearId)]);
    }

    public function generate(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'discount_amount' => ['sometimes', 'numeric', 'min:0'],
            'discount_note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.billing_kind' => ['required', Rule::in(['monthly', 'exam', 'one_time', 'other'])],
            'items.*.period_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'items.*.period_month' => ['nullable', 'integer', 'between:1,12'],
            'items.*.exam_term' => ['nullable', Rule::in(['first', 'second', 'third', 'final', 'monthly_test'])],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.fee_head_id' => ['nullable', 'integer'],
            'items.*.fee_structure_item_id' => ['nullable', 'integer'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.due_date' => ['nullable', 'date'],
            'items.*.source' => ['nullable', Rule::in(['structure', 'manual', 'other'])],
            'items.*.lines' => ['sometimes', 'array'],
            'items.*.lines.*.fee_head_id' => ['nullable', 'integer'],
            'items.*.lines.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.lines.*.amount' => ['numeric', 'min:0'],
            'items.*.lines.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'payment' => ['sometimes', 'nullable', 'array'],
            'payment.amount' => ['required_with:payment', 'numeric', 'min:0'],
            'payment.method' => ['nullable', Rule::in(array_column(PaymentMethod::cases(), 'value'))],
            'payment.reference' => ['nullable', 'string', 'max:255'],
            'payment.payment_date' => ['nullable', 'date'],
            'payment.notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $student = Student::query()->findOrFail($data['student_id']);

        $result = $this->counter->generate(
            $student,
            $data,
            $data['items'],
            $data['payment'] ?? null,
            $request->user()->id,
        );

        $charges = collect($result['charges'])->map(fn ($charge) => (new FeeChargeResource($charge->load('lines.feeHead')))->resolve());
        $receipt = $result['receipt']
            ? (new FeeReceiptResource($result['receipt']->load(['allocations.charge.lines.feeHead'])))->resolve()
            : null;

        return response()->json([
            'message' => $receipt
                ? 'Voucher generated and payment recorded.'
                : 'Voucher generated.',
            'charges' => $charges,
            'receipt' => $receipt,
        ], 201);
    }
}
