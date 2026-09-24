<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InstitutionResource;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InstitutionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $institutions = Institution::query()
            ->when($search !== '', fn ($query) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")))
            ->withCount('campuses')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return InstitutionResource::collection($institutions);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:32', 'unique:institutions,code'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $institution = Institution::create($data);

        return (new InstitutionResource($institution->loadCount('campuses')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Institution $institution): InstitutionResource
    {
        return new InstitutionResource($institution->loadCount('campuses'));
    }

    public function update(Request $request, Institution $institution): InstitutionResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:32', 'unique:institutions,code,'.$institution->id],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $institution->update($data);

        return new InstitutionResource($institution->loadCount('campuses'));
    }

    public function destroy(Institution $institution): JsonResponse
    {
        if ($institution->campuses()->exists()) {
            return response()->json([
                'message' => 'Cannot archive an institution that still has campuses.',
            ], 409);
        }

        $institution->delete();

        return response()->json(['message' => 'Institution archived.']);
    }
}
