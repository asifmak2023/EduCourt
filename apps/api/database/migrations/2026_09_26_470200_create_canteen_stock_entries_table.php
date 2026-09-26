<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('canteen_stock_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('canteen_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('canteen_suppliers')->nullOnDelete();
            $table->string('type', 24)->default('purchase');
            $table->string('reference')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->decimal('total_cost', 14, 2)->default(0);
            $table->decimal('balance_after', 12, 2)->default(0);
            $table->date('entry_date');
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('canteen_stock_entries');
    }
};
