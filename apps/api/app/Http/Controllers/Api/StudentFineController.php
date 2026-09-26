<?php

namespace App\Http\Controllers\Api;

use App\Enums\FineStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentFineResource;
use App\Models\FineRule;
use App\Models\StudentFine;
use App\Services\Fines\FineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StudentFineController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly FineService $fines) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $fines = StudentFine::query()
            ->with(['student', 'rule', 'voucher', 'waivedBy'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('fine_rule_id'), fn ($q) => $q->where('fine_rule_id', $request->integer('fine_rule_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('issued_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('issued_on', '<=', $request->date('to')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return StudentFineResource::collection($fines);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'fine_rule_id' => [
                'nullable', 'integer',
                Rule::exists('fine_rules', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'academic_year_id' => [
                'nullable', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'fee_voucher_id' => [
                'nullable', 'integer',
                Rule::exists('fee_vouchers', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'amount' => ['required_without:fine_rule_id', 'numeric', 'gt:0'],
            'reason' => ['nullable', 'string', 'max:255'],
            'issued_on' => ['required', 'date'],
        ]);

        $rule = isset($data['fine_rule_id'])
            ? FineRule::query()->findOrFail($data['fine_rule_id'])
            : null;

        $fine = StudentFine::create([
            'student_id' => $data['student_id'],
            'fine_rule_id' => $rule?->id,
            'academic_year_id' => $data['academic_year_id'] ?? null,
            'fee_voucher_id' => $data['fee_voucher_id'] ?? null,
            'amount' => $data['amount'] ?? $rule->amount,
            'reason' => $data['reason'] ?? null,
            'status' => FineStatus::Pending,
            'issued_on' => $data['issued_on'],
            'created_by' => $request->user()->id,
        ] + $tenant);

        return (new StudentFineResource($fine->load(['student', 'rule'])))
            ->response()->setStatusCode(201);
    }

    public function show(StudentFine $fine): StudentFineResource
    {
        return new StudentFineResource($fine->load([
            'student', 'rule', 'voucher', 'journalEntry', 'waivedBy',
        ]));
    }

    public function apply(Request $request, StudentFine $fine): StudentFineResource
    {
        $applied = $this->fines->apply($fine, $request->user()->id);

        return new StudentFineResource($applied->load(['student', 'rule', 'voucher']));
    }

    public function waive(Request $request, StudentFine $fine): StudentFineResource
    {
        $data = $request->validate([
            'waived_reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $waived = $this->fines->waive($fine, $request->user()->id, $data['waived_reason'] ?? null);

        return new StudentFineResource($waived->load(['student', 'rule', 'waivedBy']));
    }

    public function revoke(Request $request, StudentFine $fine): StudentFineResource
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $revoked = $this->fines->revoke($fine, $request->user()->id, $data['reason'] ?? null);

        return new StudentFineResource($revoked->load(['student', 'rule', 'voucher']));
    }
}
