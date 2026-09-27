<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-institution OIDC identity providers for staff single sign-on.
     */
    public function up(): void
    {
        Schema::create('sso_providers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('provider', 32)->default('oidc');
            $table->string('client_id');
            $table->text('client_secret')->nullable();
            $table->string('authorize_url');
            $table->string('token_url');
            $table->string('userinfo_url');
            $table->string('logout_url')->nullable();
            $table->string('redirect_uri');
            $table->string('scopes')->default('openid email profile');
            $table->boolean('is_active')->default(true);
            $table->boolean('jit_provisioning')->default(false);
            $table->string('default_role')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['institution_id', 'name']);
            $table->index(['institution_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sso_providers');
    }
};
