<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OtherIncomeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'income_source_id' => $this->income_source_id,
            'journal_entry_id' => $this->journal_entry_id,
            'receipt_no' => $this->receipt_no,
            'received_on' => $this->received_on?->toDateString(),
            'amount' => $this->amount,
            'method' => $this->method?->value,
            'payer_name' => $this->payer_name,
            'reference' => $this->reference,
            'remarks' => $this->remarks,
            'status' => $this->status?->value,
            'voided_at' => $this->voided_at,
            'source' => IncomeSourceResource::make($this->whenLoaded('source')),
            'journal_entry' => JournalEntryResource::make($this->whenLoaded('journalEntry')),
            'created_at' => $this->created_at,
        ];
    }
}
