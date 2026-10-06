<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FeeReceiptResource;
use App\Models\FeeReceipt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FeeReceiptController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $receipts = FeeReceipt::query()
            ->with(['student', 'allocations.charge.lines.feeHead'])
            ->when($search !== '', fn ($q) => $q->where('receipt_no', 'like', "%{$search}%"))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('payment_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('payment_date', '<=', $request->date('to')))
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeeReceiptResource::collection($receipts);
    }

    public function show(FeeReceipt $feeReceipt): FeeReceiptResource
    {
        return new FeeReceiptResource($feeReceipt->load([
            'student', 'allocations.charge.lines.feeHead', 'allocations.charge.classRoom', 'allocations.charge.section',
        ]));
    }
}
