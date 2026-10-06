<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeStructureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'class_room_id' => $this->class_room_id,
            'name' => $this->name,
            'is_active' => $this->is_active,
            'monthly_total' => $this->whenLoaded('items', fn () => $this->monthlyTotal()),
            'items' => FeeStructureItemResource::collection($this->whenLoaded('items')),
            'academic_year' => AcademicYearResource::make($this->whenLoaded('academicYear')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'created_at' => $this->created_at,
        ];
    }

    private function monthlyTotal(): float
    {
        return (float) $this->items
            ->where('billing_kind', \App\Enums\BillingKind::Monthly)
            ->where('is_active', true)
            ->sum('amount');
    }
}
