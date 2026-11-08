<?php

namespace App\Models;

use App\Enums\WhatsAppMessageCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Append-only pricing snapshot used to estimate WhatsApp costs.
 */
class WhatsAppRateCard extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_rate_cards';

    protected $fillable = [
        'market', 'message_category', 'currency', 'unit_price',
        'effective_from', 'effective_to', 'source_note',
    ];

    protected function casts(): array
    {
        return [
            'message_category' => WhatsAppMessageCategory::class,
            'unit_price' => 'decimal:6',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    /**
     * Latest snapshot for a market and category at a given date.
     */
    public static function for(string $market, WhatsAppMessageCategory $category, ?\DateTimeInterface $on = null): ?self
    {
        $date = $on !== null ? Carbon::parse($on) : Carbon::today();

        return self::query()
            ->where('market', $market)
            ->where('message_category', $category->value)
            ->whereDate('effective_from', '<=', $date->toDateString())
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date->toDateString()))
            ->orderByDesc('effective_from')
            ->first();
    }
}
