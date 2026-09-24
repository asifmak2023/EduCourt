<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'expense_category_id' => $this->expense_category_id,
            'amount' => $this->amount,
            'description' => $this->description,
            'category' => ExpenseCategoryResource::make($this->whenLoaded('category')),
        ];
    }
}
