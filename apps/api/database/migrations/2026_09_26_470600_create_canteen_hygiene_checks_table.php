<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('canteen_hygiene_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->date('check_date');
            $table->string('area', 128);
            $table->string('status', 24)->default('pass');
            $table->unsignedTinyInteger('score')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'check_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('canteen_hygiene_checks');
    }
};
