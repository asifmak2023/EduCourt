<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApprovalRequestActionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sequence' => $this->sequence,
            'user_id' => $this->user_id,
            'action' => $this->action?->value,
            'comment' => $this->comment,
            'acted_at' => $this->acted_at,
        ];
    }
}
