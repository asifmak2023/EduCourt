<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaxReturnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'tax_rule_id' => $this->tax_rule_id,
            'journal_entry_id' => $this->journal_entry_id,
            'period_start' => $this->period_start?->toDateString(),
            'period_end' => $this->period_end?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'taxable_amount' => $this->taxable_amount,
            'tax_amount' => $this->tax_amount,
            'status' => $this->status?->value,
            'reference' => $this->reference,
            'filed_at' => $this->filed_at,
            'paid_at' => $this->paid_at,
            'remarks' => $this->remarks,
            'rule' => TaxRuleResource::make($this->whenLoaded('rule')),
            'documents' => TaxReturnDocumentResource::collection($this->whenLoaded('documents')),
            'journal_entry' => JournalEntryResource::make($this->whenLoaded('journalEntry')),
            'created_at' => $this->created_at,
        ];
    }
}
