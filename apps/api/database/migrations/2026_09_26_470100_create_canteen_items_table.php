<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('canteen_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 32);
            $table->string('category', 64)->nullable();
            $table->string('unit', 24)->default('piece');
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->boolean('track_stock')->default(true);
            $table->decimal('stock_quantity', 12, 2)->default(0);
            $table->decimal('reorder_level', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('canteen_items');
    }
};
