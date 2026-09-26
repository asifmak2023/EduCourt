<?php

namespace App\Http\Controllers\Api;

use App\Enums\CanteenSaleStatus;
use App\Enums\StockEntryType;
use App\Enums\WalletTransactionType;
use App\Http\Controllers\Controller;
use App\Http\Resources\CanteenItemResource;
use App\Models\CanteenItem;
use App\Models\CanteenSale;
use App\Models\CanteenSaleItem;
use App\Models\CanteenStockEntry;
use App\Models\StudentWallet;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CanteenReportController extends Controller
{
    public function daily(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = CanteenSale::query()
            ->where('status', CanteenSaleStatus::Completed->value)
            ->when($data['from'] ?? null, fn ($q, $from) => $q->whereDate('sold_on', '>=', $from))
            ->when($data['to'] ?? null, fn ($q, $to) => $q->whereDate('sold_on', '<=', $to));

        $byDay = (clone $query)
            ->select('sold_on')
            ->selectRaw('count(*) as bills, sum(total) as revenue, sum(cost_total) as cost, sum(discount) as discount')
            ->groupBy('sold_on')
            ->orderByDesc('sold_on')
            ->get()
            ->map(fn ($row) => [
                'sold_on' => $row->sold_on,
                'bills' => (int) $row->bills,
                'revenue' => round((float) $row->revenue, 2),
                'cost' => round((float) $row->cost, 2),
                'discount' => round((float) $row->discount, 2),
                'profit' => round((float) $row->revenue - (float) $row->cost, 2),
            ]);

        $byMethod = (clone $query)
            ->select('payment_method')
            ->selectRaw('count(*) as bills, sum(total) as revenue')
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($row) => [
                'payment_method' => $row->payment_method,
                'bills' => (int) $row->bills,
                'revenue' => round((float) $row->revenue, 2),
            ]);

        return response()->json([
            'data' => [
                'from' => $data['from'] ?? null,
                'to' => $data['to'] ?? null,
                'totals' => [
                    'bills' => (int) (clone $query)->count(),
                    'revenue' => round((float) (clone $query)->sum('total'), 2),
                    'cost' => round((float) (clone $query)->sum('cost_total'), 2),
                    'discount' => round((float) (clone $query)->sum('discount'), 2),
                ],
                'by_day' => $byDay,
                'by_payment_method' => $byMethod,
            ],
        ]);
    }

    public function itemWise(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $rows = CanteenSaleItem::query()
            ->join('canteen_sales', 'canteen_sales.id', '=', 'canteen_sale_items.canteen_sale_id')
            ->where('canteen_sales.status', CanteenSaleStatus::Completed->value)
            ->when($data['from'] ?? null, fn ($q, $from) => $q->whereDate('canteen_sales.sold_on', '>=', $from))
            ->when($data['to'] ?? null, fn ($q, $to) => $q->whereDate('canteen_sales.sold_on', '<=', $to))
            ->groupBy('canteen_sale_items.canteen_item_id', 'canteen_sale_items.item_name')
            ->orderByDesc(DB::raw('sum(canteen_sale_items.line_total)'))
            ->get([
                'canteen_sale_items.canteen_item_id',
                'canteen_sale_items.item_name',
                DB::raw('sum(canteen_sale_items.quantity) as quantity'),
                DB::raw('sum(canteen_sale_items.line_total) as revenue'),
                DB::raw('sum(canteen_sale_items.unit_cost * canteen_sale_items.quantity) as cost'),
            ]);

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'canteen_item_id' => $row->canteen_item_id,
                'item_name' => $row->item_name,
                'quantity' => round((float) $row->quantity, 2),
                'revenue' => round((float) $row->revenue, 2),
                'cost' => round((float) $row->cost, 2),
                'profit' => round((float) $row->revenue - (float) $row->cost, 2),
            ]),
        ]);
    }

    public function profitLoss(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $sales = CanteenSale::query()
            ->where('status', CanteenSaleStatus::Completed->value)
            ->when($data['from'] ?? null, fn ($q, $from) => $q->whereDate('sold_on', '>=', $from))
            ->when($data['to'] ?? null, fn ($q, $to) => $q->whereDate('sold_on', '<=', $to));

        $revenue = round((float) (clone $sales)->sum('total'), 2);
        $cogs = round((float) (clone $sales)->sum('cost_total'), 2);

        $wastage = round((float) CanteenStockEntry::query()
            ->where('type', StockEntryType::Wastage->value)
            ->when($data['from'] ?? null, fn ($q, $from) => $q->whereDate('entry_date', '>=', $from))
            ->when($data['to'] ?? null, fn ($q, $to) => $q->whereDate('entry_date', '<=', $to))
            ->sum('total_cost'), 2);

        return response()->json([
            'data' => [
                'from' => $data['from'] ?? null,
                'to' => $data['to'] ?? null,
                'revenue' => $revenue,
                'cost_of_goods_sold' => $cogs,
                'gross_profit' => round($revenue - $cogs, 2),
                'wastage' => $wastage,
                'net_profit' => round($revenue - $cogs - $wastage, 2),
                'margin_percentage' => $revenue > 0 ? round(($revenue - $cogs) / $revenue * 100, 2) : null,
            ],
        ]);
    }

    public function lowStock(Request $request): JsonResponse
    {
        $items = CanteenItem::query()
            ->where('track_stock', true)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('stock_quantity')
            ->get();

        return response()->json(['data' => CanteenItemResource::collection($items)->resolve()]);
    }

    public function walletSummary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $transactions = WalletTransaction::query()
            ->when($data['from'] ?? null, fn ($q, $from) => $q->whereDate('transaction_date', '>=', $from))
            ->when($data['to'] ?? null, fn ($q, $to) => $q->whereDate('transaction_date', '<=', $to));

        $topUps = (float) (clone $transactions)->where('type', WalletTransactionType::TopUp->value)->sum('amount');
        $purchases = (float) (clone $transactions)->where('type', WalletTransactionType::Purchase->value)->sum('amount');

        return response()->json([
            'data' => [
                'from' => $data['from'] ?? null,
                'to' => $data['to'] ?? null,
                'wallets' => (int) StudentWallet::query()->count(),
                'outstanding_balance' => round((float) StudentWallet::query()->sum('balance'), 2),
                'top_ups' => round($topUps, 2),
                'purchases' => round(abs($purchases), 2),
                'low_balance_wallets' => (int) StudentWallet::query()
                    ->whereNotNull('low_balance_threshold')
                    ->whereColumn('balance', '<=', 'low_balance_threshold')
                    ->count(),
            ],
        ]);
    }
}
