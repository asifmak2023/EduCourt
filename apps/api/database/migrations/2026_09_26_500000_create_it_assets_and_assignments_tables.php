<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('it_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('asset_tag', 64);
            $table->string('category', 48)->default('laptop');
            $table->string('brand', 96)->nullable();
            $table->string('model_no', 96)->nullable();
            $table->string('serial_no', 96)->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('cost', 14, 2)->default(0);
            $table->date('warranty_until')->nullable();
            $table->string('status', 24)->default('available');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->date('assigned_on')->nullable();
            $table->string('location')->nullable();
            $table->string('vendor')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'asset_tag']);
            $table->index(['campus_id', 'status']);
        });

        Schema::create('it_asset_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('it_asset_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_to')->constrained('users')->cascadeOnDelete();
            $table->date('assigned_on');
            $table->date('returned_on')->nullable();
            $table->string('condition', 24)->default('good');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['campus_id', 'assigned_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('it_asset_assignments');
        Schema::dropIfExists('it_assets');
    }
};
