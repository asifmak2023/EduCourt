<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayslipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payroll_run_id' => $this->payroll_run_id,
            'staff_member_id' => $this->staff_member_id,
            'staff_salary_id' => $this->staff_salary_id,
            'basic' => $this->basic,
            'gross' => $this->gross,
            'deductions' => $this->deductions,
            'net' => $this->net,
            'working_days' => $this->working_days,
            'present_days' => $this->present_days,
            'notes' => $this->notes,
            'staff_member' => StaffMemberResource::make($this->whenLoaded('staffMember')),
            'items' => PayslipItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
        ];
    }
}
