<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invigilation_duties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_paper_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('assistant');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['exam_paper_id', 'user_id'], 'invigilation_duties_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invigilation_duties');
    }
};
