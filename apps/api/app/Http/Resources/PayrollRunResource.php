<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayrollRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'period' => $this->period,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'total_gross' => $this->total_gross,
            'total_deductions' => $this->total_deductions,
            'total_net' => $this->total_net,
            'notes' => $this->notes,
            'approved_at' => $this->approved_at,
            'paid_at' => $this->paid_at,
            'payment_method' => $this->payment_method,
            'journal_entry_id' => $this->journal_entry_id,
            'payslips_count' => $this->whenCounted('payslips'),
            'payslips' => PayslipResource::collection($this->whenLoaded('payslips')),
            'created_at' => $this->created_at,
        ];
    }
}
