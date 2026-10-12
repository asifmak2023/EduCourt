<?php

namespace App\Http\Controllers\Api;

use App\Enums\CampusType;
use App\Enums\ScopeType;
use App\Http\Controllers\Controller;
use App\Support\RoleCatalog;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

class MetaController extends Controller
{
    public function roles(): JsonResponse
    {
        return response()->json([
            'data' => RoleCatalog::roles(),
            'modules' => RoleCatalog::moduleMeta(),
        ]);
    }

    public function scopes(): JsonResponse
    {
        $scopes = array_map(fn (ScopeType $scope) => [
            'value' => $scope->value,
            'label' => $scope->label(),
        ], ScopeType::cases());

        $campusTypes = array_map(fn (CampusType $type) => [
            'value' => $type->value,
            'label' => $type->label(),
        ], CampusType::cases());

        return response()->json(['data' => ['scope_types' => $scopes, 'campus_types' => $campusTypes]]);
    }

    public function permissions(): JsonResponse
    {
        return response()->json([
            'data' => Permission::query()->orderBy('name')->pluck('name'),
            'modules' => array_keys(config('rbac.modules')),
        ]);
    }
}
