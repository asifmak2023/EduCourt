<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeePlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = $this->relationLoaded('items') ? $this->items : collect();
        $required = $items->where('is_optional', false)->sum('amount');
        $optional = $items->where('is_optional', true)->sum('amount');

        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'class_room_id' => $this->class_room_id,
            'name' => $this->name,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'late_fee_type' => $this->late_fee_type?->value,
            'late_fee_amount' => $this->late_fee_amount,
            'late_fee_grace_days' => $this->late_fee_grace_days,
            'academic_year' => AcademicYearResource::make($this->whenLoaded('academicYear')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'items' => FeePlanItemResource::collection($this->whenLoaded('items')),
            'installments' => FeeInstallmentResource::collection($this->whenLoaded('installments')),
            'totals' => [
                'required' => number_format((float) $required, 2, '.', ''),
                'optional' => number_format((float) $optional, 2, '.', ''),
                'grand' => number_format((float) $required + (float) $optional, 2, '.', ''),
            ],
            'created_at' => $this->created_at,
        ];
    }
}
