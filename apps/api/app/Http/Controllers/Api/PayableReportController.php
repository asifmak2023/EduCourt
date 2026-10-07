<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentVoucherStatus;
use App\Http\Controllers\Controller;
use App\Models\PaymentVoucher;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayableReportController extends Controller
{
    /**
     * Accounts payable dashboard metrics: totals, status counts, per-category
     * and per-month payable/paid breakdowns for the landing charts.
     */
    public function summary(Request $request): JsonResponse
    {
        $asOf = $request->filled('as_of')
            ? CarbonImmutable::parse($request->input('as_of'))
            : CarbonImmutable::today();

        $base = PaymentVoucher::query()->where('status', '!=', PaymentVoucherStatus::Cancelled->value);

        $totals = (clone $base)
            ->selectRaw('SUM(total_amount) as payable, SUM(paid_amount) as paid')
            ->first();

        $payable = (float) ($totals->payable ?? 0);
        $paid = (float) ($totals->paid ?? 0);

        $overdue = (clone $base)
            ->whereIn('status', [PaymentVoucherStatus::Approved->value, PaymentVoucherStatus::Partial->value])
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $asOf->toDateString())
            ->selectRaw('COUNT(*) as vouchers, SUM(total_amount - paid_amount) as amount')
            ->first();

        $counts = (clone $base)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($count) => (int) $count);

        $byCategory = (clone $base)
            ->select(
                'category',
                DB::raw('SUM(total_amount) as payable'),
                DB::raw('SUM(paid_amount) as paid')
            )
            ->groupBy('category')
            ->get()
            ->map(fn ($row) => [
                'category' => $row->category,
                'payable' => $this->money((float) $row->payable),
                'paid' => $this->money((float) $row->paid),
            ]);

        $byMonth = collect(range(5, 0))->map(function (int $monthsBack) use ($asOf) {
            $month = $asOf->subMonths($monthsBack);

            $row = PaymentVoucher::query()
                ->where('status', '!=', PaymentVoucherStatus::Cancelled->value)
                ->whereBetween('payment_date', [$month->startOfMonth()->toDateString(), $month->endOfMonth()->toDateString()])
                ->selectRaw('SUM(total_amount) as payable, SUM(paid_amount) as paid')
                ->first();

            return [
                'month' => $month->format('Y-m'),
                'label' => $month->translatedFormat('M'),
                'payable' => $this->money((float) ($row->payable ?? 0)),
                'paid' => $this->money((float) ($row->paid ?? 0)),
            ];
        })->values();

        return response()->json([
            'as_of' => $asOf->toDateString(),
            'totals' => [
                'payable' => $this->money($payable),
                'paid' => $this->money($paid),
                'outstanding' => $this->money(max($payable - $paid, 0)),
                'overdue' => $this->money((float) ($overdue->amount ?? 0)),
            ],
            'counts' => [
                'overdue' => (int) ($overdue->vouchers ?? 0),
                'pending_approval' => $counts->get(PaymentVoucherStatus::PendingApproval->value, 0),
                'draft' => $counts->get(PaymentVoucherStatus::Draft->value, 0),
            ],
            'vouchers_by_status' => $counts->all(),
            'by_category' => $byCategory,
            'by_month' => $byMonth,
        ]);
    }

    private function money(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }
}
