<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeChargeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'student_id' => $this->student_id,
            'enrollment_id' => $this->enrollment_id,
            'class_room_id' => $this->class_room_id,
            'section_id' => $this->section_id,
            'fee_structure_item_id' => $this->fee_structure_item_id,
            'fee_head_id' => $this->fee_head_id,
            'voucher_no' => $this->voucher_no,
            'billing_kind' => $this->billing_kind?->value,
            'billing_kind_label' => $this->billing_kind?->label(),
            'exam_term' => $this->exam_term?->value,
            'exam_term_label' => $this->exam_term?->label(),
            'period_year' => $this->period_year,
            'period_month' => $this->period_month,
            'title' => $this->title,
            'amount' => $this->amount,
            'discount_amount' => $this->discount_amount,
            'paid_amount' => $this->paid_amount,
            'balance' => number_format($this->balance(), 2, '.', ''),
            'due_date' => $this->due_date?->toDateString(),
            'status' => $this->status?->value,
            'source' => $this->source,
            'notes' => $this->notes,
            'journal_entry_id' => $this->journal_entry_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'section' => SectionResource::make($this->whenLoaded('section')),
            'fee_head' => FeeHeadResource::make($this->whenLoaded('feeHead')),
            'lines' => FeeChargeLineResource::collection($this->whenLoaded('lines')),
            'created_at' => $this->created_at,
        ];
    }
}
