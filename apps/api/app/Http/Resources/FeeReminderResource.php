<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeReminderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => $this->student?->full_name),
            'admission_no' => $this->whenLoaded('student', fn () => $this->student?->admission_no),
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->whenLoaded('academicYear', fn () => $this->academicYear?->name),
            'guardian_id' => $this->guardian_id,
            'guardian' => $this->whenLoaded('guardian', fn () => $this->guardian?->name),
            'channel' => $this->channel?->value,
            'channel_label' => $this->channel?->label(),
            'recipient_name' => $this->recipient_name,
            'recipient_email' => $this->recipient_email,
            'recipient_phone' => $this->recipient_phone,
            'outstanding' => $this->outstanding,
            'bucket' => $this->bucket,
            'oldest_due_date' => $this->oldest_due_date?->toDateString(),
            'days_overdue' => $this->days_overdue,
            'message' => $this->message,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'sent_at' => $this->sent_at,
            'failure_reason' => $this->failure_reason,
            'created_at' => $this->created_at,
        ];
    }
}
