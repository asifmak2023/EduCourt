<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\HelpdeskCommentResource;
use App\Http\Resources\HelpdeskTicketResource;
use App\Models\HelpdeskTicket;
use App\Services\It\ItService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class HelpdeskTicketController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ItService $it) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $tickets = HelpdeskTicket::query()
            ->with(['reporter', 'assignee', 'asset'])
            ->withCount('comments')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('priority'), fn ($q) => $q->where('priority', $request->string('priority')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('assigned_to'), fn ($q) => $q->where('assigned_to', $request->integer('assigned_to')))
            ->when($request->boolean('overdue'), fn ($q) => $q
                ->whereNotIn('status', ['resolved', 'closed'])
                ->whereNotNull('sla_due_at')
                ->where('sla_due_at', '<', now()))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return HelpdeskTicketResource::collection($tickets);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $ticket = $this->it->createTicket($data, $tenant, $request->user()?->id);

        return (new HelpdeskTicketResource($ticket->load(['reporter', 'assignee', 'asset'])))->response()->setStatusCode(201);
    }

    public function show(HelpdeskTicket $ticket): HelpdeskTicketResource
    {
        return new HelpdeskTicketResource($ticket->load(['reporter', 'assignee', 'asset'])->loadCount('comments'));
    }

    public function update(Request $request, HelpdeskTicket $ticket): HelpdeskTicketResource
    {
        $ticket->update($request->validate($this->rules($ticket->campus_id, false)));

        return new HelpdeskTicketResource($ticket->load(['reporter', 'assignee', 'asset']));
    }

    public function assign(Request $request, HelpdeskTicket $ticket): HelpdeskTicketResource
    {
        $data = $request->validate([
            'assigned_to' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        return new HelpdeskTicketResource(
            $this->it->assignTicket($ticket, $data['assigned_to'])->load(['reporter', 'assignee', 'asset'])
        );
    }

    public function comments(HelpdeskTicket $ticket): AnonymousResourceCollection
    {
        return HelpdeskCommentResource::collection(
            $ticket->comments()->with('user')->orderBy('id')->paginate(50)
        );
    }

    public function addComment(Request $request, HelpdeskTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string'],
            'is_internal' => ['sometimes', 'boolean'],
        ]);

        $comment = $this->it->addComment($ticket, $data, $request->user()?->id);

        return (new HelpdeskCommentResource($comment->load('user')))->response()->setStatusCode(201);
    }

    public function resolve(Request $request, HelpdeskTicket $ticket): HelpdeskTicketResource
    {
        $data = $request->validate(['resolution' => ['required', 'string']]);

        return new HelpdeskTicketResource(
            $this->it->resolveTicket($ticket, $data['resolution'])->load(['reporter', 'assignee', 'asset'])
        );
    }

    public function close(HelpdeskTicket $ticket): HelpdeskTicketResource
    {
        return new HelpdeskTicketResource(
            $this->it->closeTicket($ticket)->load(['reporter', 'assignee', 'asset'])
        );
    }

    public function destroy(HelpdeskTicket $ticket): JsonResponse
    {
        $ticket->delete();

        return response()->json(['message' => 'Ticket removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'subject' => [$presence, 'string', 'max:255'],
            'description' => [$presence, 'string'],
            'category' => ['sometimes', Rule::in(['hardware', 'software', 'network', 'account', 'other'])],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'critical'])],
            'status' => ['sometimes', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'it_asset_id' => ['nullable', 'integer', Rule::exists('it_assets', 'id')->where('campus_id', $campusId)],
            'reported_at' => ['nullable', 'date'],
        ];
    }
}
