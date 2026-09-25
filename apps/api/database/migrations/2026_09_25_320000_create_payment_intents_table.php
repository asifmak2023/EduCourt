<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_intents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_voucher_id')->nullable()->constrained()->nullOnDelete();
            $table->string('gateway');
            $table->string('reference');
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('PKR');
            $table->string('status')->default('pending');
            $table->string('checkout_url')->nullable();
            $table->json('gateway_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('fee_payment_id')->nullable()->constrained('fee_payments')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'reference']);
            $table->index(['campus_id', 'status'], 'payment_intents_campus_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_intents');
    }
};
