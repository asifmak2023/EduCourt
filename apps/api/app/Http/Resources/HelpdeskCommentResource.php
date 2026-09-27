<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HelpdeskCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'helpdesk_ticket_id' => $this->helpdesk_ticket_id,
            'user_id' => $this->user_id,
            'user' => UserResource::make($this->whenLoaded('user')),
            'body' => $this->body,
            'is_internal' => (bool) $this->is_internal,
            'created_at' => $this->created_at,
        ];
    }
}
