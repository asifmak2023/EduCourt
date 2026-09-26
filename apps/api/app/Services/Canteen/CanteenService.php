<?php

namespace App\Services\Canteen;

use App\Enums\CanteenPaymentMethod;
use App\Enums\CanteenSaleStatus;
use App\Enums\JournalStatus;
use App\Enums\PaymentMethod;
use App\Enums\StockEntryType;
use App\Enums\WalletTransactionType;
use App\Models\CanteenItem;
use App\Models\CanteenSale;
use App\Models\CanteenStockEntry;
use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\Student;
use App\Models\StudentWallet;
use App\Models\WalletTransaction;
use App\Services\Accounting\JournalService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns canteen POS billing, wallet movements and stock movements, keeping the
 * double-entry ledger in step with every cash, wallet or credit event.
 */
class CanteenService
{
    public function __construct(private readonly JournalService $journals) {}

    public function walletFor(Student $student): StudentWallet
    {
        return StudentWallet::firstOrCreate(
            ['campus_id' => $student->campus_id, 'student_id' => $student->id],
            [
                'institution_id' => $student->institution_id,
                'balance' => 0,
                'is_active' => true,
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createSale(array $data, int $campusId, int $institutionId, ?int $userId): CanteenSale
    {
        $method = CanteenPaymentMethod::from($data['payment_method']);
        $soldOn = $data['sold_on'] ?? now()->toDateString();
        $lines = $this->priceLines($data['items']);

        $subtotal = round(array_sum(array_column($lines, 'line_total')), 2);
        $discount = round((float) ($data['discount'] ?? 0), 2);

        if ($discount > $subtotal) {
            throw ValidationException::withMessages(['discount' => ['The discount cannot exceed the subtotal.']]);
        }

        $total = round($subtotal - $discount, 2);
        $costTotal = round(array_sum(array_column($lines, 'line_cost')), 2);

        $student = null;
        $wallet = null;

        if (isset($data['student_id'])) {
            $student = Student::query()->findOrFail($data['student_id']);
        }

        if ($method === CanteenPaymentMethod::Wallet) {
            if ($student === null) {
                throw ValidationException::withMessages(['student_id' => ['A wallet sale requires a student.']]);
            }

            $wallet = $this->walletFor($student);
            $this->assertWalletCanSpend($wallet, (float) $total, $soldOn);
        }

        if ($method === CanteenPaymentMethod::Credit && $student === null) {
            throw ValidationException::withMessages(['student_id' => ['A credit sale requires a student.']]);
        }

        return DB::transaction(function () use ($data, $method, $soldOn, $lines, $subtotal, $discount, $total, $costTotal, $student, $wallet, $campusId, $institutionId, $userId) {
            $sale = CanteenSale::create([
                'institution_id' => $institutionId,
                'campus_id' => $campusId,
                'student_id' => $student?->id,
                'wallet_id' => $wallet?->id,
                'bill_no' => $this->nextBillNo($campusId),
                'customer_name' => $data['customer_name'] ?? ($student !== null ? $student->full_name : null),
                'payment_method' => $method,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'cost_total' => $costTotal,
                'status' => CanteenSaleStatus::Completed,
                'sold_on' => $soldOn,
                'notes' => $data['notes'] ?? null,
                'served_by' => $userId,
            ]);

            foreach ($lines as $line) {
                $sale->items()->create([
                    'institution_id' => $institutionId,
                    'campus_id' => $campusId,
                    'canteen_item_id' => $line['item']->id,
                    'item_name' => $line['item']->name,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['unit_cost'],
                    'line_total' => $line['line_total'],
                ]);

                if ($line['item']->track_stock) {
                    $line['item']->decrement('stock_quantity', $line['quantity']);
                }
            }

            if ($wallet !== null) {
                $this->recordWalletMovement($wallet, WalletTransactionType::Purchase, -$total, $soldOn, $userId, $sale, 'Canteen purchase '.$sale->bill_no);
            }

            $entry = $this->postSaleJournal($sale, $costTotal, $userId);

            $sale->forceFill(['journal_entry_id' => $entry->id])->save();

            return $sale->refresh()->load('items');
        });
    }

    public function voidSale(CanteenSale $sale, ?int $userId, ?string $memo = null): CanteenSale
    {
        if ($sale->status === CanteenSaleStatus::Void) {
            abort(409, 'The sale is already void.');
        }

        return DB::transaction(function () use ($sale, $userId, $memo) {
            foreach ($sale->items as $item) {
                $canteenItem = CanteenItem::query()->find($item->canteen_item_id);

                if ($canteenItem !== null && $canteenItem->track_stock) {
                    $canteenItem->increment('stock_quantity', (float) $item->quantity);
                }
            }

            if ($sale->wallet_id !== null) {
                $wallet = StudentWallet::query()->find($sale->wallet_id);

                if ($wallet !== null) {
                    $this->recordWalletMovement($wallet, WalletTransactionType::Refund, (float) $sale->total, $sale->sold_on->toDateString(), $userId, $sale, 'Reversal for '.$sale->bill_no);
                }
            }

            if ($sale->journalEntry !== null) {
                $this->journals->reverse($sale->journalEntry, $userId, $memo);
            }

            $sale->forceFill([
                'status' => CanteenSaleStatus::Void,
                'voided_at' => now(),
                'voided_by' => $userId,
            ])->save();

            return $sale->refresh();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function topUp(StudentWallet $wallet, float $amount, PaymentMethod $method, ?int $userId, ?string $reference = null): array
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['The top-up amount must be greater than zero.']]);
        }

        if (! $wallet->is_active) {
            throw ValidationException::withMessages(['wallet' => ['This wallet is not active.']]);
        }

        return DB::transaction(function () use ($wallet, $amount, $method, $userId, $reference) {
            $entry = $this->postWalletTopUpJournal($wallet, $amount, $method, $userId, $reference);
            $wallet->increment('balance', $amount);

            return [
                'wallet' => $wallet->refresh(),
                'journal_entry_id' => $entry->id,
            ];
        });
    }

    public function adjustWallet(StudentWallet $wallet, float $amount, ?int $userId, ?string $description = null): WalletTransaction
    {
        if ($amount === 0.0) {
            throw ValidationException::withMessages(['amount' => ['The adjustment cannot be zero.']]);
        }

        if ((float) $wallet->balance + $amount < 0) {
            throw ValidationException::withMessages(['amount' => ['The adjustment would overdraw the wallet.']]);
        }

        return DB::transaction(function () use ($wallet, $amount, $userId, $description) {
            $wallet->increment('balance', $amount);

            return WalletTransaction::create([
                'institution_id' => $wallet->institution_id,
                'campus_id' => $wallet->campus_id,
                'student_wallet_id' => $wallet->id,
                'type' => WalletTransactionType::Adjustment,
                'amount' => $amount,
                'balance_after' => (float) $wallet->refresh()->balance,
                'description' => $description ?? 'Manual wallet adjustment',
                'transaction_date' => now()->toDateString(),
                'recorded_by' => $userId,
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createStockEntry(array $data, int $campusId, int $institutionId, ?int $userId): CanteenStockEntry
    {
        $item = CanteenItem::query()->findOrFail($data['canteen_item_id']);
        $type = StockEntryType::from($data['type'] ?? StockEntryType::Purchase->value);
        $entryDate = $data['entry_date'] ?? now()->toDateString();
        $quantity = (float) $data['quantity'];
        $unitCost = round((float) ($data['unit_cost'] ?? $item->cost_price), 2);
        $delta = $type->stockDelta($quantity);

        if ($delta < 0 && $quantity > (float) $item->stock_quantity && $item->track_stock) {
            throw ValidationException::withMessages(['quantity' => ['The stock movement would take the item below zero.']]);
        }

        return DB::transaction(function () use ($data, $item, $type, $entryDate, $quantity, $unitCost, $delta, $campusId, $institutionId, $userId) {
            $balanceAfter = $item->track_stock
                ? round((float) $item->stock_quantity + $delta, 2)
                : (float) $item->stock_quantity;

            $totalCost = $type->movesValue() ? round(abs($delta) * $unitCost, 2) : 0.0;

            $entry = CanteenStockEntry::create([
                'institution_id' => $institutionId,
                'campus_id' => $campusId,
                'canteen_item_id' => $item->id,
                'supplier_id' => $data['supplier_id'] ?? null,
                'type' => $type,
                'reference' => $data['reference'] ?? null,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'balance_after' => $balanceAfter,
                'entry_date' => $entryDate,
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $userId,
            ]);

            if ($item->track_stock) {
                $item->forceFill(['stock_quantity' => $balanceAfter])->save();
            }

            if ($unitCost > 0 && $item->track_stock) {
                $item->forceFill(['cost_price' => $unitCost])->save();
            }

            if ($totalCost > 0) {
                $this->postStockJournal($entry, $type, $item, $totalCost, $entryDate, $userId);
            }

            return $entry->refresh()->load('item', 'supplier');
        });
    }

    public function nextBillNo(int $campusId): string
    {
        $sequence = CanteenSale::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $billNo = sprintf('CANT-%06d', $sequence);
            $sequence++;
        } while (CanteenSale::withTrashed()->where('campus_id', $campusId)->where('bill_no', $billNo)->exists());

        return $billNo;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array{item: CanteenItem, quantity: float, unit_price: float, unit_cost: float, line_total: float, line_cost: float}>
     */
    private function priceLines(array $items): array
    {
        $lines = [];

        foreach ($items as $index => $row) {
            /** @var CanteenItem $item */
            $item = CanteenItem::query()->findOrFail($row['canteen_item_id']);
            $quantity = (float) $row['quantity'];

            if ($quantity <= 0) {
                throw ValidationException::withMessages(["items.{$index}.quantity" => ['The quantity must be greater than zero.']]);
            }

            if ($item->track_stock && $quantity > (float) $item->stock_quantity) {
                throw ValidationException::withMessages(["items.{$index}.quantity" => ["Only {$item->stock_quantity} {$item->unit} of {$item->name} are in stock."]]);
            }

            $unitPrice = (float) $item->price;
            $unitCost = (float) $item->cost_price;

            $lines[] = [
                'item' => $item,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'unit_cost' => $unitCost,
                'line_total' => round($unitPrice * $quantity, 2),
                'line_cost' => $item->track_stock ? round($unitCost * $quantity, 2) : 0.0,
            ];
        }

        if ($lines === []) {
            throw ValidationException::withMessages(['items' => ['A sale must contain at least one item.']]);
        }

        return $lines;
    }

    private function assertWalletCanSpend(StudentWallet $wallet, float $amount, string $date): void
    {
        if (! $wallet->is_active) {
            throw ValidationException::withMessages(['wallet' => ['This wallet is not active.']]);
        }

        if ((float) $wallet->balance < $amount) {
            throw ValidationException::withMessages(['wallet' => ['The wallet balance is insufficient for this sale.']]);
        }

        if ($wallet->daily_limit !== null) {
            $spentToday = (float) WalletTransaction::query()
                ->where('student_wallet_id', $wallet->id)
                ->where('type', WalletTransactionType::Purchase->value)
                ->whereDate('transaction_date', $date)
                ->sum('amount');

            if (abs($spentToday) + $amount > (float) $wallet->daily_limit) {
                throw ValidationException::withMessages(['wallet' => ['This sale exceeds the daily wallet spending limit.']]);
            }
        }
    }

    private function recordWalletMovement(StudentWallet $wallet, WalletTransactionType $type, float $amount, string $date, ?int $userId, CanteenSale $sale, string $description): WalletTransaction
    {
        $wallet->increment('balance', $amount);

        return WalletTransaction::create([
            'institution_id' => $wallet->institution_id,
            'campus_id' => $wallet->campus_id,
            'student_wallet_id' => $wallet->id,
            'type' => $type,
            'amount' => $amount,
            'balance_after' => (float) $wallet->refresh()->balance,
            'reference' => $sale->bill_no,
            'description' => $description,
            'canteen_sale_id' => $sale->id,
            'transaction_date' => $date,
            'recorded_by' => $userId,
        ]);
    }

    private function postSaleJournal(CanteenSale $sale, float $costTotal, ?int $userId): JournalEntry
    {
        $fiscalYear = $this->fiscalYearFor($sale->sold_on->toDateString());
        $income = $this->resolveAccount(config('finance.accounts.canteen_income'));
        $debit = match ($sale->payment_method) {
            CanteenPaymentMethod::Cash => $this->resolveAccount(config('finance.accounts.cash')),
            CanteenPaymentMethod::Wallet => $this->resolveAccount(config('finance.accounts.wallet_payable')),
            CanteenPaymentMethod::Credit => $this->resolveAccount(config('finance.accounts.receivable')),
        };

        $lines = [
            [
                'chart_of_account_id' => $debit->id,
                'line_no' => 1,
                'description' => 'Canteen sale '.$sale->bill_no,
                'debit' => (float) $sale->total,
                'credit' => 0,
            ],
            [
                'chart_of_account_id' => $income->id,
                'line_no' => 2,
                'description' => 'Canteen sale '.$sale->bill_no,
                'debit' => 0,
                'credit' => (float) $sale->total,
            ],
        ];

        if ($costTotal > 0) {
            $cogs = $this->resolveAccount(config('finance.accounts.cost_of_goods_sold'));
            $inventory = $this->resolveAccount(config('finance.accounts.canteen_inventory'));

            $lines[] = [
                'chart_of_account_id' => $cogs->id,
                'line_no' => 3,
                'description' => 'Cost of canteen sale '.$sale->bill_no,
                'debit' => $costTotal,
                'credit' => 0,
            ];
            $lines[] = [
                'chart_of_account_id' => $inventory->id,
                'line_no' => 4,
                'description' => 'Cost of canteen sale '.$sale->bill_no,
                'debit' => 0,
                'credit' => $costTotal,
            ];
        }

        $entry = JournalEntry::create([
            'institution_id' => $sale->institution_id,
            'campus_id' => $sale->campus_id,
            'fiscal_year_id' => $fiscalYear->id,
            'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
            'entry_date' => $sale->sold_on->toDateString(),
            'status' => JournalStatus::Draft,
            'memo' => 'Canteen sale '.$sale->bill_no,
            'source_type' => $sale->getMorphClass(),
            'source_id' => $sale->id,
        ]);

        $entry->lines()->createMany($lines);
        $this->journals->post($entry, $userId);

        return $entry;
    }

    private function postWalletTopUpJournal(StudentWallet $wallet, float $amount, PaymentMethod $method, ?int $userId, ?string $reference): JournalEntry
    {
        $fiscalYear = $this->fiscalYearFor(now()->toDateString());
        $debit = $this->resolveAccount($method === PaymentMethod::Cash
            ? config('finance.accounts.cash')
            : config('finance.accounts.bank'));
        $liability = $this->resolveAccount(config('finance.accounts.wallet_payable'));

        $entry = JournalEntry::create([
            'institution_id' => $wallet->institution_id,
            'campus_id' => $wallet->campus_id,
            'fiscal_year_id' => $fiscalYear->id,
            'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
            'entry_date' => now()->toDateString(),
            'status' => JournalStatus::Draft,
            'memo' => 'Wallet top-up '.($reference ?? 'for student #'.$wallet->student_id),
            'source_type' => $wallet->getMorphClass(),
            'source_id' => $wallet->id,
        ]);

        $entry->lines()->createMany([
            [
                'chart_of_account_id' => $debit->id,
                'line_no' => 1,
                'description' => 'Wallet top-up',
                'debit' => $amount,
                'credit' => 0,
            ],
            [
                'chart_of_account_id' => $liability->id,
                'line_no' => 2,
                'description' => 'Wallet top-up',
                'debit' => 0,
                'credit' => $amount,
            ],
        ]);

        $this->journals->post($entry, $userId);

        WalletTransaction::create([
            'institution_id' => $wallet->institution_id,
            'campus_id' => $wallet->campus_id,
            'student_wallet_id' => $wallet->id,
            'type' => WalletTransactionType::TopUp,
            'amount' => $amount,
            'balance_after' => round((float) $wallet->balance + $amount, 2),
            'reference' => $reference,
            'description' => 'Wallet top-up',
            'transaction_date' => now()->toDateString(),
            'recorded_by' => $userId,
            'journal_entry_id' => $entry->id,
        ]);

        return $entry;
    }

    private function postStockJournal(CanteenStockEntry $entry, StockEntryType $type, CanteenItem $item, float $totalCost, string $date, ?int $userId): void
    {
        $fiscalYear = $this->fiscalYearFor($date);
        $inventory = $this->resolveAccount(config('finance.accounts.canteen_inventory'));

        $credit = match (true) {
            $type === StockEntryType::Wastage => $this->resolveAccount(config('finance.accounts.cost_of_goods_sold')),
            $entry->supplier_id !== null => $this->resolveAccount(config('finance.accounts.vendor_payable')),
            default => $this->resolveAccount(config('finance.accounts.cash')),
        };

        $journal = JournalEntry::create([
            'institution_id' => $entry->institution_id,
            'campus_id' => $entry->campus_id,
            'fiscal_year_id' => $fiscalYear->id,
            'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
            'entry_date' => $date,
            'status' => JournalStatus::Draft,
            'memo' => ucfirst($type->value).' of '.$item->name,
            'source_type' => $entry->getMorphClass(),
            'source_id' => $entry->id,
        ]);

        $increasesInventory = in_array($type, [StockEntryType::Purchase, StockEntryType::Return], true);

        $journal->lines()->createMany([
            [
                'chart_of_account_id' => $increasesInventory ? $inventory->id : $credit->id,
                'line_no' => 1,
                'description' => ucfirst($type->value).' of '.$item->name,
                'debit' => $totalCost,
                'credit' => 0,
            ],
            [
                'chart_of_account_id' => $increasesInventory ? $credit->id : $inventory->id,
                'line_no' => 2,
                'description' => ucfirst($type->value).' of '.$item->name,
                'debit' => 0,
                'credit' => $totalCost,
            ],
        ]);

        $this->journals->post($journal, $userId);
    }

    private function resolveAccount(string $code): ChartOfAccount
    {
        $account = ChartOfAccount::query()
            ->where('code', $code)
            ->where('is_group', false)
            ->first();

        if ($account === null) {
            throw ValidationException::withMessages([
                'account' => ["Chart of accounts is missing the required account [{$code}]."],
            ]);
        }

        return $account;
    }

    private function fiscalYearFor(string $date): FiscalYear
    {
        $fiscalYear = FiscalYear::query()
            ->whereDate('starts_on', '<=', $date)
            ->whereDate('ends_on', '>=', $date)
            ->orderByDesc('starts_on')
            ->first()
            ?? FiscalYear::query()->where('is_current', true)->first();

        if ($fiscalYear === null) {
            throw ValidationException::withMessages([
                'fiscal_year' => ['No fiscal year covers this date. Create a fiscal year first.'],
            ]);
        }

        return $fiscalYear;
    }
}
