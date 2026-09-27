<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SsoProviderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'name' => $this->name,
            'provider' => $this->provider,
            'client_id' => $this->client_id,
            'authorize_url' => $this->authorize_url,
            'token_url' => $this->token_url,
            'userinfo_url' => $this->userinfo_url,
            'logout_url' => $this->logout_url,
            'redirect_uri' => $this->redirect_uri,
            'scopes' => $this->scopes,
            'is_active' => (bool) $this->is_active,
            'jit_provisioning' => (bool) $this->jit_provisioning,
            'default_role' => $this->default_role,
            'has_client_secret' => $this->client_secret !== null,
            'created_at' => $this->created_at,
        ];
    }
}
