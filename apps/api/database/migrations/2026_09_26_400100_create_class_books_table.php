<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('author')->nullable();
            $table->string('publisher')->nullable();
            $table->string('isbn', 32)->nullable();
            $table->string('edition')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->boolean('is_required')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['class_room_id', 'academic_year_id'], 'class_books_scope_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_books');
    }
};
