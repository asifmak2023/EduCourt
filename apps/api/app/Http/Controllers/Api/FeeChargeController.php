<?php

namespace App\Http\Controllers\Api;

use App\Enums\VoucherStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeChargeResource;
use App\Models\FeeCharge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FeeChargeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $charges = FeeCharge::query()
            ->with(['student', 'classRoom', 'section', 'feeHead', 'lines.feeHead'])
            ->when($search !== '', fn ($q) => $q->where('voucher_no', 'like', "%{$search}%"))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('section_id'), fn ($q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('billing_kind'), fn ($q) => $q->where('billing_kind', $request->string('billing_kind')->toString()))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('due_before'), fn ($q) => $q->whereDate('due_date', '<=', $request->date('due_before')))
            ->orderByDesc('due_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeeChargeResource::collection($charges);
    }

    public function show(FeeCharge $feeCharge): FeeChargeResource
    {
        return new FeeChargeResource($feeCharge->load([
            'student', 'classRoom', 'section', 'feeHead', 'lines.feeHead',
        ]));
    }

    public function void(Request $request, FeeCharge $feeCharge): JsonResponse
    {
        $request->validate([
            'memo' => ['nullable', 'string', 'max:2000'],
        ]);

        if ((float) $feeCharge->paid_amount > 0) {
            return response()->json([
                'message' => 'A charge with recorded payments cannot be voided. Reverse the receipt first.',
            ], 409);
        }

        $feeCharge->update(['status' => VoucherStatus::Void->value]);

        return response()->json(['message' => 'Charge voided.']);
    }
}
