<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleName;
use App\Enums\ScopeType;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ScopeAssignment;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(private readonly TenantContext $context) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $users = User::query()
            ->with(['roles', 'campus', 'institution', 'student'])
            ->when($search !== '', fn ($query) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('employee_code', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%")))
            ->when($request->filled('campus_id'), fn ($query) => $query
                ->where('campus_id', $request->integer('campus_id')))
            ->when($request->filled('role'), fn ($query) => $query
                ->role($request->string('role')->toString()))
            ->when($request->has('is_active'), fn ($query) => $query
                ->where('is_active', $request->boolean('is_active')))
            ->when($request->has('two_factor_enabled'), fn ($query) => $query
                ->where(function ($q) use ($request) {
                    if ($request->boolean('two_factor_enabled')) {
                        $q->whereNotNull('two_factor_confirmed_at');
                    } else {
                        $q->whereNull('two_factor_confirmed_at');
                    }
                }))
            ->when($request->has('has_student'), fn ($query) => $query
                ->where(function ($q) use ($request) {
                    if ($request->boolean('has_student')) {
                        $q->whereHas('student');
                    } else {
                        $q->whereDoesntHave('student');
                    }
                }))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return UserResource::collection($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:32'],
            'employee_code' => ['nullable', 'string', 'max:64'],
            'job_title' => ['nullable', 'string', 'max:128'],
            'institution_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'is_active' => ['sometimes', 'boolean'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', Rule::enum(RoleName::class)],
        ]);

        $roles = $data['roles'];
        unset($data['roles']);

        $this->authorizeRoleAssignment($request, $roles);
        $this->applyTenantScope($request, $data);

        $user = User::create($data);
        $user->syncRoles($roles);
        $this->writeScopeAssignments($user, $roles, $request);

        activity('rbac')
            ->causedBy($request->user())
            ->performedOn($user)
            ->withProperties(['roles' => $roles])
            ->log('User provisioned');

        return (new UserResource($user->load(['roles', 'campus', 'institution', 'scopeAssignments'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user->load([
            'roles', 'campus', 'institution', 'scopeAssignments.campus', 'student',
        ]));
    }

    public function update(Request $request, User $user): UserResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:32'],
            'employee_code' => ['nullable', 'string', 'max:64'],
            'job_title' => ['nullable', 'string', 'max:128'],
            'is_active' => ['sometimes', 'boolean'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string', Rule::enum(RoleName::class)],
        ]);

        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        if ($roles !== null) {
            $this->authorizeRoleAssignment($request, $roles);
        }

        $user->update($data);

        if ($roles !== null) {
            $user->syncRoles($roles);
            $this->writeScopeAssignments($user, $roles, $request);
        }

        if (array_key_exists('is_active', $data) && $data['is_active'] === false) {
            $user->tokens()->delete();
        }

        activity('rbac')
            ->causedBy($request->user())
            ->performedOn($user)
            ->log('User updated');

        return new UserResource($user->load([
            'roles', 'campus', 'institution', 'scopeAssignments.campus', 'student',
        ]));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 409);
        }

        $user->update(['is_active' => false]);
        $user->tokens()->delete();

        activity('rbac')
            ->causedBy($request->user())
            ->performedOn($user)
            ->log('User deactivated');

        return response()->json(['message' => 'User deactivated.']);
    }

    /**
     * @param  array<int, string>  $roles
     */
    private function authorizeRoleAssignment(Request $request, array $roles): void
    {
        $restricted = RoleName::restrictedToProductOwner();

        if (array_intersect($roles, $restricted) !== [] && ! $request->user()->isPlatformAdmin()) {
            abort(403, 'Only the Super User (product owner) may create campus admin accounts.');
        }
    }

    /**
     * Resolve and validate the institution/campus a new user belongs to.
     *
     * @param  array<string, mixed>  $data
     */
    private function applyTenantScope(Request $request, array &$data): void
    {
        $actor = $request->user();

        if ($actor->isPlatformAdmin()) {
            return;
        }

        if ($this->context->campusId() === null) {
            abort(403, 'A campus context is required to create users.');
        }

        $data['institution_id'] = $this->context->institutionId();
        $data['campus_id'] = $this->context->campusId();
    }

    /**
     * @param  array<int, string>  $roles
     */
    private function writeScopeAssignments(User $user, array $roles, Request $request): void
    {
        $user->scopeAssignments()->delete();

        foreach ($roles as $role) {
            ScopeAssignment::create([
                'user_id' => $user->id,
                'role' => $role,
                'institution_id' => $user->institution_id,
                'campus_id' => $user->campus_id,
                'scope_type' => $user->campus_id !== null ? ScopeType::Campus : ScopeType::Institution,
                'scope_id' => $user->campus_id,
                'granted_by' => $request->user()->id,
                'is_active' => true,
            ]);
        }
    }
}
