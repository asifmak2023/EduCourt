<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'vendor_id' => $this->vendor_id,
            'reference' => $this->reference,
            'expense_date' => $this->expense_date?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'payee_name' => $this->payee_name,
            'bill_no' => $this->bill_no,
            'memo' => $this->memo,
            'total' => $this->total,
            'paid_amount' => $this->paid_amount,
            'outstanding' => number_format((float) $this->total - (float) $this->paid_amount, 2, '.', ''),
            'journal_entry_id' => $this->journal_entry_id,
            'approved_at' => $this->approved_at,
            'vendor' => VendorResource::make($this->whenLoaded('vendor')),
            'fiscal_year' => FiscalYearResource::make($this->whenLoaded('fiscalYear')),
            'lines' => ExpenseLineResource::collection($this->whenLoaded('lines')),
            'payments' => ExpensePaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at,
        ];
    }
}
