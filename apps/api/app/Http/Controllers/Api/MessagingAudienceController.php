<?php

namespace App\Http\Controllers\Api;

use App\Enums\MessagingAudienceKind;
use App\Enums\MessagingMemberType;
use App\Enums\MessagingSegmentType;
use App\Http\Controllers\Controller;
use App\Models\Campus;
use App\Models\CampusIntegrationPolicy;
use App\Models\Guardian;
use App\Models\MessagingAudience;
use App\Models\MessagingAudienceMember;
use App\Models\MessagingAudienceSegment;
use App\Models\MessagingBroadcast;
use App\Models\Student;
use App\Models\User;
use App\Services\WhatsApp\BroadcastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Messaging audiences (campus groups and broadcast lists) and broadcasts.
 *
 * Institution heads and campus admins manage audiences for their own tenant.
 * Campus-scoped audiences resolve recipients at send time; sending still obeys
 * consent, quota and template rules via the delivery engine.
 */
class MessagingAudienceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $campusId = $this->campusFilter($request);

        $audiences = MessagingAudience::query()
            ->where('institution_id', $institutionId)
            ->when($campusId !== null, fn ($q) => $q->where('campus_id', $campusId))
            ->withCount(['members', 'segments'])
            ->orderBy('name')
            ->get()
            ->map(fn (MessagingAudience $audience) => $this->audiencePayload($audience));

        return response()->json(['data' => $audiences]);
    }

    public function store(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $this->authoriseWrite($request, $institutionId, $request->integer('campus_id') ?: null);

        $data = $request->validate([
            'campus_id' => [
                'nullable', 'integer',
                Rule::exists('campuses', 'id')->where('institution_id', $institutionId)->whereNull('deleted_at'),
            ],
            'kind' => ['required', Rule::enum(MessagingAudienceKind::class)],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $audience = MessagingAudience::create(array_merge($data, [
            'institution_id' => $institutionId,
            'is_active' => true,
            'created_by' => $request->user()?->id,
        ]));

        return response()->json(['data' => $this->audiencePayload($audience)], 201);
    }

    public function show(Request $request, MessagingAudience $audience): JsonResponse
    {
        $this->authoriseTenant($request, $audience);

        $audience->load('members', 'segments');

        return response()->json(['data' => $this->audiencePayload($audience, true)]);
    }

    public function update(Request $request, MessagingAudience $audience): JsonResponse
    {
        $this->authoriseTenant($request, $audience);
        $this->authoriseWrite($request, (int) $audience->institution_id, $audience->campus_id !== null ? (int) $audience->campus_id : null);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $audience->update($data);

        return response()->json(['data' => $this->audiencePayload($audience->refresh())]);
    }

    public function destroy(Request $request, MessagingAudience $audience): JsonResponse
    {
        $this->authoriseTenant($request, $audience);
        $this->authoriseWrite($request, (int) $audience->institution_id, $audience->campus_id !== null ? (int) $audience->campus_id : null);

        $audience->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function addMembers(Request $request, MessagingAudience $audience): JsonResponse
    {
        $this->authoriseTenant($request, $audience);
        $this->authoriseWrite($request, (int) $audience->institution_id, $audience->campus_id !== null ? (int) $audience->campus_id : null);

        $data = $request->validate([
            'members' => ['required', 'array', 'min:1'],
            'members.*.type' => ['required', Rule::enum(MessagingMemberType::class)],
            'members.*.id' => ['nullable', 'integer'],
            'members.*.name' => ['nullable', 'string', 'max:120'],
            'members.*.phone' => ['nullable', 'string', 'max:32'],
        ]);

        $created = [];

        foreach ($data['members'] as $member) {
            $type = MessagingMemberType::from($member['type']);

            $created[] = MessagingAudienceMember::updateOrCreate(
                [
                    'audience_id' => $audience->id,
                    'member_type' => $type->value,
                    'member_id' => $member['id'] ?? null,
                ],
                [
                    'display_name' => $member['name'] ?? null,
                    'phone' => $member['phone'] ?? null,
                ],
            );
        }

        return response()->json([
            'data' => [
                'added' => count($created),
                'members' => $audience->members()->get(),
            ],
        ]);
    }

    public function removeMember(Request $request, MessagingAudience $audience, MessagingAudienceMember $member): JsonResponse
    {
        $this->authoriseTenant($request, $audience);

        if ((int) $member->audience_id !== (int) $audience->id) {
            abort(404);
        }

        $member->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function addSegment(Request $request, MessagingAudience $audience): JsonResponse
    {
        $this->authoriseTenant($request, $audience);
        $this->authoriseWrite($request, (int) $audience->institution_id, $audience->campus_id !== null ? (int) $audience->campus_id : null);

        $data = $request->validate([
            'segment_type' => ['required', Rule::enum(MessagingSegmentType::class)],
            'segment_ref' => ['nullable', 'integer'],
            'segment_value' => ['nullable', 'string', 'max:64'],
        ]);

        $segment = MessagingAudienceSegment::create([
            'audience_id' => $audience->id,
            'segment_type' => $data['segment_type'],
            'segment_ref' => $data['segment_ref'] ?? null,
            'segment_value' => $data['segment_value'] ?? null,
        ]);

        return response()->json(['data' => $segment], 201);
    }

    public function removeSegment(Request $request, MessagingAudience $audience, MessagingAudienceSegment $segment): JsonResponse
    {
        $this->authoriseTenant($request, $audience);

        if ((int) $segment->audience_id !== (int) $audience->id) {
            abort(404);
        }

        $segment->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /**
     * Preview the recipients an audience currently resolves to.
     */
    public function preview(Request $request, MessagingAudience $audience, BroadcastService $broadcast): JsonResponse
    {
        $this->authoriseTenant($request, $audience);
        $audience->load('members', 'segments');

        $recipients = $broadcast->recipients($audience);

        return response()->json([
            'data' => [
                'total' => count($recipients),
                'sample' => array_slice($recipients, 0, 25),
            ],
        ]);
    }

    public function broadcast(Request $request, MessagingAudience $audience, BroadcastService $broadcast): JsonResponse
    {
        $this->authoriseTenant($request, $audience);
        $this->authoriseWrite($request, (int) $audience->institution_id, $audience->campus_id !== null ? (int) $audience->campus_id : null);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $audience->load('members', 'segments');

        $record = MessagingBroadcast::create([
            'institution_id' => $audience->institution_id,
            'campus_id' => $audience->campus_id,
            'audience_id' => $audience->id,
            'title' => $data['title'],
            'body' => $data['body'],
            'created_by' => $request->user()?->id,
            'status' => 'queued',
        ]);

        $result = $broadcast->send($record, $audience, $request->user()?->id);

        return response()->json([
            'data' => [
                'broadcast_id' => $record->id,
                'total' => $result['total'],
                'sent' => $result['sent'],
                'failed' => $result['failed'],
            ],
        ]);
    }

    public function broadcasts(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $campusId = $this->campusFilter($request);

        $broadcasts = MessagingBroadcast::query()
            ->where('institution_id', $institutionId)
            ->when($campusId !== null, fn ($q) => $q->where('campus_id', $campusId))
            ->with('audience:id,name')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => $broadcasts]);
    }

    /**
     * Recipient directory the UI can add to audiences.
     */
    public function directory(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $campusId = $this->campusFilter($request);
        $search = trim((string) $request->query('q', ''));

        $guardians = Guardian::query()
            ->where('institution_id', $institutionId)
            ->when($campusId !== null, fn ($q) => $q->where('campus_id', $campusId))
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->limit(25)
            ->get(['id', 'name', 'phone'])
            ->map(fn (Guardian $guardian) => [
                'type' => 'guardian',
                'id' => $guardian->id,
                'name' => $guardian->name,
                'phone' => $guardian->phone,
            ]);

        $students = Student::query()
            ->where('institution_id', $institutionId)
            ->when($campusId !== null, fn ($q) => $q->where('campus_id', $campusId))
            ->when($search !== '', fn ($q) => $q->where('first_name', 'like', "%{$search}%"))
            ->limit(25)
            ->get()
            ->map(fn (Student $student) => [
                'type' => 'student',
                'id' => $student->id,
                'name' => $student->full_name,
                'phone' => null,
            ]);

        $staff = User::query()
            ->where('institution_id', $institutionId)
            ->when($campusId !== null, fn ($q) => $q->where('campus_id', $campusId))
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->limit(25)
            ->get(['id', 'name', 'phone'])
            ->map(fn (User $user) => [
                'type' => 'staff',
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
            ]);

        return response()->json([
            'data' => [
                'guardians' => $guardians,
                'students' => $students,
                'staff' => $staff,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function audiencePayload(MessagingAudience $audience, bool $withDetail = false): array
    {
        $payload = [
            'id' => $audience->id,
            'institution_id' => $audience->institution_id,
            'campus_id' => $audience->campus_id,
            'kind' => $audience->kind?->value,
            'name' => $audience->name,
            'description' => $audience->description,
            'is_active' => (bool) $audience->is_active,
            'members_count' => $audience->members_count ?? $audience->members()->count(),
            'segments_count' => $audience->segments_count ?? $audience->segments()->count(),
            'created_at' => $audience->created_at,
        ];

        if ($withDetail) {
            $payload['members'] = $audience->members->map(fn (MessagingAudienceMember $member) => [
                'id' => $member->id,
                'type' => $member->member_type?->value,
                'member_id' => $member->member_id,
                'name' => $member->display_name,
                'phone' => $member->phone,
            ])->values();

            $payload['segments'] = $audience->segments->map(fn (MessagingAudienceSegment $segment) => [
                'id' => $segment->id,
                'type' => $segment->segment_type?->value,
                'ref' => $segment->segment_ref,
                'value' => $segment->segment_value,
            ])->values();
        }

        return $payload;
    }

    private function institutionId(Request $request): int
    {
        $user = $request->user();

        if ($user->isPlatformAdmin()) {
            return (int) $request->integer('institution_id', $user->institution_id ?? 0);
        }

        if ($user->institution_id === null) {
            abort(403, 'Your account is not linked to an institution.');
        }

        return (int) $user->institution_id;
    }

    /**
     * Campus filter for reads: the X-Campus-Id header (tenant-scoped) or an
     * explicit query param for a platform admin.
     */
    private function campusFilter(Request $request): ?int
    {
        $requested = $request->header('X-Campus-Id');

        if ($requested !== null && $requested !== '') {
            return (int) $requested;
        }

        return $request->filled('campus_id') ? $request->integer('campus_id') : null;
    }

    private function authoriseTenant(Request $request, MessagingAudience $audience): void
    {
        $user = $request->user();

        if ($user->isPlatformAdmin()) {
            return;
        }

        if ((int) $audience->institution_id !== (int) $user->institution_id) {
            abort(403, 'This audience belongs to another institution.');
        }

        if (! $user->isInstitutionHead() && $audience->campus_id !== null
            && ! $user->canAccessCampus((int) $audience->campus_id)) {
            abort(403, 'You cannot manage this campus audience.');
        }
    }

    /**
     * Campus admins and institution heads may send only when their scope allows.
     * Campus admins additionally need the campus self-service toggle enabled by
     * the platform; institution heads inherit the tenant-wide policy.
     */
    private function authoriseWrite(Request $request, int $institutionId, ?int $campusId = null): void
    {
        $user = $request->user();

        if ($user->isPlatformAdmin() || $user->isInstitutionHead()) {
            return;
        }

        if ((int) $user->institution_id !== $institutionId) {
            abort(403, 'Cross-institution access is not allowed.');
        }

        $campusId ??= $this->campusFilter($request);

        if ($campusId === null && $user->campus_id !== null) {
            $campusId = (int) $user->campus_id;
        }

        if ($campusId !== null) {
            $policy = CampusIntegrationPolicy::query()
                ->where('institution_id', $institutionId)
                ->where('campus_id', $campusId)
                ->first();

            if ($policy !== null && ! $policy->whatsapp_self_service) {
                abort(403, 'Campus self-service messaging is disabled.');
            }
        }
    }
}
