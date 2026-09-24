<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleName;
use App\Enums\ScopeType;
use App\Http\Controllers\Controller;
use App\Http\Resources\ScopeAssignmentResource;
use App\Models\ScopeAssignment;
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
        $assignments = ScopeAssignment::query()
            ->with(['campus', 'user'])
            ->when($request->filled('user_id'), fn ($query) => $query
                ->where('user_id', $request->integer('user_id')))
            ->when($request->filled('campus_id'), fn ($query) => $query
                ->where('campus_id', $request->integer('campus_id')))
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

        $this->authorizeRole($request, $data['role']);
        $this->applyTenantScope($request, $data);

        $assignment = ScopeAssignment::create($data + [
            'granted_by' => $request->user()->id,
            'is_active' => true,
        ]);

        activity('rbac')
            ->causedBy($request->user())
            ->performedOn($assignment)
            ->withProperties(['role' => $data['role'], 'campus_id' => $data['campus_id'] ?? null])
            ->log('Scope assignment granted');

        return (new ScopeAssignmentResource($assignment->load('campus')))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request, ScopeAssignment $scopeAssignment): JsonResponse
    {
        activity('rbac')
            ->causedBy($request->user())
            ->performedOn($scopeAssignment)
            ->log('Scope assignment revoked');

        $scopeAssignment->delete();

        return response()->json(['message' => 'Scope assignment revoked.']);
    }

    private function authorizeRole(Request $request, string $role): void
    {
        if (in_array($role, RoleName::restrictedToProductOwner(), true) && ! $request->user()->isPlatformAdmin()) {
            abort(403, 'Only the Super User (product owner) may grant campus admin accounts.');
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
