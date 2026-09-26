<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaxReturnDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tax_return_id' => $this->tax_return_id,
            'name' => $this->name,
            'file_path' => $this->file_path,
            'is_required' => $this->is_required,
            'uploaded_by' => $this->uploaded_by,
            'uploaded_at' => $this->uploaded_at,
        ];
    }
}
