<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('liabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('chart_of_account_id')->nullable()
                ->constrained('chart_of_accounts')->nullOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('type')->default('other');
            $table->string('lender')->nullable();
            $table->decimal('principal_amount', 15, 2);
            $table->decimal('interest_rate', 6, 3)->nullable();
            $table->date('starts_on')->nullable();
            $table->date('matures_on')->nullable();
            $table->decimal('installment_amount', 15, 2)->nullable();
            $table->decimal('outstanding_amount', 15, 2)->default(0);
            $table->string('status')->default('active');
            $table->date('settled_on')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'code']);
            $table->index(['campus_id', 'status']);
            $table->index(['campus_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('liabilities');
    }
};
