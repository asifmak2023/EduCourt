<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'leave_type' => $this->leave_type?->value,
            'leave_type_label' => $this->leave_type?->label(),
            'from_date' => $this->from_date?->toDateString(),
            'to_date' => $this->to_date?->toDateString(),
            'days' => $this->days,
            'reason' => $this->reason,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'decided_by' => $this->whenLoaded('decidedBy', fn () => $this->decidedBy?->name),
            'decided_on' => $this->decided_on?->toDateString(),
            'decision_note' => $this->decision_note,
            'created_at' => $this->created_at,
        ];
    }
}
