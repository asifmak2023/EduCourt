<?php

namespace App\Http\Controllers\Api;

use App\Enums\ConcessionStatus;
use App\Enums\DiscountType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConcessionResource;
use App\Models\Concession;
use App\Models\ConcessionPolicy;
use App\Services\Concessions\ConcessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConcessionController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ConcessionService $concessions) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $concessions = Concession::query()
            ->with(['student', 'academicYear', 'policy', 'approvedBy'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('concession_policy_id'), fn ($q) => $q->where('concession_policy_id', $request->integer('concession_policy_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return ConcessionResource::collection($concessions);
    }

    public function store(Request $request): JsonResponse
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
            'concession_policy_id' => [
                'nullable', 'integer',
                Rule::exists('concession_policies', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'discount_type' => ['required_without:concession_policy_id', Rule::enum(DiscountType::class)],
            'value' => ['required_without:concession_policy_id', 'numeric', 'min:0'],
            'amount' => ['required_without:concession_policy_id', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $policy = isset($data['concession_policy_id'])
            ? ConcessionPolicy::query()->findOrFail($data['concession_policy_id'])
            : null;

        $concession = Concession::create([
            'student_id' => $data['student_id'],
            'academic_year_id' => $data['academic_year_id'],
            'concession_policy_id' => $policy?->id,
            'discount_type' => $data['discount_type'] ?? $policy->discount_type->value,
            'value' => $data['value'] ?? $policy->value,
            'amount' => $data['amount'] ?? 0,
            'status' => ConcessionStatus::Pending,
            'requested_by' => $request->user()->id,
            'note' => $data['note'] ?? null,
        ] + $tenant);

        return (new ConcessionResource($concession->load(['student', 'academicYear', 'policy'])))
            ->response()->setStatusCode(201);
    }

    public function show(Concession $concession): ConcessionResource
    {
        return new ConcessionResource($concession->load([
            'student', 'academicYear', 'policy', 'requestedBy', 'approvedBy',
        ]));
    }

    public function approve(Request $request, Concession $concession): ConcessionResource
    {
        $this->ensureStatus($concession, [ConcessionStatus::Pending], 'Only a pending concession can be approved.');

        $amount = (float) $concession->amount;

        if ($concession->policy !== null) {
            $gross = $this->concessions->annualGrossFor($concession->student_id, $concession->academic_year_id);
            $amount = $this->concessions->amountFor($concession->policy, $gross);
        }

        $concession->forceFill([
            'status' => ConcessionStatus::Approved,
            'amount' => $amount,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ])->save();

        return new ConcessionResource($concession->refresh()->load(['student', 'academicYear', 'policy', 'approvedBy']));
    }

    public function reject(Concession $concession): ConcessionResource
    {
        $this->ensureStatus($concession, [ConcessionStatus::Pending], 'Only a pending concession can be rejected.');

        $concession->forceFill(['status' => ConcessionStatus::Rejected])->save();

        return new ConcessionResource($concession->refresh()->load(['student', 'academicYear', 'policy']));
    }

    public function revoke(Concession $concession): ConcessionResource
    {
        $this->ensureStatus($concession, [ConcessionStatus::Approved], 'Only an approved concession can be revoked.');

        $concession->forceFill(['status' => ConcessionStatus::Revoked])->save();

        return new ConcessionResource($concession->refresh()->load(['student', 'academicYear', 'policy']));
    }

    public function destroy(Concession $concession): JsonResponse
    {
        $concession->delete();

        return response()->json(['message' => 'Concession archived.']);
    }

    /**
     * @param  array<int, ConcessionStatus>  $allowed
     */
    private function ensureStatus(Concession $concession, array $allowed, string $message): void
    {
        if (! in_array($concession->status, $allowed, true)) {
            throw ValidationException::withMessages(['status' => [$message]]);
        }
    }
}
