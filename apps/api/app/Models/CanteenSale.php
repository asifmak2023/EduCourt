<?php

namespace App\Models;

use App\Enums\CanteenPaymentMethod;
use App\Enums\CanteenSaleStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CanteenSale extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'student_id', 'wallet_id', 'bill_no',
        'customer_name', 'payment_method', 'subtotal', 'discount', 'total',
        'cost_total', 'status', 'sold_on', 'notes', 'served_by',
        'journal_entry_id', 'voided_at', 'voided_by',
    ];

    protected function casts(): array
    {
        return [
            'payment_method' => CanteenPaymentMethod::class,
            'status' => CanteenSaleStatus::class,
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'total' => 'decimal:2',
            'cost_total' => 'decimal:2',
            'sold_on' => 'date',
            'voided_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(StudentWallet::class, 'wallet_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CanteenSaleItem::class);
    }

    public function servedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'served_by');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
