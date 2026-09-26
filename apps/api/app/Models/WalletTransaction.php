<?php

namespace App\Models;

use App\Enums\WalletTransactionType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory;

    protected $fillable = [
        'institution_id', 'campus_id', 'student_wallet_id', 'type', 'amount',
        'balance_after', 'reference', 'description', 'canteen_sale_id',
        'transaction_date', 'recorded_by', 'journal_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => WalletTransactionType::class,
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'transaction_date' => 'date',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(StudentWallet::class, 'student_wallet_id');
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(CanteenSale::class, 'canteen_sale_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
