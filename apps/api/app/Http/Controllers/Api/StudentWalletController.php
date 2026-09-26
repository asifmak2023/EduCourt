<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentWalletResource;
use App\Http\Resources\WalletTransactionResource;
use App\Models\Student;
use App\Models\StudentWallet;
use App\Models\WalletTransaction;
use App\Services\Canteen\CanteenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StudentWalletController extends Controller
{
    public function __construct(private readonly CanteenService $canteen) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $wallets = StudentWallet::query()
            ->with('student')
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), fn ($q) => $q->whereHas('student', fn ($w) => $w
                ->where('first_name', 'like', '%'.$request->string('search').'%')
                ->orWhere('last_name', 'like', '%'.$request->string('search').'%')
                ->orWhere('admission_no', 'like', '%'.$request->string('search').'%')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return StudentWalletResource::collection($wallets);
    }

    public function forStudent(Student $student): JsonResponse
    {
        $wallet = $this->canteen->walletFor($student);

        return response()->json(['data' => new StudentWalletResource($wallet->load('student'))]);
    }

    public function show(StudentWallet $wallet): StudentWalletResource
    {
        return new StudentWalletResource($wallet->load('student'));
    }

    public function topUp(Request $request, StudentWallet $wallet): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['sometimes', Rule::in([PaymentMethod::Cash->value, PaymentMethod::BankTransfer->value])],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $this->canteen->topUp(
            $wallet,
            (float) $data['amount'],
            PaymentMethod::from($data['method'] ?? PaymentMethod::Cash->value),
            $request->user()?->id,
            $data['reference'] ?? null,
        );

        return response()->json(['data' => new StudentWalletResource($result['wallet']->load('student'))]);
    }

    public function adjust(Request $request, StudentWallet $wallet): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'not_in:0'],
            'description' => ['nullable', 'string'],
        ]);

        $transaction = $this->canteen->adjustWallet($wallet, (float) $data['amount'], $request->user()?->id, $data['description'] ?? null);

        return response()->json([
            'data' => [
                'wallet' => new StudentWalletResource($wallet->refresh()->load('student')),
                'transaction' => new WalletTransactionResource($transaction),
            ],
        ]);
    }

    public function transactions(Request $request, StudentWallet $wallet): AnonymousResourceCollection
    {
        $transactions = WalletTransaction::query()
            ->where('student_wallet_id', $wallet->id)
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return WalletTransactionResource::collection($transactions);
    }
}
