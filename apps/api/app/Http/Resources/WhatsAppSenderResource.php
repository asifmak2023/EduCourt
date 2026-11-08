<?php

namespace App\Http\Resources;

use App\Models\WhatsAppSender;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A WhatsApp sender. Secrets are never serialised: access_token is hidden on
 * the model and replaced by a boolean presence flag.
 */
class WhatsAppSenderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var WhatsAppSender $sender */
        $sender = $this->resource;

        return [
            'id' => $sender->id,
            'owner_institution_id' => $sender->owner_institution_id,
            'meta_app_connection_id' => $sender->meta_app_connection_id,
            'managed_by' => $sender->managed_by?->value,
            'label' => $sender->label,
            'connection_mode' => $sender->connection_mode?->value,
            'phone_number_id' => $sender->phone_number_id,
            'business_account_id' => $sender->business_account_id,
            'display_phone_number' => $sender->display_phone_number,
            'token_expiry_mode' => $sender->token_expiry_mode?->value,
            'token_expires_at' => $sender->token_expires_at,
            'default_country_code' => $sender->default_country_code,
            'is_active' => (bool) $sender->is_active,
            'last_verified_at' => $sender->last_verified_at,
            'last_error' => $sender->last_error,
            'has_access_token' => $sender->access_token !== null,
            'is_platform_owned' => $sender->isPlatformOwned(),
            'token_expired' => $sender->tokenExpired(),
            'created_at' => $sender->created_at,
            'updated_at' => $sender->updated_at,
        ];
    }
}
