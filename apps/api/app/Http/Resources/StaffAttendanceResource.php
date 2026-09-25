<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffAttendanceResource extends JsonResource
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
            'attendance_date' => $this->attendance_date?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'check_in' => $this->check_in,
            'check_out' => $this->check_out,
            'remarks' => $this->remarks,
            'marked_by' => $this->whenLoaded('markedBy', fn () => $this->markedBy?->name),
            'created_at' => $this->created_at,
        ];
    }
}
