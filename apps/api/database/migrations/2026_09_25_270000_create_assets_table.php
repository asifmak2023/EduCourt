<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('chart_of_account_id')->nullable()
                ->constrained('chart_of_accounts')->nullOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('serial_no')->nullable();
            $table->string('location')->nullable();
            $table->string('custodian')->nullable();
            $table->date('acquisition_date');
            $table->decimal('acquisition_cost', 15, 2);
            $table->decimal('salvage_value', 15, 2)->default(0);
            $table->unsignedInteger('useful_life_months')->nullable();
            $table->string('depreciation_method')->default('none');
            $table->string('status')->default('active');
            $table->date('disposed_on')->nullable();
            $table->decimal('disposal_proceeds', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'code']);
            $table->index(['campus_id', 'status']);
            $table->index(['campus_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
