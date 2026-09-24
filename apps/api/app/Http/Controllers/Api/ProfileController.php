<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource(
            $request->user()->load([
                'roles', 'permissions', 'campus', 'institution', 'scopeAssignments.campus',
            ])
        );
    }
}
