<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('registration_no', 64);
            $table->string('type', 32)->default('bus');
            $table->unsignedInteger('capacity')->default(0);
            $table->string('model')->nullable();
            $table->foreignId('driver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('driver_name')->nullable();
            $table->string('driver_phone', 32)->nullable();
            $table->string('conductor_name')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'registration_no']);
        });

        Schema::create('transport_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 32);
            $table->string('start_point')->nullable();
            $table->string('end_point')->nullable();
            $table->decimal('distance_km', 8, 2)->default(0);
            $table->decimal('fare', 12, 2)->default(0);
            $table->foreignId('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campus_id', 'code']);
        });

        Schema::create('transport_route_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transport_route_id')->constrained('transport_routes')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('sequence')->default(1);
            $table->time('pickup_time')->nullable();
            $table->time('drop_time')->nullable();
            $table->decimal('fare', 12, 2)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'transport_route_id']);
        });

        Schema::create('transport_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('transport_route_id')->constrained('transport_routes')->cascadeOnDelete();
            $table->foreignId('transport_route_stop_id')->nullable()->constrained('transport_route_stops')->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
            $table->string('direction', 16)->default('both');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('fare', 12, 2)->default(0);
            $table->string('status', 16)->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campus_id', 'student_id']);
            $table->index(['campus_id', 'transport_route_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_allocations');
        Schema::dropIfExists('transport_route_stops');
        Schema::dropIfExists('transport_routes');
        Schema::dropIfExists('vehicles');
    }
};
