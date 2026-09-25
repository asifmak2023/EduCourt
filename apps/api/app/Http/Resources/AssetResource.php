<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'chart_of_account_id' => $this->chart_of_account_id,
            'code' => $this->code,
            'name' => $this->name,
            'category' => $this->category,
            'serial_no' => $this->serial_no,
            'location' => $this->location,
            'custodian' => $this->custodian,
            'acquisition_date' => $this->acquisition_date?->toDateString(),
            'acquisition_cost' => $this->acquisition_cost,
            'salvage_value' => $this->salvage_value,
            'useful_life_months' => $this->useful_life_months,
            'depreciation_method' => $this->depreciation_method?->value,
            'depreciation_method_label' => $this->depreciation_method?->label(),
            'monthly_depreciation' => number_format($this->monthlyDepreciation(), 2, '.', ''),
            'accumulated_depreciation' => number_format($this->accumulatedDepreciation(), 2, '.', ''),
            'book_value' => number_format($this->bookValue(), 2, '.', ''),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'disposed_on' => $this->disposed_on?->toDateString(),
            'disposal_proceeds' => $this->disposal_proceeds,
            'notes' => $this->notes,
            'chart_of_account' => ChartOfAccountResource::make($this->whenLoaded('chartOfAccount')),
            'created_at' => $this->created_at,
        ];
    }
}
