<?php

namespace App\Http\Controllers\Api;

use App\Enums\EmploymentType;
use App\Enums\StaffStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StaffMemberResource;
use App\Models\StaffMember;
use App\Services\SalaryAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffMemberController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $staff = StaffMember::query()
            ->with(['department', 'designation', 'user', 'currentSalary'])
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('designation_id'), fn ($q) => $q->where('designation_id', $request->integer('designation_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('employment_type'), fn ($q) => $q->where('employment_type', $request->string('employment_type')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($inner) => $inner
                    ->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('employee_no', 'like', $term)
                    ->orWhere('cnic', 'like', $term)
                    ->orWhere('phone', 'like', $term));
            })
            ->orderBy('first_name')
            ->paginate($request->integer('per_page', 50));

        return StaffMemberResource::collection($staff);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']) + [
            'basic_salary' => ['required', 'numeric', 'min:0'],
        ]);

        $data['employee_no'] ??= $this->nextEmployeeNo($tenant['campus_id']);
        $data['status'] ??= StaffStatus::Active->value;

        $basicSalary = (string) $data['basic_salary'];
        unset($data['basic_salary']);

        $staff = DB::transaction(function () use ($data, $tenant, $basicSalary) {
            $staff = StaffMember::create($data + $tenant);

            app(SalaryAssignmentService::class)->assignManual(
                $staff,
                $basicSalary,
                $staff->joining_date->toDateString(),
                notes: 'Set at staff appointment',
            );

            return $staff;
        });

        return (new StaffMemberResource(
            $staff->load(['department', 'designation', 'user', 'currentSalary.salaryStructure'])
        ))->response()->setStatusCode(201);
    }

    public function show(StaffMember $staffMember): StaffMemberResource
    {
        return new StaffMemberResource(
            $staffMember->load(['department', 'designation', 'user', 'documents', 'currentSalary.salaryStructure'])
        );
    }

    public function update(Request $request, StaffMember $staffMember): StaffMemberResource
    {
        $data = $request->validate($this->rules($staffMember->campus_id, $staffMember->id, false) + [
            'reassign_salary' => ['sometimes', 'boolean'],
            'salary_effective_from' => ['nullable', 'date'],
        ]);

        $reassign = (bool) ($data['reassign_salary'] ?? false);
        $effectiveFrom = $data['salary_effective_from'] ?? now()->toDateString();
        unset($data['reassign_salary'], $data['salary_effective_from']);

        DB::transaction(function () use ($staffMember, $data, $reassign, $effectiveFrom) {
            $staffMember->update($data);

            if (! $reassign) {
                return;
            }

            $service = app(SalaryAssignmentService::class);
            $structure = $service->currentStructure(
                $staffMember->campus_id,
                $staffMember->designation_id,
                $effectiveFrom,
            );

            if ($structure === null) {
                throw ValidationException::withMessages([
                    'reassign_salary' => ['No salary structure is available for the new designation.'],
                ]);
            }

            $service->assignFromStructure($staffMember, $structure, $effectiveFrom);
        });

        return new StaffMemberResource($staffMember->load(['department', 'designation', 'user', 'currentSalary.salaryStructure']));
    }

    public function terminate(Request $request, StaffMember $staffMember): StaffMemberResource
    {
        $data = $request->validate([
            'leaving_date' => ['required', 'date'],
            'status' => ['sometimes', Rule::enum(StaffStatus::class)],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $staffMember->update([
            'leaving_date' => $data['leaving_date'],
            'status' => $data['status'] ?? StaffStatus::Resigned,
            'notes' => $data['reason'] ?? $staffMember->notes,
        ]);

        return new StaffMemberResource($staffMember->refresh()->load(['department', 'designation']));
    }

    public function destroy(StaffMember $staffMember): JsonResponse
    {
        $staffMember->delete();

        return response()->json(['message' => 'Staff member removed.']);
    }

    private function nextEmployeeNo(int $campusId): string
    {
        $sequence = StaffMember::withTrashed()->where('campus_id', $campusId)->count() + 1;

        return sprintf('EMP-%04d', $sequence);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'user_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id'),
                Rule::unique('staff_members', 'user_id')->ignore($ignoreId),
            ],
            'department_id' => [
                'nullable', 'integer',
                Rule::exists('departments', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'designation_id' => [
                'nullable', 'integer',
                Rule::exists('designations', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'employee_no' => [
                'nullable', 'string', 'max:32',
                Rule::unique('staff_members', 'employee_no')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'first_name' => [$presence, 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:16'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'cnic' => ['nullable', 'string', 'max:32'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:32'],
            'employment_type' => ['sometimes', Rule::enum(EmploymentType::class)],
            'status' => ['sometimes', Rule::enum(StaffStatus::class)],
            'joining_date' => [$presence, 'date'],
            'leaving_date' => ['nullable', 'date', 'after_or_equal:joining_date'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_account_no' => ['nullable', 'string', 'max:64'],
            'tax_number' => ['nullable', 'string', 'max:32'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
