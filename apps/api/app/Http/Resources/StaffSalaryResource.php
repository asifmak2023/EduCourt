<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffSalaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'staff_member_id' => $this->staff_member_id,
            'basic_salary' => $this->basic_salary,
            'currency' => $this->currency,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'is_active' => (bool) $this->is_active,
            'notes' => $this->notes,
            'items' => StaffSalaryItemResource::collection($this->whenLoaded('items')),
            'staff_member' => StaffMemberResource::make($this->whenLoaded('staffMember')),
            'created_at' => $this->created_at,
        ];
    }
}
