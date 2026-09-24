<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'payable_account_id' => $this->payable_account_id,
            'code' => $this->code,
            'name' => $this->name,
            'contact_name' => $this->contact_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'tax_number' => $this->tax_number,
            'address' => $this->address,
            'notes' => $this->notes,
            'is_active' => $this->is_active,
            'payable_account' => ChartOfAccountResource::make($this->whenLoaded('payableAccount')),
            'created_at' => $this->created_at,
        ];
    }
}
