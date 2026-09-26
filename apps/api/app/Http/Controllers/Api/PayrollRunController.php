<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Enums\PayrollRunStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PayrollRunResource;
use App\Http\Resources\PayslipResource;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\Payroll\PayrollRunService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PayrollRunController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly PayrollRunService $payroll) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $runs = PayrollRun::query()
            ->withCount('payslips')
            ->when($request->filled('period'), fn ($q) => $q->where('period', $request->string('period')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('period')
            ->paginate($request->integer('per_page', 50));

        return PayrollRunResource::collection($runs);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'period' => [
                'required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/',
                Rule::unique('payroll_runs', 'period')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'notes' => ['nullable', 'string'],
        ]);

        $run = PayrollRun::create($data + $tenant + [
            'status' => PayrollRunStatus::Draft,
            'generated_by' => $request->user()?->id,
        ]);

        return (new PayrollRunResource($run->loadCount('payslips')))->response()->setStatusCode(201);
    }

    public function show(PayrollRun $payrollRun): PayrollRunResource
    {
        return new PayrollRunResource(
            $payrollRun->load(['payslips.staffMember', 'payslips.items'])->loadCount('payslips')
        );
    }

    public function generate(Request $request, PayrollRun $payrollRun): PayrollRunResource
    {
        $run = $this->payroll->generate($payrollRun, $request->user()?->id);

        return new PayrollRunResource($run->load('payslips.staffMember'));
    }

    public function approve(Request $request, PayrollRun $payrollRun): PayrollRunResource
    {
        $run = $this->payroll->approve($payrollRun, $request->user()?->id);

        return new PayrollRunResource($run);
    }

    public function pay(Request $request, PayrollRun $payrollRun): PayrollRunResource
    {
        $data = $request->validate([
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
        ]);

        $run = $this->payroll->markPaid($payrollRun, PaymentMethod::from($data['payment_method']), $request->user()?->id);

        return new PayrollRunResource($run);
    }

    public function payslips(PayrollRun $payrollRun): AnonymousResourceCollection
    {
        return PayslipResource::collection(
            $payrollRun->payslips()->with(['staffMember', 'items'])->orderBy('staff_member_id')->get()
        );
    }

    public function showPayslip(Payslip $payslip): PayslipResource
    {
        return new PayslipResource($payslip->load(['staffMember', 'items']));
    }

    public function destroy(PayrollRun $payrollRun): JsonResponse
    {
        if ($payrollRun->status !== PayrollRunStatus::Draft) {
            abort(409, 'Only draft payroll runs can be removed.');
        }

        $payrollRun->payslips()->each(fn (Payslip $slip) => $slip->items()->delete());
        $payrollRun->payslips()->delete();
        $payrollRun->delete();

        return response()->json(['message' => 'Payroll run removed.']);
    }
}
