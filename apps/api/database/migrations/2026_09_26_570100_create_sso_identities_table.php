<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Links a local user to an external OIDC subject at a provider.
     */
    public function up(): void
    {
        Schema::create('sso_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sso_provider_id')->constrained('sso_providers')->cascadeOnDelete();
            $table->string('subject');
            $table->string('email')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->unique(['sso_provider_id', 'subject']);
            $table->unique(['user_id', 'sso_provider_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sso_identities');
    }
};
