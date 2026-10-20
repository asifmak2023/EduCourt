<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleName;
use App\Enums\ScopeType;
use App\Http\Controllers\Controller;
use App\Http\Resources\ScopeAssignmentResource;
use App\Models\ScopeAssignment;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ScopeAssignmentController extends Controller
{
    public function __construct(private readonly TenantContext $context) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $actor = $request->user();

        $assignments = ScopeAssignment::query()
            ->with(['campus', 'user.roles', 'user.campus'])
            ->when($request->filled('user_id'), fn ($query) => $query
                ->where('user_id', $request->integer('user_id')))
            ->when($request->filled('campus_id'), fn ($query) => $query
                ->where('campus_id', $request->integer('campus_id')))
            ->when($request->has('is_active'), fn ($query) => $query
                ->where('is_active', $request->boolean('is_active')))
            ->when(! $actor->isPlatformAdmin(), function ($query) {
                $campusId = $this->context->campusId();
                $institutionId = $this->context->institutionId();

                $query->when($institutionId !== null, fn ($inner) => $inner
                    ->where(function ($scoped) use ($institutionId) {
                        $scoped->where('institution_id', $institutionId)
                            ->orWhereHas('user', fn ($userQuery) => $userQuery
                                ->where('institution_id', $institutionId));
                    }));

                $query->when($campusId !== null, fn ($inner) => $inner
                    ->where(function ($scoped) use ($campusId) {
                        $scoped->where('campus_id', $campusId)
                            ->orWhereHas('user', fn ($userQuery) => $userQuery
                                ->where('campus_id', $campusId));
                    }));
            })
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return ScopeAssignmentResource::collection($assignments);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['required', Rule::enum(RoleName::class)],
            'institution_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'scope_type' => ['required', Rule::enum(ScopeType::class)],
            'scope_id' => ['nullable', 'integer'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ]);

        $actor = $request->user();
        $target = User::query()->findOrFail($data['user_id']);

        $this->authorizeRole($actor, $data['role'], $target);
        $this->assertSameCampus($actor, $target);
        $this->applyTenantScope($request, $data);

        $duplicate = ScopeAssignment::query()
            ->where('user_id', $target->id)
            ->where('role', $data['role'])
            ->where('scope_type', $data['scope_type'])
            ->where('is_active', true)
            ->where('campus_id', $data['campus_id'] ?? null)
            ->where('scope_id', $data['scope_id'] ?? null)
            ->first();

        if ($duplicate !== null) {
            $target->assignRole($data['role']);

            return (new ScopeAssignmentResource($duplicate->load(['campus', 'user'])))
                ->response()
                ->setStatusCode(200);
        }

        $assignment = ScopeAssignment::create($data + [
            'granted_by' => $actor->id,
            'is_active' => true,
        ]);

        $target->assignRole($data['role']);

        activity('rbac')
            ->causedBy($actor)
            ->performedOn($assignment)
            ->withProperties(['role' => $data['role'], 'campus_id' => $data['campus_id'] ?? null])
            ->log('Scope assignment granted');

        return (new ScopeAssignmentResource($assignment->load(['campus', 'user'])))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request, ScopeAssignment $scopeAssignment): JsonResponse
    {
        $actor = $request->user();
        $target = $scopeAssignment->user ?? User::query()->find($scopeAssignment->user_id);
        $role = $scopeAssignment->role instanceof RoleName
            ? $scopeAssignment->role->value
            : (string) $scopeAssignment->role;

        if ($target !== null) {
            $this->authorizeRole($actor, $role, $target);
            $this->assertSameCampus($actor, $target);
        } elseif (! $actor->isPlatformAdmin()) {
            abort(403, 'You cannot revoke this assignment.');
        }

        if (! $actor->isPlatformAdmin()) {
            $campusId = $this->context->campusId();
            if ($campusId !== null
                && $scopeAssignment->campus_id !== null
                && (int) $scopeAssignment->campus_id !== $campusId) {
                abort(403, 'That assignment is not in your campus.');
            }
        }

        activity('rbac')
            ->causedBy($actor)
            ->performedOn($scopeAssignment)
            ->log('Scope assignment revoked');

        $scopeAssignment->delete();

        if ($target !== null && $role !== '') {
            $stillHas = $target->scopeAssignments()
                ->where('role', $role)
                ->where('is_active', true)
                ->exists();

            if (! $stillHas) {
                $target->removeRole($role);
            }
        }

        return response()->json(['message' => 'Scope assignment revoked.']);
    }

    private function authorizeRole(User $actor, string $role, User $target): void
    {
        $restricted = RoleName::restrictedToProductOwner();

        if (in_array($role, $restricted, true) && ! $actor->isPlatformAdmin()) {
            abort(403, 'Only the Super User (product owner) may grant or revoke campus admin or institution head accounts.');
        }

        if (! $actor->isPlatformAdmin() && $target->hasAnyRole($restricted)) {
            abort(403, 'You cannot change access for a campus admin or super user.');
        }
    }

    private function assertSameCampus(User $actor, User $target): void
    {
        if ($actor->isPlatformAdmin()) {
            return;
        }

        if ($this->context->institutionId() !== null
            && $target->institution_id !== $this->context->institutionId()) {
            abort(403, 'That user is not in your campus.');
        }

        $campusId = $this->context->campusId();

        if ($campusId !== null && $target->campus_id !== $campusId) {
            abort(403, 'That user is not in your campus.');
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function applyTenantScope(Request $request, array &$data): void
    {
        $actor = $request->user();

        if ($actor->isPlatformAdmin()) {
            return;
        }

        $data['institution_id'] = $this->context->institutionId();

        $campusId = isset($data['campus_id']) ? (int) $data['campus_id'] : $this->context->campusId();

        if ($campusId !== null && ! $actor->canAccessCampus($campusId)) {
            abort(403, 'That campus does not belong to your institution.');
        }

        $data['campus_id'] = $campusId;
    }
}
