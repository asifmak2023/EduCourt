<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'reference' => $this->reference,
            'entry_date' => $this->entry_date?->toDateString(),
            'status' => $this->status?->value,
            'memo' => $this->memo,
            'total_debit' => $this->total_debit,
            'total_credit' => $this->total_credit,
            'posted_at' => $this->posted_at,
            'posted_by' => $this->posted_by,
            'reversed_by_id' => $this->reversed_by_id,
            'reversal_of_id' => $this->reversal_of_id,
            'fiscal_year' => FiscalYearResource::make($this->whenLoaded('fiscalYear')),
            'lines' => JournalLineResource::collection($this->whenLoaded('lines')),
            'created_at' => $this->created_at,
        ];
    }
}
