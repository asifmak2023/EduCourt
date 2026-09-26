<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppNotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'channel' => $this->channel?->value,
            'channel_label' => $this->channel?->label(),
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => $this->student?->full_name),
            'admission_no' => $this->whenLoaded('student', fn () => $this->student?->admission_no),
            'guardian_id' => $this->guardian_id,
            'guardian' => $this->whenLoaded('guardian', fn () => $this->guardian?->name),
            'recipient_name' => $this->recipient_name,
            'recipient_email' => $this->recipient_email,
            'recipient_phone' => $this->recipient_phone,
            'title' => $this->title,
            'body' => $this->body,
            'occurred_on' => $this->occurred_on?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'sent_at' => $this->sent_at,
            'failure_reason' => $this->failure_reason,
            'created_at' => $this->created_at,
        ];
    }
}
