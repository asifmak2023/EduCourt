<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'employee_code' => $this->employee_code,
            'job_title' => $this->job_title,
            'is_active' => $this->is_active,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')->values()),
            'permissions' => $this->whenLoaded('permissions', fn () => $this->getAllPermissions()->pluck('name')->values()),
            'campus' => CampusResource::make($this->whenLoaded('campus')),
            'institution' => InstitutionResource::make($this->whenLoaded('institution')),
            'scope_assignments' => ScopeAssignmentResource::collection($this->whenLoaded('scopeAssignments')),
            'two_factor_enabled' => $this->hasTwoFactorEnabled(),
            'photo_url' => $this->whenLoaded('student', fn () => $this->student?->photo_path
                ? Storage::disk('public')->url($this->student->photo_path)
                : null),
            'last_login_at' => $this->last_login_at,
            'created_at' => $this->created_at,
        ];
    }
}
