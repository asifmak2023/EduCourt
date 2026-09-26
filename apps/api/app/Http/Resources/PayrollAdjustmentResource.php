<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayrollAdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'staff_member_id' => $this->staff_member_id,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'amount' => $this->amount,
            'period' => $this->period,
            'reason' => $this->reason,
            'is_applied' => (bool) $this->is_applied,
            'staff_member' => StaffMemberResource::make($this->whenLoaded('staffMember')),
            'created_at' => $this->created_at,
        ];
    }
}
