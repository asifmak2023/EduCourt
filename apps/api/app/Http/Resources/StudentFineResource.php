<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentFineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->full_name,
                'admission_no' => $this->student->admission_no,
            ]),
            'fine_rule_id' => $this->fine_rule_id,
            'rule' => $this->whenLoaded('rule', fn () => $this->rule === null ? null : [
                'id' => $this->rule->id,
                'name' => $this->rule->name,
                'code' => $this->rule->code,
                'category' => $this->rule->category?->value,
            ]),
            'academic_year_id' => $this->academic_year_id,
            'fee_voucher_id' => $this->fee_voucher_id,
            'voucher_no' => $this->whenLoaded('voucher', fn () => $this->voucher?->voucher_no),
            'amount' => $this->amount,
            'reason' => $this->reason,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'issued_on' => $this->issued_on?->toDateString(),
            'applied_at' => $this->applied_at?->toIso8601String(),
            'journal_entry_id' => $this->journal_entry_id,
            'waived_by' => $this->whenLoaded('waivedBy', fn () => $this->waivedBy?->name),
            'waived_at' => $this->waived_at?->toIso8601String(),
            'waived_reason' => $this->waived_reason,
            'created_at' => $this->created_at,
        ];
    }
}
